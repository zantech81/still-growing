import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MUX_BASE = "https://api.mux.com";

function muxAuthHeader() {
  const id = process.env.MUX_TOKEN_ID!;
  const secret = process.env.MUX_TOKEN_SECRET!;
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

async function requireAdmin(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  return !!data?.is_admin;
}

// POST: create a single-use direct upload URL from Mux.
// The browser then PUTs the video file directly to that URL (never through
// our server). Returns { uploadId, uploadUrl }.
export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const res = await fetch(`${MUX_BASE}/video/v1/uploads`, {
    method: "POST",
    headers: {
      Authorization: muxAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cors_origin: "*",
      new_asset_settings: { playback_policy: ["public"] },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("[mux] Create upload failed:", err);
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 502 });
  }

  const { data } = (await res.json()) as { data: { id: string; url: string } };
  return NextResponse.json({ uploadId: data.id, uploadUrl: data.url });
}

// GET ?uploadId=xxx: poll Mux for upload/asset status.
// Returns { status: "processing" | "ready" | "errored", playbackId? }.
// The browser polls this every few seconds after the upload completes.
export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const uploadId = searchParams.get("uploadId");
  if (!uploadId) {
    return NextResponse.json({ error: "Missing uploadId" }, { status: 400 });
  }

  const auth = muxAuthHeader();

  // Step 1: check upload status for the asset_id.
  const uploadRes = await fetch(`${MUX_BASE}/video/v1/uploads/${uploadId}`, {
    headers: { Authorization: auth },
  });

  if (!uploadRes.ok) {
    return NextResponse.json({ status: "errored" });
  }

  const { data: upload } = (await uploadRes.json()) as {
    data: { status: string; asset_id?: string };
  };

  if (upload.status === "errored") {
    return NextResponse.json({ status: "errored" });
  }
  if (!upload.asset_id) {
    return NextResponse.json({ status: "processing" });
  }

  // Step 2: asset exists, fetch it to get the playback ID.
  const assetRes = await fetch(`${MUX_BASE}/video/v1/assets/${upload.asset_id}`, {
    headers: { Authorization: auth },
  });

  if (!assetRes.ok) {
    return NextResponse.json({ status: "processing" });
  }

  const { data: asset } = (await assetRes.json()) as {
    data: {
      status: string;
      playback_ids?: Array<{ id: string; policy: string }>;
    };
  };

  if (asset.status !== "ready") {
    return NextResponse.json({ status: "processing" });
  }

  const playbackId = asset.playback_ids?.[0]?.id;
  if (!playbackId) {
    return NextResponse.json({ status: "errored" });
  }

  return NextResponse.json({ status: "ready", playbackId });
}
