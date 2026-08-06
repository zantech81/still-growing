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

// DELETE ?playbackId=xxx: delete the Mux asset behind a playback ID that's
// being replaced. Called by ChapterForm.tsx ONLY after the chapter row's
// own DB update has already committed the NEW mux_playback_id -- never
// before, and never from MuxUploader.tsx itself (which only knows a fresh
// upload finished processing, not whether the admin will actually save
// the form). That ordering is the whole point: a save that fails, or a
// replace the admin abandons without saving, can never result in a live
// chapter pointing at an asset this route has deleted. Two prior rounds
// of manually deleting orphaned Mux assets (most recently after chapter
// 4's upload hit the free plan's 10-asset cap) are what this is meant to
// prevent from recurring.
export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const playbackId = searchParams.get("playbackId");
  if (!playbackId) {
    return NextResponse.json({ error: "Missing playbackId" }, { status: 400 });
  }

  const auth = muxAuthHeader();

  // Deleting requires the asset ID, not the playback ID -- they're
  // different Mux identifiers -- so this looks up the asset behind the
  // playback ID first.
  const lookupRes = await fetch(`${MUX_BASE}/video/v1/playback-ids/${playbackId}`, {
    headers: { Authorization: auth },
  });
  if (!lookupRes.ok) {
    // Already gone (e.g. a previous manual cleanup sweep), or never
    // existed under this ID: nothing left to clean up, not an error.
    return NextResponse.json({ ok: true, skipped: true });
  }
  const { data: playbackData } = (await lookupRes.json()) as { data: { object: { id: string } } };
  const assetId = playbackData.object.id;

  const deleteRes = await fetch(`${MUX_BASE}/video/v1/assets/${assetId}`, {
    method: "DELETE",
    headers: { Authorization: auth },
  });
  if (!deleteRes.ok && deleteRes.status !== 404) {
    const err = await deleteRes.text().catch(() => "");
    console.error("[mux] Delete old asset failed:", err);
    // Not fatal to the caller: by this point the NEW asset is already
    // saved on the chapter, so the only consequence of this failing is
    // the old asset stays around as an orphan (the exact pre-existing
    // state this route exists to avoid), not anything reader-facing.
    return NextResponse.json({ error: "Failed to delete old asset" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
