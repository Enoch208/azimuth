import type { Vault } from "@/lib/types";

export interface VaultSource {
  listActiveVaults(): Promise<Vault[]>;
}
