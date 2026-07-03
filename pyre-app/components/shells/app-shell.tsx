"use client";

/* Picks the shell by viewport: Village on desktop, Dashboard on mobile.
   Same panels render in both, this only chooses the frame.
   The Design Preview switcher floats over both (mock mode only). */

import { useEffect } from "react";
import { useIsDesktop } from "@/components/ui/use-media";
import { MobileShell } from "./mobile-shell";
import { VillageShell } from "./village-shell";
import { PreviewSwitcher } from "@/components/preview-switcher";
import { EmberkeeperIntro } from "@/components/emberkeeper-intro";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CodexReader } from "@/components/codex";
import { captureReferral } from "@/lib/quests/client";

export function AppShell() {
  const isDesktop = useIsDesktop();

  // A friend arriving via someone's ?ref=CODE link → record the referral once,
  // then strip the param so a refresh doesn't re-post it.
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("ref");
    if (!code) return;
    captureReferral(code);
    url.searchParams.delete("ref");
    window.history.replaceState({}, "", url.toString());
  }, []);

  return (
    <>
      {/* Last-resort net: if a shell throws, show a reload card instead of a
          blank page (matters most on degraded devices, full disk, failed media). */}
      <ErrorBoundary>{isDesktop ? <VillageShell /> : <MobileShell />}</ErrorBoundary>
      <PreviewSwitcher />
      {/* The cinematic brand film now plays on the PUBLIC front door ("/"), not
          here, so stepping through the gate into the kingdom doesn't replay it. */}
      {/* First-time onboarding. Desktop arrives at the Gate landing (in the
          VillageShell), which delivers the lore + entry; this modal is the
          mobile take (no village to land in there). */}
      {!isDesktop && <EmberkeeperIntro />}
      {/* The Ember Codex reader: a single global overlay, opened from anywhere
          (the persistent Codex button in each shell, "Read the rite" inside a
          building, or the gate/intro docs links). */}
      <CodexReader />
    </>
  );
}
