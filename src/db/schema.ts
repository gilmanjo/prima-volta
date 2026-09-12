// Prima Volta — D1 schema, first slice (10 §4's DDL, the log/config core).
// Logs are append-only and never UPDATEd; projections live replica-side, never here.
// Every table carries userId from day 1 (00 posture); auth itself is deferred.
import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at").notNull(),
});

// 03 §3 — device-specific values live here and ONLY here
export const deviceProfiles = sqliteTable("device_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(), // "FP-30X · USB"
  transport: text("transport", { enum: ["USB", "BLE"] }).notNull(),
  latencyMs: integer("latency_ms").notNull().default(0),
  jitterMs: integer("jitter_ms").notNull().default(0),
  velocityFloor: integer("velocity_floor").notNull().default(0),
  perfTrusted: integer("perf_trusted", { mode: "boolean" }).notNull().default(false),
  calibratedAt: integer("calibrated_at"),
});

// 08 §6 — deviceProfileId/clockCorr null on knowledge-only bouts
export const bouts = sqliteTable("bouts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  deviceProfileId: text("device_profile_id"),
  clockCorrJson: text("clock_corr_json"),
  openedAt: integer("opened_at").notNull(),
  closedAt: integer("closed_at"),
  summaryJson: text("summary_json"),
});

// 03 §1.6 / 10 §4 — the raw response, forever; exactly one of rawMidi | rawChoiceJson
export const attempts = sqliteTable("attempts", {
  id: text("id").primaryKey(), // client ULID
  userId: text("user_id").notNull(),
  boutId: text("bout_id").notNull(),
  kind: text("kind", { enum: ["drill", "read", "benchmark", "placement"] }).notNull(),
  atomId: text("atom_id"),
  requestJson: text("request_json"),
  seed: text("seed"),
  scoreJson: text("score_json"),
  mode: text("mode", { enum: ["rehearsal", "performance"] }).notNull(),
  profileId: text("profile_id"), // null on knowledge-only attempts
  rawMidi: blob("raw_midi"),
  rawChoiceJson: text("raw_choice_json"),
  graderVersion: text("grader_version").notNull(),
  tagsVersion: text("tags_version").notNull(),
  gradeJson: text("grade_json").notNull(),
  startedAt: integer("started_at").notNull(),
});

// 04 §3 — append-only; tier at grading time; derived rows parent-linked (02 §3)
export const reviewLogs = sqliteTable("review_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  atomId: text("atom_id").notNull(),
  attemptId: text("attempt_id").notNull(),
  rating: integer("rating").notNull(), // 1 Again · 2 Hard · 3 Good (Easy unused)
  latencyMs: integer("latency_ms"),
  tier: integer("tier").notNull(),
  derived: integer("derived", { mode: "boolean" }).notNull().default(false),
  parentAttemptId: text("parent_attempt_id"),
  instanceSeed: text("instance_seed"),
  errorSummaryJson: text("error_summary_json"),
  paramGroup: text("param_group", { enum: ["A", "B"] }).notNull(),
  reviewedAt: integer("reviewed_at").notNull(),
});
