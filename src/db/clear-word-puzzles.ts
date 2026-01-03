import { db } from "./index";
import { wordPuzzles } from "./schema";

async function clearWordPuzzles() {
  console.log("🗑️  Clearing word puzzles...");

  try {
    await db.delete(wordPuzzles);
    console.log("✅ Word puzzles cleared successfully");
  } catch (error) {
    console.error("❌ Failed to clear word puzzles:", error);
    process.exit(1);
  }

  process.exit(0);
}

clearWordPuzzles();
