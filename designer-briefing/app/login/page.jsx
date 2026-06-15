'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      setError('The flame rejects this key.');
      setBusy(false);
    }
  }

  return (
    <main className="login-stage">
      <div className="login-card">
        <div className="login-glyph">✦</div>
        <p className="login-eyebrow">Private</p>
        <h1 className="login-title">PYRE</h1>
        <form className="login-form" onSubmit={submit}>
          <input
            className="login-input"
            type="password"
            placeholder="········"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            aria-label="Password"
          />
          <button className="login-btn" type="submit" disabled={busy}>
            {busy ? 'Unsealing' : 'Enter'}
          </button>
          <p className="login-error">{error}</p>
        </form>
      </div>
    </main>
  );
}
