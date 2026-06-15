"use client";

import { useWallet } from "@/lib/wallet";
import { Button } from "@/components/ui/primitives";
import { shortAddress } from "@/lib/format";

/* connectedOnly: render the account chip when connected, but nothing when
   disconnected — used in the Village header, where the Gate is the connect
   prompt so a second "Connect Wallet" button would be redundant. */
export function ConnectButton({ connectedOnly = false }: { connectedOnly?: boolean }) {
  const { status, address, connect, disconnect } = useWallet();
  if (status === "connected" && address) {
    return (
      <Button variant="ghost" onClick={disconnect}>
        {shortAddress(address)}
      </Button>
    );
  }
  if (connectedOnly) return null;
  return (
    <Button onClick={connect} disabled={status === "connecting"}>
      {status === "connecting" ? "Waking the village…" : "Connect Wallet"}
    </Button>
  );
}
