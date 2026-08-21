"use client";

/* Admin: upload 4 stage images → Pinata, embed CIDs in 0..3.json, setBaseURI.
   Requires designer login + the Acolyte DEFAULT_ADMIN_ROLE wallet. */

import { useMemo, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAcolyteBaseURI,
  useSetAcolyteBaseURI,
} from "@/lib/hooks";
import { CONTRACTS, REAL_WALLET } from "@/lib/config";
import { acolyteName, type Stage } from "@/lib/constants";
import { type OnChainStageIndex } from "@/lib/nft/metadata";

type StageArtPin = {
  index: number;
  cid: string;
  uri: string;
  gateway: string;
  filename: string;
};

type PinResult = {
  ok: boolean;
  error?: string;
  missing?: string[];
  suggestedBaseURI?: string;
  directory?: { cid: string; gateway: string };
  art?: Record<string, StageArtPin>;
  stages?: Record<
    string,
    {
      path: string;
      uri: string;
      gateway: string;
      imageGateway?: string;
      metadata: { name: string; image: string };
    }
  >;
  note?: string;
};

type StageFile = {
  index: OnChainStageIndex;
  stage: Stage;
  file: File | null;
  preview: string | null;
};

const STAGE_SLOTS: { index: OnChainStageIndex; stage: Stage }[] = [
  { index: 0, stage: 1 },
  { index: 1, stage: 2 },
  { index: 2, stage: 3 },
  { index: 3, stage: 4 },
];

