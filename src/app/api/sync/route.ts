// The sync endpoint (10 §5): append-only union by client id — push is idempotent, merge is set-union.
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { attempts, bouts, deviceProfiles, reviewLogs } from "../../../db/schema";

const USER = "jordan"; // userId day 1, auth deferred (00 posture; Access guards the door)

type Row = Record<string, unknown>;

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as { attempts?: Row[]; reviews?: Row[]; bouts?: Row[]; profiles?: Row[] };
  const { env } = getCloudflareContext();
  const db = drizzle((env as Record<string, unknown>).DB as Parameters<typeof drizzle>[0]);

  for (const p of body.profiles ?? []) {
    // device profiles are LWW config (03 §3): re-calibration upserts, history untouched
    await db.insert(deviceProfiles).values({
      id: String(p.id), userId: USER, name: String(p.name ?? ""),
      transport: (p.transport as "USB" | "BLE") ?? "USB",
      latencyMs: Number(p.latencyMs ?? 0), jitterMs: Number(p.jitterMs ?? 0),
      velocityFloor: Number(p.velocityFloor ?? 0), perfTrusted: Boolean(p.perfTrusted),
      calibratedAt: p.calibratedAt == null ? null : Number(p.calibratedAt),
    }).onConflictDoUpdate({
      target: deviceProfiles.id,
      set: {
        latencyMs: Number(p.latencyMs ?? 0), jitterMs: Number(p.jitterMs ?? 0),
        velocityFloor: Number(p.velocityFloor ?? 0),
        calibratedAt: p.calibratedAt == null ? null : Number(p.calibratedAt),
      },
    });
  }

  for (const b of body.bouts ?? []) {
    // bouts are LWW config, not append-only logs (10 §4): close/attach updates land as upserts
    await db.insert(bouts).values({
      id: String(b.id), userId: USER,
      deviceProfileId: (b.profileId as string) ?? null,
      clockCorrJson: (b.clockCorrJson as string) ?? null,
      openedAt: Number(b.openedAt ?? 0),
      closedAt: b.closedAt == null ? null : Number(b.closedAt),
      summaryJson: null,
    }).onConflictDoUpdate({
      target: bouts.id,
      set: {
        deviceProfileId: (b.profileId as string) ?? null,
        clockCorrJson: (b.clockCorrJson as string) ?? null,
        closedAt: b.closedAt == null ? null : Number(b.closedAt),
      },
    });
  }
  for (const a of body.attempts ?? []) {
    await db.insert(attempts).values({
      id: String(a.id), userId: USER, boutId: String(a.boutId), kind: "drill",
      atomId: (a.atomId as string) ?? null, requestJson: null, seed: null, scoreJson: null,
      mode: "rehearsal", profileId: (a.profileId as string) ?? null,
      rawMidi: JSON.stringify(a.rawMidi ?? []),
      rawChoiceJson: a.rawChoiceJson === undefined ? null : JSON.stringify(a.rawChoiceJson),
      graderVersion: String(a.graderVersion ?? "v1"), tagsVersion: String(a.tagsVersion ?? "v1"),
      gradeJson: JSON.stringify(a.gradeJson ?? {}), startedAt: Number(a.startedAt ?? 0),
    }).onConflictDoNothing();
  }
  for (const r of body.reviews ?? []) {
    await db.insert(reviewLogs).values({
      id: String(r.id), userId: USER, atomId: String(r.atomId), attemptId: String(r.attemptId),
      rating: Number(r.rating), latencyMs: r.latencyMs == null ? null : Number(r.latencyMs),
      tier: Number(r.tier ?? 0), derived: Boolean(r.derived),
      parentAttemptId: (r.parentAttemptId as string) ?? null, instanceSeed: null,
      errorSummaryJson: null, paramGroup: "A", reviewedAt: Number(r.reviewedAt ?? 0),
    }).onConflictDoNothing();
  }
  return Response.json({ ok: true });
}
