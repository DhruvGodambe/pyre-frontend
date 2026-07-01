export const dynamic = 'force-dynamic';

// The written brief was retired (2026-07): the designer now works directly in the
// app, which is self-documenting. This project is kept as the /app proxy host; the
// root is just a clean, self-contained pointer into the app (it deliberately does
// NOT reuse the old briefing's two-column CSS).
export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem',
        gap: '1.5rem',
      }}
    >
      <p
        style={{
          letterSpacing: '0.32em',
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          opacity: 0.55,
          margin: 0,
        }}
      >
        PYRE · Design workspace
      </p>
      <h1
        style={{
          fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
          fontWeight: 600,
          lineHeight: 1.08,
          margin: 0,
        }}
      >
        It all lives in <em style={{ color: '#ff7a1a', fontStyle: 'italic' }}>the app.</em>
      </h1>
      <p
        style={{
          maxWidth: '34rem',
          opacity: 0.7,
          lineHeight: 1.65,
          fontSize: '1.05rem',
          margin: 0,
        }}
      >
        The design preview, every building, the guided tour, and notes on each mode and phase
        are in the app itself. Open it to walk the world.
      </p>
      <a
        href="/app"
        style={{
          marginTop: '0.5rem',
          display: 'inline-block',
          padding: '0.8rem 1.6rem',
          background: '#ff7a1a',
          color: '#0a0a0a',
          fontWeight: 700,
          borderRadius: '0.6rem',
          textDecoration: 'none',
          letterSpacing: '0.01em',
        }}
      >
        Enter the app →
      </a>
    </main>
  );
}
