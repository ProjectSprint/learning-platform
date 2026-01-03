import { db } from "./index";
import {
  wordPuzzles,
  multipleChoiceQuestions,
  questionAttempts,
  sessions,
} from "./schema";

async function resetQuestions() {
  console.log("🗑️  Resetting all question data...");

  try {
    // Delete in correct order (foreign key dependencies)
    console.log("   Deleting question attempts...");
    await db.delete(questionAttempts);

    console.log("   Deleting sessions...");
    await db.delete(sessions);

    console.log("   Deleting word puzzles...");
    await db.delete(wordPuzzles);

    console.log("   Deleting multiple choice questions...");
    await db.delete(multipleChoiceQuestions);

    console.log("✅ All question data cleared successfully");
  } catch (error) {
    console.error("❌ Failed to clear question data:", error);
    process.exit(1);
  }

  process.exit(0);
}

resetQuestions();
