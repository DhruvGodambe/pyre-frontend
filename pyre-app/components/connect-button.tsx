"use client";

import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import { useWallet } from "@/lib/wallet";
import { Button } from "@/components/ui/primitives";
import { shortAddress } from "@/lib/format";
import { REAL_WALLET, TARGET_CHAIN_NAME } from "@/lib/config";
import { useTargetChain } from "@/lib/target-chain";

/* connectedOnly: render the account chip when connected, but nothing when
   disconnected — used in the Village header, where the Gate is the connect
   prompt so a second "Connect Wallet" button would be redundant. */

function MockConnectButton({ connectedOnly = false }: { connectedOnly?: boolean }) {
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
      {status === "connecting" ? "Connecting…" : "Connect Wallet"}
    </Button>
  );
}

function RealConnectButton({ connectedOnly = false }: { connectedOnly?: boolean }) {
  const { wrongNetwork, switchToTarget, isSwitching, targetChainName } = useTargetChain();

  return (
    <RainbowConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!ready) {
          return (
            <div
              aria-hidden
              style={{ opacity: 0, pointerEvents: "none", userSelect: "none" }}
            >
              <Button disabled>Connect Wallet</Button>
            </div>
          );
        }

        if (!connected) {
          if (connectedOnly) return null;
          return <Button onClick={openConnectModal}>Connect Wallet</Button>;
        }

        if (chain.unsupported || wrongNetwork) {
          return (
            <Button onClick={switchToTarget} disabled={isSwitching}>
              {isSwitching ? "Switching…" : `Switch to ${targetChainName ?? TARGET_CHAIN_NAME}`}
            </Button>
          );
        }

        return (
          <Button variant="ghost" onClick={openAccountModal}>
            {shortAddress(account.address)}
          </Button>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}

export function ConnectButton({ connectedOnly = false }: { connectedOnly?: boolean }) {
  if (!REAL_WALLET) return <MockConnectButton connectedOnly={connectedOnly} />;

  return <RealConnectButton connectedOnly={connectedOnly} />;
}
