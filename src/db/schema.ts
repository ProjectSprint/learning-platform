import {
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

// ============================================================================
// Enums
// ============================================================================

export const rankEnum = pgEnum("rank", [
	"newcomer",
	"junior",
	"medior",
	"master",
	"shaman",
]);
export const questionTypeEnum = pgEnum("question_type", [
	"word-puzzle",
	"coding",
	"multiple-choice",
	"open-ended",
]);
export const resultEnum = pgEnum("result", [
	"green",
	"yellow",
	"red",
	"pending",
]);

// ============================================================================
// User & Session Tables
// ============================================================================

export const users = pgTable("users", {
	id: text("id").primaryKey(),
	clerkId: text("clerk_id").notNull().unique(),
	totalXP: integer("total_xp").notNull().default(0),
	currentRank: rankEnum("current_rank").notNull().default("newcomer"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.references(() => users.id)
		.notNull(),
	sessionXP: integer("session_xp").notNull().default(0),
	startedAt: timestamp("started_at").defaultNow().notNull(),
	completedAt: timestamp("completed_at"),
});

export const questionAttempts = pgTable("question_attempts", {
	id: text("id").primaryKey(),
	sessionId: text("session_id")
		.references(() => sessions.id)
		.notNull(),
	questionId: text("question_id").notNull(),
	questionType: questionTypeEnum("question_type").notNull(),
	answer: jsonb("answer").notNull(),
	result: resultEnum("result").notNull(),
	xpEarned: integer("xp_earned").notNull().default(0),
	completedAt: timestamp("completed_at").defaultNow().notNull(),
});

// ============================================================================
// Question Tables
// ============================================================================

export const wordPuzzles = pgTable("word_puzzles", {
	id: text("id").primaryKey(),
	title: text("title").notNull(),
	description: text("description").notNull(),
	type: text("type").notNull(), // 'interactive' - supports 2-4 actors
	baseXP: integer("base_xp").notNull(),
	actors: jsonb("actors").notNull(), // Array of 2-4 Actor objects (min: 2, max: 4)
	availableWords: jsonb("available_words").notNull(), // Array of Word objects
	correctSequence: jsonb("correct_sequence").notNull(), // 2D array: [[actor1→actor2], [actor2→actor3], [actor3→actor4]]
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const codingChallenges = pgTable("coding_challenges", {
	id: text("id").primaryKey(),
	baseXP: integer("base_xp").notNull(),
	title: text("title").notNull(),
	description: text("description").notNull(),
	templates: jsonb("templates").notNull(), // Record<language, CodeTemplate>
	testCases: jsonb("test_cases").notNull(), // Array of TestCase objects
	maxRuntime: integer("max_runtime").notNull(), // milliseconds
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const multipleChoiceQuestions = pgTable("multiple_choice_questions", {
	id: text("id").primaryKey(),
	baseXP: integer("base_xp").notNull(),
	question: jsonb("question").notNull(), // QuestionContent object (imageUrl, imageFallback, text)
	options: jsonb("options").notNull(), // Array of AnswerOption objects
	correctOptionId: text("correct_option_id").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const openEndedQuestions = pgTable("open_ended_questions", {
	id: text("id").primaryKey(),
	baseXP: integer("base_xp").notNull(),
	prompt: text("prompt").notNull(),
	maxLength: integer("max_length").notNull().default(2000),
	rubric: jsonb("rubric").notNull(), // Array of RubricItem objects
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const openEndedSubmissions = pgTable("open_ended_submissions", {
	id: text("id").primaryKey(),
	questionId: text("question_id")
		.references(() => openEndedQuestions.id)
		.notNull(),
	userId: text("user_id")
		.references(() => users.id)
		.notNull(),
	answer: text("answer").notNull(),
	gradedAt: timestamp("graded_at"),
	gradedBy: text("graded_by"),
	rubricScores: jsonb("rubric_scores"), // Record<rubricItemId, points>
	feedback: text("feedback"),
	finalScore: resultEnum("final_score"), // green | yellow | red
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
