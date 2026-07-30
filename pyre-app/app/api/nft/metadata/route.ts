/* POST /api/nft/metadata — pin 4 stage images + stage JSON folder to Pinata.
   GET  /api/nft/metadata — preview templates + pinata config.

   Accepts multipart/form-data with files:
     image-0, image-1, image-2, image-3   (EMBER…PYRE)
   Each image is pinned separately; its ipfs:// CID is written into that
   stage's JSON `image` field before the metadata directory is pinned.

   Auth: designer cookie (same gate as /login). */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, authToken } from "@/lib/auth";
import {
  ON_CHAIN_STAGE_INDICES,
  STAGE_KEYS,
  buildStageMetadata,
  initialStageMetadata,
  onChainStageIndex,
  stageFileStem,
  stageFromOnChainIndex,
  type OnChainStageIndex,
} from "@/lib/nft/metadata";
import {
  acolyteBaseURI,
  ipfsUri,
  isPinataConfigured,
  pinDirectoryToIpfs,
  pinFileToIpfs,
  pinataGatewayUrl,
} from "@/lib/pinata";
import type { Stage } from "@/lib/constants";
import { acolyteName } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_FIELD = (i: OnChainStageIndex) => `image-${i}`;

async function assertDesigner(): Promise<boolean> {
  const expected = process.env.DESIGNER_PASSWORD;
  if (!expected) return false;
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  if (!token) return false;
  return token === (await authToken(expected));
}

function extFromMime(mime: string, fallbackName: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  const m = fallbackName.match(/\.([a-z0-9]+)$/i);
  return m?.[1]?.toLowerCase() ?? "png";
}

export async function GET() {
  if (!(await assertDesigner())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    pinataConfigured: isPinataConfigured(),
    stages: initialStageMetadata(),
    uploadFields: ON_CHAIN_STAGE_INDICES.map((i) => ({
      field: IMAGE_FIELD(i),
      stage: stageFromOnChainIndex(i),
      name: acolyteName(stageFromOnChainIndex(i)),
      json: `${i}.json`,
    })),
    tokenUriPattern: "{baseURI}{stageIndex}.json  (EMBER=0 … PYRE=3)",
  });
}

export async function POST(request: Request) {
  if (!(await assertDesigner())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!isPinataConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "PINATA_JWT missing. Add PINATA_API_KEY, PINATA_API_SECRET, and PINATA_JWT to .env.local.",
      },
      { status: 503 }
    );
  }

  const form = await request.formData();

  type ArtPin = {
    stage: Stage;
    index: OnChainStageIndex;
    cid: string;
    uri: string;
    gateway: string;
    filename: string;
  };

  const artByStage: Partial<Record<Stage, ArtPin>> = {};
  const missing: string[] = [];

  for (const index of ON_CHAIN_STAGE_INDICES) {
    const field = IMAGE_FIELD(index);
    const file = form.get(field);
    if (!(file instanceof File) || file.size === 0) {
      missing.push(field);
      continue;
    }

    const stage = stageFromOnChainIndex(index);
    const ext = extFromMime(file.type || "", file.name);
    const filename = `${index}-${stageFileStem(stage)}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pinned = await pinFileToIpfs(
      bytes,
      filename,
      file.type || "application/octet-stream"
    );
    const uri = ipfsUri(pinned.IpfsHash);
    artByStage[stage] = {
      stage,
      index,
      cid: pinned.IpfsHash,
      uri,
      gateway: pinataGatewayUrl(pinned.IpfsHash),
      filename,
    };
  }

  if (missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `Missing stage images: ${missing.join(", ")}. Upload all four (Ember→Pyre).`,
        missing,
      },
      { status: 400 }
    );
  }

  const imageUris = Object.fromEntries(
    STAGE_KEYS.map((s) => [s, artByStage[s]!.uri])
  ) as Record<Stage, string>;

  const files = STAGE_KEYS.map((stage) => {
    const metadata = buildStageMetadata(stage, imageUris[stage]);
    const index = onChainStageIndex(stage) as OnChainStageIndex;
    return {
      path: `${index}.json`,
      bytes: new TextEncoder().encode(JSON.stringify(metadata, null, 2)),
      mimeType: "application/json",
      stage,
      index,
      metadata,
      art: artByStage[stage]!,
    };
  });

  const dir = await pinDirectoryToIpfs(
    files.map(({ path: p, bytes, mimeType }) => ({ path: p, bytes, mimeType })),
    "pyre-acolyte-metadata"
  );

  const suggestedBaseURI = acolyteBaseURI(dir.IpfsHash);

  return NextResponse.json({
    ok: true,
    art: Object.fromEntries(
      files.map((f) => [
        String(f.stage),
        {
          index: f.index,
          cid: f.art.cid,
          uri: f.art.uri,
          gateway: f.art.gateway,
          filename: f.art.filename,
        },
      ])
    ),
    directory: {
      cid: dir.IpfsHash,
      gateway: pinataGatewayUrl(dir.IpfsHash),
    },
    suggestedBaseURI,
    stages: Object.fromEntries(
      files.map((f) => [
        String(f.stage),
        {
          metadata: f.metadata,
          path: f.path,
          uri: `${suggestedBaseURI}${f.path}`,
          gateway: `${pinataGatewayUrl(dir.IpfsHash)}/${f.path}`,
          imageGateway: f.art.gateway,
        },
      ])
    ),
    note: "Each stage JSON embeds its own image ipfs:// CID. Call setBaseURI(suggestedBaseURI) as admin.",
  });
}
