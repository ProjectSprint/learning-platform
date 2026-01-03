import { createFileRoute } from "@tanstack/react-router";
import { eq, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  multipleChoiceQuestions,
  questionAttempts,
  wordPuzzles,
} from "@/db/schema";

/**
 * GET /api/questions/next?sessionId=xxx
 *
 * Returns the next unattempted question for the session
 * Randomly selects from word puzzles and multiple choice questions
 */

interface NextQuestionResponse {
  questionId: string;
  questionType: "word-puzzle" | "multiple-choice";
  question:
    | {
        title: string;
        description: string;
        actors: any[];
        availableWords: any[];
        baseXP: number;
      }
    | {
        content: string;
        options: Array<{ id: string; text: string; imageUrl?: string }>;
        baseXP: number;
      };
}

export const Route = createFileRoute("/api/questions/next")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const sessionId = url.searchParams.get("sessionId");

          if (!sessionId) {
            return Response.json(
              { error: "Session ID is required", code: "BAD_REQUEST" },
              { status: 400 },
            );
          }

          // Get all attempted question IDs for this session
          const attempts = await db
            .select({ questionId: questionAttempts.questionId })
            .from(questionAttempts)
            .where(eq(questionAttempts.sessionId, sessionId));

          const attemptedIds = attempts.map((a) => a.questionId);

          // Get unattempted word puzzles
          const wordPuzzleQuery =
            attemptedIds.length > 0
              ? db
                  .select()
                  .from(wordPuzzles)
                  .where(notInArray(wordPuzzles.id, attemptedIds))
              : db.select().from(wordPuzzles);

          const availableWordPuzzles = await wordPuzzleQuery;

          // Get unattempted multiple choice questions
          const mcqQuery =
            attemptedIds.length > 0
              ? db
                  .select()
                  .from(multipleChoiceQuestions)
                  .where(notInArray(multipleChoiceQuestions.id, attemptedIds))
              : db.select().from(multipleChoiceQuestions);

          const availableMCQs = await mcqQuery;

          // Combine all available questions
          const allQuestions = [
            ...availableWordPuzzles.map((q) => ({ ...q, type: "word-puzzle" as const })),
            ...availableMCQs.map((q) => ({ ...q, type: "multiple-choice" as const })),
          ];

          if (allQuestions.length === 0) {
            return Response.json(
              { error: "No more questions available", code: "NO_QUESTIONS" },
              { status: 404 },
            );
          }

          // Randomly select a question
          const randomIndex = Math.floor(Math.random() * allQuestions.length);
          const selectedQuestion = allQuestions[randomIndex];

          // Format response based on question type
          if (selectedQuestion.type === "word-puzzle") {
            const response: NextQuestionResponse = {
              questionId: selectedQuestion.id,
              questionType: "word-puzzle",
              question: {
                title: selectedQuestion.title,
                description: selectedQuestion.description,
                actors: selectedQuestion.actors as any[],
                availableWords: selectedQuestion.availableWords as any[],
                baseXP: selectedQuestion.baseXP,
              },
            };
            return Response.json(response);
          }

          // Multiple choice question - options are stored in JSON
          const response: NextQuestionResponse = {
            questionId: selectedQuestion.id,
            questionType: "multiple-choice",
            question: {
              content: (selectedQuestion.question as any).text,
              options: selectedQuestion.options as Array<{
                id: string;
                text: string;
                imageUrl?: string;
              }>,
              baseXP: selectedQuestion.baseXP,
            },
          };

          return Response.json(response);
        } catch (error) {
          console.error("Fetch next question error:", error);
          return Response.json(
            {
              error: "Internal server error",
              code: "INTERNAL_ERROR",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
