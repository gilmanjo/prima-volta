CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`bout_id` text NOT NULL,
	`kind` text NOT NULL,
	`atom_id` text,
	`request_json` text,
	`seed` text,
	`score_json` text,
	`mode` text NOT NULL,
	`profile_id` text,
	`raw_midi` blob,
	`raw_choice_json` text,
	`grader_version` text NOT NULL,
	`tags_version` text NOT NULL,
	`grade_json` text NOT NULL,
	`started_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bouts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`device_profile_id` text,
	`clock_corr_json` text,
	`opened_at` integer NOT NULL,
	`closed_at` integer,
	`summary_json` text
);
--> statement-breakpoint
CREATE TABLE `device_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`transport` text NOT NULL,
	`latency_ms` integer DEFAULT 0 NOT NULL,
	`jitter_ms` integer DEFAULT 0 NOT NULL,
	`velocity_floor` integer DEFAULT 0 NOT NULL,
	`perf_trusted` integer DEFAULT false NOT NULL,
	`calibrated_at` integer
);
--> statement-breakpoint
CREATE TABLE `review_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`atom_id` text NOT NULL,
	`attempt_id` text NOT NULL,
	`rating` integer NOT NULL,
	`latency_ms` integer,
	`tier` integer NOT NULL,
	`derived` integer DEFAULT false NOT NULL,
	`parent_attempt_id` text,
	`instance_seed` text,
	`error_summary_json` text,
	`param_group` text NOT NULL,
	`reviewed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
