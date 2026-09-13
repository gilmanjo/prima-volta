// Replica pull (10 §5: new-device boot online once): the review log stream + device
// profiles for the user. Cards are NOT served — the client refolds them (logs = truth).
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { asc, eq } from "drizzle-orm";
import { deviceProfiles, reviewLogs } from "../../../db/schema";

const USER = "jordan";

export async function GET(): Promise<Response> {
  const { env } = getCloudflareContext();
  const db = drizzle((env as Record<string, unknown>).DB as Parameters<typeof drizzle>[0]);
  const reviews = await db.select({
    id: reviewLogs.id, atomId: reviewLogs.atomId, attemptId: reviewLogs.attemptId,
    rating: reviewLogs.rating, latencyMs: reviewLogs.latencyMs, tier: reviewLogs.tier,
    derived: reviewLogs.derived, parentAttemptId: reviewLogs.parentAttemptId,
    reviewedAt: reviewLogs.reviewedAt,
  }).from(reviewLogs).where(eq(reviewLogs.userId, USER)).orderBy(asc(reviewLogs.reviewedAt));
  const profiles = await db.select().from(deviceProfiles).where(eq(deviceProfiles.userId, USER));
  return Response.json({ reviews, profiles });
}