function NftMetadataAdminPageRealWallet() {
  const [slots, setSlots] = useState<StageFile[]>(
    STAGE_SLOTS.map(({ index, stage }) => ({
      index,
      stage,
      file: null,
      preview: null,
    }))
  );
  const [pinning, setPinning] = useState(false);
  const [pin, setPin] = useState<PinResult | null>(null);
  const [manualUri, setManualUri] = useState("");
  const { data: onChainBaseURI, isLoading: uriLoading } = useAcolyteBaseURI();
  const setBase = useSetAcolyteBaseURI();

  const allReady = useMemo(
    () => slots.every((s) => s.file !== null),
    [slots]
  );

  const uriToSet = manualUri.trim() || pin?.suggestedBaseURI || "";

  function setStageFile(index: OnChainStageIndex, file: File | null) {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.index !== index) return s;
        if (s.preview) URL.revokeObjectURL(s.preview);
        return {
          ...s,
          file,
          preview: file ? URL.createObjectURL(file) : null,
        };
      })
    );
  }

  async function pinMetadata() {
    if (!allReady) {
      setPin({
        ok: false,
        error: "Choose all four stage images (Ember, Flame, Forge, Pyre) first.",
      });
      return;
    }

    setPinning(true);
    setPin(null);
    try {
      const form = new FormData();
      for (const s of slots) {
        form.append(`image-${s.index}`, s.file!);
      }

      const res = await fetch("/api/nft/metadata", {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as PinResult;
      setPin(json);
      if (json.suggestedBaseURI) setManualUri(json.suggestedBaseURI);
    } catch (e) {
      setPin({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setPinning(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg text-text-1 p-8 max-w-2xl mx-auto space-y-8">
      <header className="space-y-2">
        <p className="text-text-3 text-xs tracking-widest uppercase">Admin</p>
        <h1 className="text-2xl font-semibold">Acolyte NFT metadata</h1>
        <p className="text-text-2 text-sm leading-relaxed">
          Upload four stage images. Each is pinned to IPFS and written into that
          stage&apos;s JSON (<code className="text-text-1">0.json</code>…
          <code className="text-text-1">3.json</code>), then call{" "}
          <code className="text-text-1">setBaseURI</code>.
        </p>
        <p className="text-text-3 text-xs break-all">
          NFT: {CONTRACTS.nft ?? "(not configured)"}
        </p>
      </header>

      <section className="space-y-3 border border-surface-3 rounded-lg p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-sm font-medium">Wallet (must be contract admin)</h2>
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
        </div>
        <p className="text-text-3 text-xs">
          On-chain baseURI:{" "}
          {uriLoading ? (
            "…"
          ) : onChainBaseURI ? (
            <span className="text-text-1 break-all">{onChainBaseURI}</span>
          ) : (
            <span className="text-text-2">(empty)</span>
          )}
        </p>
      </section>

      <section className="space-y-4 border border-surface-3 rounded-lg p-4">
        <h2 className="text-sm font-medium">1. Stage images</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {slots.map((s) => (
            <label
              key={s.index}
              className="flex flex-col gap-2 rounded border border-surface-3 bg-surface/40 p-3 cursor-pointer"
            >
              <span className="text-xs text-text-3">
                {acolyteName(s.stage)} →{" "}
                <code className="text-text-1">{s.index}.json</code>
              </span>
              {s.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.preview}
                  alt={acolyteName(s.stage)}
                  className="h-32 w-full object-cover rounded"
                />
              ) : (
                <div className="h-32 rounded bg-surface-2 flex items-center justify-center text-text-3 text-xs">
                  Choose image
                </div>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="text-xs text-text-2 file:mr-2 file:rounded file:border-0 file:bg-surface-3 file:px-2 file:py-1 file:text-text-1"
                onChange={(e) =>
                  setStageFile(s.index, e.target.files?.[0] ?? null)
                }
              />
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={pinMetadata}
          disabled={pinning || !allReady}
          className="px-4 py-2 rounded bg-brand text-bg text-sm font-medium disabled:opacity-50"
        >
          {pinning ? "Pinning images + metadata…" : "Pin 4 images + stage metadata"}
        </button>

        {pin && (
          <div className="text-xs space-y-2 text-text-2">
            {!pin.ok && (
              <p className="text-danger">{pin.error ?? "Pin failed"}</p>
            )}
            {pin.ok && pin.suggestedBaseURI && (
              <>
                <p>
                  Suggested baseURI:{" "}
                  <code className="text-text-1 break-all">
                    {pin.suggestedBaseURI}
                  </code>
                </p>
                {pin.art && (
                  <ul className="space-y-1">
                    {Object.entries(pin.art).map(([k, a]) => (
                      <li key={k}>
                        Stage {a.index} image:{" "}
                        <a
                          className="underline text-brand break-all"
                          href={a.gateway}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {a.gateway}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {pin.stages && (
                  <ul className="list-disc pl-4 space-y-1">
                    {Object.entries(pin.stages).map(([k, s]) => (
                      <li key={k}>
                        {s.metadata.name} →{" "}
                        <a
                          className="underline"
                          href={s.gateway}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {s.path}
                        </a>
                        {s.imageGateway && (
                          <>
                            {" "}
                            ·{" "}
                            <a
                              className="underline text-brand"
                              href={s.imageGateway}
                              target="_blank"
                              rel="noreferrer"
                            >
                              image
                            </a>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3 border border-surface-3 rounded-lg p-4">
        <h2 className="text-sm font-medium">2. setBaseURI on-chain</h2>
        <label className="block text-xs text-text-3 space-y-1">
          <span>baseURI</span>
          <input
            value={manualUri}
            onChange={(e) => setManualUri(e.target.value)}
            placeholder="ipfs://bafy…/"
            className="w-full rounded border border-surface-3 bg-surface px-3 py-2 text-sm text-text-1"
          />
        </label>
        <button
          type="button"
          disabled={!uriToSet || setBase.isPending}
          onClick={() => setBase.mutate(uriToSet)}
          className="px-4 py-2 rounded bg-brand text-bg text-sm font-medium disabled:opacity-50"
        >
          {setBase.isPending ? "Confirm in wallet…" : "Call setBaseURI"}
        </button>
        {setBase.isSuccess && (
          <p className="text-xs text-text-2 break-all">
            Tx: {setBase.data?.hash}
          </p>
        )}
        {setBase.isError && (
          <p className="text-xs text-danger">
            {setBase.error instanceof Error
              ? setBase.error.message
              : "setBaseURI failed"}
          </p>
        )}
      </section>
    </main>
  );
}

export default function NftMetadataAdminPage() {
  if (!REAL_WALLET) {
    return (
      <main className="min-h-screen bg-bg text-text-1 p-8 max-w-2xl mx-auto space-y-4">
        <p className="text-text-3 text-xs tracking-widest uppercase">Admin</p>
        <h1 className="text-2xl font-semibold">Acolyte NFT metadata</h1>
        <p className="text-text-2 text-sm leading-relaxed">
          This page requires the real wallet stack. Set{" "}
          <code className="text-text-1">NEXT_PUBLIC_REAL_WALLET=true</code> or{" "}
          <code className="text-text-1">NEXT_PUBLIC_USE_MOCK=false</code> to enable
          wallet-backed admin actions.
        </p>
      </main>
    );
  }

  return <NftMetadataAdminPageRealWallet />;
}
