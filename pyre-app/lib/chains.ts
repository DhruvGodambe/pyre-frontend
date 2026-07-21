import { defineChain } from "viem";
import { mainnet, sepolia } from "wagmi/chains";

export const robinhoodChainId = 4663;

/** Robinhood Chain mainnet (Arbitrum Orbit L2, native gas = ETH). */
export const robinhood = defineChain({
  id: robinhoodChainId,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_ROBINHOOD ?? "https://rpc.mainnet.chain.robinhood.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
});

export const SUPPORTED_CHAINS = [robinhood, sepolia, mainnet] as const;

export function chainById(id: number) {
  if (id === robinhoodChainId) return robinhood;
  if (id === sepolia.id) return sepolia;
  if (id === mainnet.id) return mainnet;
  return robinhood;
}

export function chainLabel(id: number): string {
  if (id === robinhoodChainId) return "Robinhood Chain";
  if (id === sepolia.id) return "Sepolia";
  if (id === mainnet.id) return "Ethereum";
  return `Chain ${id}`;
}

/** Target chain first so RainbowKit/wagmi default to the app's network. */
export function chainsWithTargetFirst(targetId: number) {
  const target = chainById(targetId);
  const rest = SUPPORTED_CHAINS.filter((c) => c.id !== target.id);
  return [target, ...rest];
}
