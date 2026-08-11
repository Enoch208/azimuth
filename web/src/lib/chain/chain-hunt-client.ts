import { parseEventLogs, toHex, type Account, type Address, type Chain, type Hex, type Transport, type WalletClient } from "viem";
import { AZIMUTH_ABI } from "@/lib/chain/azimuth-abi";
import { AZIMUTH_ADDRESS, publicClient } from "@/lib/chain/config";
import { getEventsChunked, roundStartBlock } from "@/lib/chain/logs";
import { allAttested, rememberAttested } from "@/lib/chain/attestation-cache";
import { getLightning } from "@/lib/chain/inco";
import type { BearingRecord, HuntClient, HuntSnapshot, ProbeRecord } from "@/lib/hunt-client";
import type { Bearing, Coordinate, ProbeOutcome, Vault } from "@/lib/types";

const BEARING_BY_CODE: Bearing[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "AT_TARGET"];

function bearingFromCode(code: number): Bearing {
  return BEARING_BY_CODE[code] ?? "AT_TARGET";
}

const PROBE_COST = 2;
const BEARING_COST = 20;

type Wallet = WalletClient<Transport, Chain, Account>;

export type HuntPhase = "idle" | "signing" | "confirming" | "attesting" | "settling";

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "bigint") return value !== BigInt(0);
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value !== "" && value !== "0" && value !== "false";
  if (value instanceof Uint8Array) return value.some((byte) => byte !== 0);
  throw new Error(`Cannot read attested boolean from ${typeof value}`);
}

function toNumber(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value instanceof Uint8Array) return value.reduce((acc, byte) => acc * 256 + byte, 0);
  throw new Error(`Cannot read attested number from ${typeof value}`);
}

export class ChainHuntClient implements HuntClient {
  readonly settlementLabel = "Live on Base Sepolia";
  readonly onchain = true;

  private probes: ProbeRecord[] = [];
  private bearings: BearingRecord[] = [];
  private probesUsed = 0;
  private bearingsUsed = 0;
  private credits = 0;
  private found = false;
  private settled = false;
  private revealed: Coordinate | null = null;

  constructor(
    private readonly vault: Vault,
    private readonly wallet: Wallet,
    private readonly hunter: Address,
    private readonly onPhase: (phase: HuntPhase) => void = () => {},
  ) {}

  snapshot(): HuntSnapshot {
    return {
      probes: [...this.probes],
      bearings: [...this.bearings],
      probesLeft: Math.max(0, this.vault.maxProbesPerHunter - this.probesUsed),
      bearingsLeft: Math.max(0, this.vault.maxScansPerHunter - this.bearingsUsed),
      credits: this.credits,
      found: this.found,
      settled: this.settled,
      revealed: this.revealed,
    };
  }

  async load(): Promise<HuntSnapshot> {
    const [state, credits] = await Promise.all([
      publicClient.readContract({
        address: AZIMUTH_ADDRESS,
        abi: AZIMUTH_ABI,
        functionName: "hunterState",
        args: [BigInt(this.vault.id), this.hunter],
      }),
      publicClient.readContract({
        address: AZIMUTH_ADDRESS,
        abi: AZIMUTH_ABI,
        functionName: "credits",
        args: [this.hunter],
      }),
    ]);

    this.probesUsed = state[0];
    this.bearingsUsed = state[1];
    this.credits = Number(credits);

    await this.loadHistory();
    return this.snapshot();
  }

  private async loadHistory(): Promise<void> {
    const fromBlock = await roundStartBlock(this.vault.createdAt);
    const [probeLogs, bearingLogs] = await Promise.all([
      getEventsChunked(AZIMUTH_ABI, "Probed", { vaultId: BigInt(this.vault.id), hunter: this.hunter }, fromBlock),
      getEventsChunked(AZIMUTH_ABI, "BearingPurchased", { vaultId: BigInt(this.vault.id), hunter: this.hunter }, fromBlock),
    ]);

    const round = this.vault.round;
    const probeRows = probeLogs.filter((log) => Number((log.args as { round?: number }).round) === round);
    const bearingRows = bearingLogs.filter((log) => Number((log.args as { round?: number }).round) === round);

    if (probeRows.length > 0) {
      const lightning = await getLightning();
      const rows = probeRows.map((log) => log.args as unknown as ProbedArgs);
      const handles = rows.flatMap((row) => [row.closerHandle, row.hitHandle]);
      let values = allAttested(handles);
      if (!values) {
        const attestations = await lightning.attestedReveal(handles);
        values = attestations.map((attestation) => toBoolean(attestation.plaintext.value));
        handles.forEach((handle, index) => rememberAttested(handle, values![index]));
      }

      this.probes = rows.map((row, index) => {
        const closer = values[index * 2];
        const hit = values[index * 2 + 1];
        return {
          cell: { x: row.x, y: row.y },
          outcome: (hit ? "found" : closer ? "warmer" : "colder") as ProbeOutcome,
          at: Number(probeRows[index].blockNumber) * 1000,
        };
      });
      this.found = this.probes.some((record) => record.outcome === "found");
      if (this.found) {
        const view = await publicClient.readContract({
          address: AZIMUTH_ADDRESS,
          abi: AZIMUTH_ABI,
          functionName: "vaultInfo",
          args: [BigInt(this.vault.id)],
        });
        this.settled = view.finder.toLowerCase() === this.hunter.toLowerCase();
      }
    }

    if (bearingRows.length > 0) {
      const lightning = await getLightning();
      const rows = bearingRows.map((log) => log.args as unknown as BearingArgs);
      const results = await lightning.attestedDecrypt(
        this.wallet,
        rows.map((row) => row.bearingHandle),
      );
      this.bearings = rows.map((row, index) => ({
        origin: { x: row.x, y: row.y },
        bearing: bearingFromCode(toNumber(results[index].plaintext.value)),
        at: Number(bearingRows[index].blockNumber) * 1000,
      }));
    }
  }

