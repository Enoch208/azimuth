import { hexToString, stringToHex, type Address } from "viem";
import { CALLSIGNS_ABI } from "@/lib/chain/callsigns-abi";
import { CALLSIGNS_ADDRESS, publicClient } from "@/lib/chain/config";

export const CALLSIGN_PATTERN = /^[a-z0-9_-]{3,16}$/;

export function encodeCallsign(name: string): `0x${string}` {
  return stringToHex(name, { size: 32 });
}

export function decodeCallsign(raw: `0x${string}`): string | null {
  const decoded = hexToString(raw, { size: 32 }).replace(/\0+$/, "").trim();
  return decoded.length > 0 ? decoded : null;
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export async function loadCallsigns(hunters: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(hunters.map((hunter) => hunter.toLowerCase()))];
  const named = new Map<string, string>();
  if (unique.length === 0) return named;

  const raw = await publicClient.readContract({
    address: CALLSIGNS_ADDRESS,
    abi: CALLSIGNS_ABI,
    functionName: "callsignsOf",
    args: [unique as Address[]],
  });

  unique.forEach((hunter, index) => {
    const name = decodeCallsign(raw[index]);
    if (name) named.set(hunter, name);
  });

  return named;
}

export async function loadCallsign(hunter: string): Promise<string | null> {
  const raw = await publicClient.readContract({
    address: CALLSIGNS_ADDRESS,
    abi: CALLSIGNS_ABI,
    functionName: "callsignOf",
    args: [hunter as Address],
  });
  return decodeCallsign(raw);
}

export async function isCallsignAvailable(name: string, hunter: string): Promise<boolean> {
  const holder = await publicClient.readContract({
    address: CALLSIGNS_ADDRESS,
    abi: CALLSIGNS_ABI,
    functionName: "holderOf",
    args: [encodeCallsign(name)],
  });
  return holder === "0x0000000000000000000000000000000000000000" ||
    holder.toLowerCase() === hunter.toLowerCase();
}
