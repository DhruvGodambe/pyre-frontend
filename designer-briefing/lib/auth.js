const SALT = 'pyre-designer-briefing-v1';

// Web Crypto so the same code runs in Node route handlers and Edge middleware.
export async function authToken(password) {
  const data = new TextEncoder().encode(`${SALT}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const AUTH_COOKIE = 'pyre_designer_auth';
