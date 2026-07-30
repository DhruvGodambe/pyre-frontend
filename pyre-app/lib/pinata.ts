/* ============================================================================
   Pinata IPFS client (server-only)
   ----------------------------------------------------------------------------
   Credentials live in .env.local — never NEXT_PUBLIC_*:
     PINATA_API_KEY / PINATA_API_SECRET / PINATA_JWT
   Prefer JWT for pinJSONToIPFS / pinFileToIPFS.
   ========================================================================== */

/* Server-only: import from API routes / scripts, never from client components. */

const PINATA_PIN_JSON = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const PINATA_PIN_FILE = "https://api.pinata.cloud/pinning/pinFileToIPFS";

export type PinataPinResult = {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
  isDuplicate?: boolean;
};

export function isPinataConfigured(): boolean {
  return Boolean(process.env.PINATA_JWT?.trim());
}

function authHeaders(): HeadersInit {
  const jwt = process.env.PINATA_JWT?.trim();
  if (!jwt) {
    throw new Error(
      "PINATA_JWT is missing. Add it to pyre-app/.env.local (Pinata API JWT)."
    );
  }
  return {
    Authorization: `Bearer ${jwt}`,
  };
}

/** Pin a JSON object (NFT metadata) to IPFS via Pinata. */
export async function pinJsonToIpfs(
  body: unknown,
  name: string
): Promise<PinataPinResult> {
  const res = await fetch(PINATA_PIN_JSON, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataContent: body,
      pinataMetadata: { name },
      pinataOptions: { cidVersion: 1 },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pinata pinJSON failed (${res.status}): ${text.slice(0, 300)}`);
  }

  return (await res.json()) as PinataPinResult;
}

/** Copy into an ArrayBuffer-backed view so Blob accepts it (Node Buffer /
    SharedArrayBuffer-backed Uint8Array are not BlobPart under strict DOM typings). */
function toBlobPart(bytes: Buffer | Uint8Array): BlobPart {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes instanceof Buffer ? new Uint8Array(bytes) : bytes);
  return copy;
}

/** Pin a binary file (e.g. Acolyte art PNG) to IPFS via Pinata. */
export async function pinFileToIpfs(
  bytes: Blob | Buffer | Uint8Array,
  filename: string,
  mimeType = "application/octet-stream"
): Promise<PinataPinResult> {
  const blob =
    bytes instanceof Blob
      ? bytes
      : new Blob([toBlobPart(bytes)], { type: mimeType });

  const form = new FormData();
  form.append("file", blob, filename);
  form.append(
    "pinataMetadata",
    JSON.stringify({ name: filename })
  );
  form.append(
    "pinataOptions",
    JSON.stringify({ cidVersion: 1 })
  );

  const res = await fetch(PINATA_PIN_FILE, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pinata pinFile failed (${res.status}): ${text.slice(0, 300)}`);
  }

  return (await res.json()) as PinataPinResult;
}

export function ipfsUri(cid: string): string {
  return `ipfs://${cid}`;
}

export function pinataGatewayUrl(cid: string): string {
  const gateway =
    process.env.PINATA_GATEWAY?.trim() || "https://gateway.pinata.cloud/ipfs";
  return `${gateway.replace(/\/$/, "")}/${cid}`;
}

/** Pin multiple files as one IPFS directory (for Acolyte `0.json`…`3.json`). */
export async function pinDirectoryToIpfs(
  files: { path: string; bytes: Blob | Buffer | Uint8Array; mimeType?: string }[],
  directoryName: string
): Promise<PinataPinResult> {
  if (files.length === 0) throw new Error("pinDirectoryToIpfs: no files");

  const form = new FormData();
  for (const f of files) {
    const blob =
      f.bytes instanceof Blob
        ? f.bytes
        : new Blob([toBlobPart(f.bytes)], {
            type: f.mimeType ?? "application/octet-stream",
          });
    // Pinata builds a folder from the filepath in the filename field.
    form.append("file", blob, `${directoryName}/${f.path}`);
  }
  form.append("pinataMetadata", JSON.stringify({ name: directoryName }));
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1, wrapWithDirectory: false }));

  const res = await fetch(PINATA_PIN_FILE, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pinata pinDirectory failed (${res.status}): ${text.slice(0, 300)}`);
  }

  return (await res.json()) as PinataPinResult;
}

/** Contract-ready baseURI: `ipfs://<dirCid>/` (trailing slash required). */
export function acolyteBaseURI(dirCid: string): string {
  return `${ipfsUri(dirCid)}/`;
}
