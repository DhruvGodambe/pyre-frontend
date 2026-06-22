/* Selects the active data source from the config switch (lib/config.ts). */
import { USE_MOCK } from "../config";
import type { DataSource } from "./types";
import type { Persona } from "./mock";
import { MockDataSource } from "./mock";
import { ChainDataSource } from "./chain";

let instance: DataSource | null = null;

export function getDataSource(): DataSource {
  if (!instance) {
    instance = USE_MOCK ? new MockDataSource() : new ChainDataSource();
  }
  return instance;
}

/** Switch the previewed user state (mock only). No-op against real chain data. */
export function setMockPersona(persona: Persona) {
  const inst = getDataSource();
  if (inst instanceof MockDataSource) inst.setPersona(persona);
}

export type { DataSource, TxResult, MarketFilter, MarketSort, SwapParams } from "./types";
export type { Persona } from "./mock";
