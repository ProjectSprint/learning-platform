import { db } from "@/db";
import { sessions } from "@/db/schema";
import { createFileRoute } from "@tanstack/react-router";
import { nanoid } from "nanoid";

export const Route = createFileRoute("/api/session/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // TODO: Get userId from Clerk auth
          // For now, use a placeholder user ID
          const userId = "user-placeholder";

          // Create new session
          const sessionId = nanoid();
          await db.insert(sessions).values({
            id: sessionId,
            userId,
            sessionXP: 0,
          });

          return Response.json(
            {
              sessionId,
              success: true,
            },
            { status: 200 },
          );
        } catch (error) {
          console.error("Failed to create session:", error);
          return Response.json(
            {
              error: "Failed to create session",
              code: "SESSION_CREATE_FAILED",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
