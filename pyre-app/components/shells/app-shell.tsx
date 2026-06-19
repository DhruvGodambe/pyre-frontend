"use client";

/* Picks the shell by viewport: Village on desktop, Dashboard on mobile.
   Same panels render in both — this only chooses the frame.
   The Design Preview switcher floats over both (mock mode only). */

import { useEffect } from "react";
import { useIsDesktop } from "@/components/ui/use-media";
import { MobileShell } from "./mobile-shell";
import { VillageShell } from "./village-shell";
import { PreviewSwitcher } from "@/components/preview-switcher";
import { DesignerIntro } from "@/components/designer-intro";
import { EmberkeeperIntro } from "@/components/emberkeeper-intro";
import { PyreIntro } from "@/components/pyre-intro";
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
      {isDesktop ? <VillageShell /> : <MobileShell />}
      <PreviewSwitcher />
      {/* The cinematic brand film — plays first on arrival, over everything,
          with a Skip. When it ends/skips, the Emberkeeper onboarding takes over. */}
      <PyreIntro />
      {/* The real, user-facing first-time onboarding (shows in every mode). */}
      <EmberkeeperIntro />
      {/* The mock-only design-preview aid (different audience: the designer). */}
      <DesignerIntro />
    </>
  );
}