  private async ensureCredits(cost: number): Promise<void> {
    if (this.credits >= cost) return;

    const claimed = await publicClient.readContract({
      address: AZIMUTH_ADDRESS,
      abi: AZIMUTH_ABI,
      functionName: "claimedStarter",
      args: [this.hunter],
    });
    if (claimed) throw new Error("Not enough AZ credits left for this action");

    const hash = await this.wallet.writeContract({
      address: AZIMUTH_ADDRESS,
      abi: AZIMUTH_ABI,
      functionName: "claimStarterCredits",
      chain: this.wallet.chain,
      account: this.wallet.account,
    });
    await publicClient.waitForTransactionReceipt({ hash });

    const credits = await publicClient.readContract({
      address: AZIMUTH_ADDRESS,
      abi: AZIMUTH_ABI,
      functionName: "credits",
      args: [this.hunter],
    });
    this.credits = Number(credits);
  }

  async probe(cell: Coordinate): Promise<HuntSnapshot> {
    await this.ensureCredits(PROBE_COST);
    this.onPhase("signing");

    const hash = await this.wallet.writeContract({
      address: AZIMUTH_ADDRESS,
      abi: AZIMUTH_ABI,
      functionName: "probe",
      args: [BigInt(this.vault.id), cell.x, cell.y],
      chain: this.wallet.chain,
      account: this.wallet.account,
    });
    this.onPhase("confirming");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const events = parseEventLogs({ abi: AZIMUTH_ABI, eventName: "Probed", logs: receipt.logs });
    const args = events[0].args as unknown as ProbedArgs;

    this.onPhase("attesting");
    const lightning = await getLightning();
    const [closerAttestation, hitAttestation] = await lightning.attestedReveal([
      args.closerHandle,
      args.hitHandle,
    ]);
    const hit = toBoolean(hitAttestation.plaintext.value);
    const closer = toBoolean(closerAttestation.plaintext.value);
    const outcome: ProbeOutcome = hit ? "found" : closer ? "warmer" : "colder";

    this.probes.push({ cell, outcome, at: Date.now() });
    this.probesUsed += 1;
    this.credits -= PROBE_COST;

    if (hit) {
      this.found = true;
      try {
        return await this.settle();
      } catch {
        return this.snapshot();
      }
    }

    return this.snapshot();
  }

  private async readRevealedCoordinates(
    xHandle: Hex,
    yHandle: Hex,
  ): Promise<Coordinate | null> {
    const lightning = await getLightning();
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const points = await lightning.attestedReveal([xHandle, yHandle]);
        return {
          x: toNumber(points[0].plaintext.value),
          y: toNumber(points[1].plaintext.value),
        };
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
    return null;
  }

  async settle(): Promise<HuntSnapshot> {
    if (!this.found || this.settled) return this.snapshot();
    this.onPhase("settling");

    const state = await publicClient.readContract({
      address: AZIMUTH_ADDRESS,
      abi: AZIMUTH_ABI,
      functionName: "hunterState",
      args: [BigInt(this.vault.id), this.hunter],
    });

    const lightning = await getLightning();
    const [proof] = await lightning.attestedReveal([state[4]]);
    const signatures = proof.covalidatorSignatures.map((signature) => toHex(signature));

    const hash = await this.wallet.writeContract({
      address: AZIMUTH_ADDRESS,
      abi: AZIMUTH_ABI,
      functionName: "settle",
      args: [BigInt(this.vault.id), signatures],
      chain: this.wallet.chain,
      account: this.wallet.account,
    });
    await publicClient.waitForTransactionReceipt({ hash });

    const [xHandle, yHandle] = await publicClient.readContract({
      address: AZIMUTH_ADDRESS,
      abi: AZIMUTH_ABI,
      functionName: "revealedCoordinates",
      args: [BigInt(this.vault.id)],
    });
    this.revealed = await this.readRevealedCoordinates(xHandle, yHandle);
    this.credits += this.vault.bounty;
    this.settled = true;

    return this.snapshot();
  }

  async buyBearing(origin: Coordinate): Promise<HuntSnapshot> {
    await this.ensureCredits(BEARING_COST);
    this.onPhase("signing");

    const hash = await this.wallet.writeContract({
      address: AZIMUTH_ADDRESS,
      abi: AZIMUTH_ABI,
      functionName: "buyBearing",
      args: [BigInt(this.vault.id), origin.x, origin.y],
      chain: this.wallet.chain,
      account: this.wallet.account,
    });
    this.onPhase("confirming");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const events = parseEventLogs({
      abi: AZIMUTH_ABI,
      eventName: "BearingPurchased",
      logs: receipt.logs,
    });
    const args = events[0].args as unknown as BearingArgs;

    this.onPhase("attesting");
    const lightning = await getLightning();
    const [attestation] = await lightning.attestedDecrypt(this.wallet, [args.bearingHandle]);

    this.bearings.push({
      origin,
      bearing: bearingFromCode(toNumber(attestation.plaintext.value)),
      at: Date.now(),
    });
    this.bearingsUsed += 1;
    this.credits -= BEARING_COST;

    return this.snapshot();
  }
}

interface ProbedArgs {
  x: number;
  y: number;
  closerHandle: Hex;
  hitHandle: Hex;
}

interface BearingArgs {
  x: number;
  y: number;
  bearingHandle: Hex;
}
