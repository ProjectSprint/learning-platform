CREATE TYPE "public"."question_type" AS ENUM('word-puzzle', 'coding', 'multiple-choice', 'open-ended');--> statement-breakpoint
CREATE TYPE "public"."result" AS ENUM('green', 'yellow', 'red', 'pending');--> statement-breakpoint
CREATE TABLE "coding_challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"base_xp" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"templates" jsonb NOT NULL,
	"test_cases" jsonb NOT NULL,
	"max_runtime" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "multiple_choice_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"base_xp" integer NOT NULL,
	"question" jsonb NOT NULL,
	"options" jsonb NOT NULL,
	"correct_option_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_ended_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"base_xp" integer NOT NULL,
	"prompt" text NOT NULL,
	"max_length" integer DEFAULT 2000 NOT NULL,
	"rubric" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_ended_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"question_id" text NOT NULL,
	"user_id" text NOT NULL,
	"answer" text NOT NULL,
	"graded_at" timestamp,
	"graded_by" text,
	"rubric_scores" jsonb,
	"feedback" text,
	"final_score" "result",
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "word_puzzles" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"base_xp" integer NOT NULL,
	"actors" jsonb NOT NULL,
	"available_words" jsonb NOT NULL,
	"correct_sequence" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "question_attempts" ALTER COLUMN "question_type" SET DATA TYPE "public"."question_type" USING "question_type"::"public"."question_type";--> statement-breakpoint
ALTER TABLE "question_attempts" ALTER COLUMN "result" SET DATA TYPE "public"."result" USING "result"::"public"."result";--> statement-breakpoint
ALTER TABLE "open_ended_submissions" ADD CONSTRAINT "open_ended_submissions_question_id_open_ended_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."open_ended_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_ended_submissions" ADD CONSTRAINT "open_ended_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;