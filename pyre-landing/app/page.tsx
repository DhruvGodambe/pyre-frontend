/* The whole site is one scene: the Acolyte stands before you, the wordmark
   burns behind him, and there are exactly two doors: the app and the Codex.
   (Structure inspired by the single-viewport character heroes of the genre;
   everything else about the page is Pyre's own.) */

const APP_URL = "https://app.pyreprotocol.com";
/* TEMPORARY absolute URL: flip back to "/codex" once pyre-app deploys with its
   assetPrefix (that deploy is held while keeper-box work is in flight there).
   The /codex rewrite is already live here, only the app's chunks are missing. */
const DOCS_URL = "https://app.pyreprotocol.com/codex";
const X_URL = "https://x.com/pyre_protocol";
const TELEGRAM_URL = "https://t.me/pyreprotocol";

/* Ember motes: hand-placed variety, CSS does the drifting. */
const EMBERS: Array<React.CSSProperties & Record<string, string>> = [
  { "--x": "8%", "--s": "3px", "--t": "11s", "--d": "0s", "--o": "0.5", "--drift": "26px" },
  { "--x": "16%", "--s": "2px", "--t": "14s", "--d": "3.2s", "--o": "0.4", "--drift": "-18px" },
  { "--x": "24%", "--s": "4px", "--t": "9s", "--d": "1.4s", "--o": "0.6", "--drift": "30px" },
  { "--x": "33%", "--s": "2px", "--t": "13s", "--d": "5.1s", "--o": "0.35", "--drift": "-24px" },
  { "--x": "42%", "--s": "3px", "--t": "10s", "--d": "2.3s", "--o": "0.55", "--drift": "16px" },
  { "--x": "51%", "--s": "2px", "--t": "15s", "--d": "6.8s", "--o": "0.4", "--drift": "-30px" },
  { "--x": "58%", "--s": "4px", "--t": "8.5s", "--d": "0.8s", "--o": "0.65", "--drift": "22px" },
  { "--x": "66%", "--s": "2px", "--t": "12s", "--d": "4.4s", "--o": "0.4", "--drift": "-14px" },
  { "--x": "74%", "--s": "3px", "--t": "10.5s", "--d": "2.9s", "--o": "0.55", "--drift": "28px" },
  { "--x": "82%", "--s": "2px", "--t": "13.5s", "--d": "7.6s", "--o": "0.35", "--drift": "-22px" },
  { "--x": "90%", "--s": "3px", "--t": "9.5s", "--d": "1.9s", "--o": "0.5", "--drift": "18px" },
  { "--x": "96%", "--s": "2px", "--t": "14.5s", "--d": "5.7s", "--o": "0.4", "--drift": "-26px" },
];

export default function Landing() {
  return (
    <main className="relative h-dvh overflow-hidden">
      <h1 className="sr-only">Pyre Protocol</h1>

      {/* The scene. The wordmark is part of the art; the hood covers the Y. */}
      <img
        src="/hero.webp"
        alt="The Acolyte of Pyre, hand outstretched, before the burning word PYRE"
        className="animate-hero absolute inset-0 h-full w-full object-cover object-top select-none"
        draggable={false}
      />

      {/* Edge vignette: melts the art into the page at every border. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 42%, transparent 55%, rgba(6,4,3,0.85) 100%)",
        }}
        aria-hidden
      />
      {/* Bottom scrim for the chrome. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[38vh] pointer-events-none bg-gradient-to-t from-bg via-bg/55 to-transparent"
        aria-hidden
      />

      {/* Embers drift through the whole scene. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {EMBERS.map((style, i) => (
          <span key={i} className="ember" style={style} />
        ))}
      </div>

      {/* The words and the two doors. */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-7 px-6 pb-[7vh] text-center">
        <p
          className="animate-rise text-text-2 text-[11px] sm:text-xs tracking-[0.42em] uppercase"
          style={{ "--d": "600ms" } as React.CSSProperties}
        >
          Stake to survive. Burn to transcend.
        </p>

        <div
          className="animate-rise flex flex-col sm:flex-row items-center gap-3 sm:gap-5"
          style={{ "--d": "850ms" } as React.CSSProperties}
        >
          <a href={APP_URL} className="imgbtn" aria-label="Launch app">
            <img src="/buttons/launch_normal.png" alt="" />
            <img src="/buttons/launch_hover.png" alt="" className="hov" aria-hidden />
          </a>
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="imgbtn"
            aria-label="Read the Codex"
          >
            <img src="/buttons/codex_normal.png" alt="" />
            <img src="/buttons/codex_hover.png" alt="" className="hov" aria-hidden />
          </a>
        </div>
      </div>

      {/* Corners: whisper-quiet. */}
      <footer className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between px-5 pb-4 text-[10px] tracking-[0.18em] uppercase text-text-3/70">
        <span className="animate-rise" style={{ "--d": "1400ms" } as React.CSSProperties}>
          Pyre Protocol
        </span>
        <nav
          className="animate-rise flex items-center gap-4"
          style={{ "--d": "1400ms" } as React.CSSProperties}
        >
          <a href={X_URL} className="hover:text-brand transition-colors" target="_blank" rel="noopener noreferrer">
            X
          </a>
          <a href={TELEGRAM_URL} className="hover:text-brand transition-colors" target="_blank" rel="noopener noreferrer">
            Telegram
          </a>
        </nav>
      </footer>
    </main>
  );
}
