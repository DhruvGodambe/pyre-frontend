# PYRE Designer Briefing

Password-protected briefing portal for the PYRE design partner, served at **https://designer.pyreprotocol.com**.

## How to update the briefing

1. Edit any markdown file in `content/` (files render in alphabetical order — the `01-`, `02-` prefixes control section order).
2. Add a dated line to the changelog in `content/07-priorities.md` so the designer sees what changed.
3. Deploy: `vercel deploy --prod --yes`

Adding a new section = adding a new numbered `.md` file. The sidebar and section numbering update automatically. The live URL (designer.pyreprotocol.com) is the project's domain and updates automatically on every production deploy.

## Password

The password lives in the `DESIGNER_PASSWORD` environment variable on Vercel — it is never in the code.

- Change it: `vercel env rm DESIGNER_PASSWORD production` then `vercel env add DESIGNER_PASSWORD production`, then redeploy with `vercel --prod`.
- Changing the password automatically logs the designer out everywhere (sessions are derived from it).
- Local dev uses `.env.local` (not committed).

## Run locally

```
npm install
npm run dev
```

Open http://localhost:3000 — log in with the password from `.env.local`.
