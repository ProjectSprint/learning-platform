import { db } from "./index";
import { multipleChoiceQuestions, users, wordPuzzles } from "./schema";

async function seed() {
  console.log("🌱 Seeding database...");

  // Create a placeholder user for development
  const userId = "user-placeholder";

  try {
    await db.insert(users).values({
      id: userId,
      clerkId: "clerk-placeholder",
      totalXP: 0,
      currentRank: "newcomer",
    });

    console.log("✅ Placeholder user created:", userId);
  } catch (error) {
    console.log("ℹ️ Placeholder user already exists (skipping)");
  }

  // Seed word puzzles
  console.log("🧩 Seeding word puzzles...");
  try {
    await db.insert(wordPuzzles).values([
      {
        id: "wp-1",
        title: "React Component Lifecycle",
        description:
          "Arrange the React hooks and lifecycle events in the correct order from component creation to removal:",
        type: "interactive",
        actors: [
          {
            id: "actor-component-creation",
            name: "Component Created",
            description: "Component instance initialized",
          },
          {
            id: "actor-component-removed",
            name: "Component Removed",
            description: "Component removed from DOM",
          },
        ],
        availableWords: [
          {
            id: "word-mount",
            label: "mount",
            tooltip: "Component added to DOM for the first time",
            category: "lifecycle",
          },
          {
            id: "word-usestate",
            label: "useState",
            tooltip: "React hook for managing component state",
            category: "hooks",
          },
          {
            id: "word-render",
            label: "render",
            tooltip: "Process of generating UI from component tree",
            category: "lifecycle",
          },
          {
            id: "word-useeffect",
            label: "useEffect",
            tooltip: "React hook for side effects and lifecycle",
            category: "hooks",
          },
          {
            id: "word-cleanup",
            label: "cleanup",
            tooltip: "Function to clean up side effects",
            category: "lifecycle",
          },
          {
            id: "word-unmount",
            label: "unmount",
            tooltip: "Component removed from DOM",
            category: "lifecycle",
          },
        ],
        correctSequence: [
          [
            "word-mount",
            "word-usestate",
            "word-render",
            "word-useeffect",
            "word-cleanup",
            "word-unmount",
          ],
        ],
        baseXP: 100,
      },
      {
        id: "wp-2",
        title: "Git Workflow",
        description:
          "Connect local development to remote repository using Git commands:",
        type: "interactive",
        actors: [
          {
            id: "actor-local-repo",
            name: "Local Repository",
            description: "Your development environment",
          },
          {
            id: "actor-remote-repo",
            name: "Remote Repository",
            description: "Shared code hosted on GitHub",
          },
        ],
        availableWords: [
          {
            id: "word-clone",
            label: "clone",
            tooltip: "Download remote repository to local machine",
            category: "setup",
          },
          {
            id: "word-add",
            label: "add",
            tooltip: "Stage changes for commit",
            category: "staging",
          },
          {
            id: "word-commit",
            label: "commit",
            tooltip: "Save staged changes to local repository",
            category: "local",
          },
          {
            id: "word-pull",
            label: "pull",
            tooltip: "Download and merge remote changes",
            category: "remote",
          },
          {
            id: "word-merge",
            label: "merge",
            tooltip: "Combine changes from different branches",
            category: "integration",
          },
          {
            id: "word-push",
            label: "push",
            tooltip: "Upload local commits to remote repository",
            category: "remote",
          },
        ],
        correctSequence: [
          [
            "word-clone",
            "word-add",
            "word-commit",
            "word-pull",
            "word-merge",
            "word-push",
          ],
        ],
        baseXP: 80,
      },
      {
        id: "wp-3",
        title: "HTTP Request Flow",
        description:
          "Order the steps of an HTTP request/response cycle from client to server and back:",
        type: "interactive",
        actors: [
          {
            id: "actor-client",
            name: "Web Browser",
            description: "User's web browser",
          },
          {
            id: "actor-server",
            name: "Backend Server",
            description: "Processes requests and sends responses",
          },
        ],
        availableWords: [
          {
            id: "word-request",
            label: "request",
            tooltip: "HTTP request sent from browser",
            category: "client",
          },
          {
            id: "word-route",
            label: "route",
            tooltip: "Server maps URL to handler function",
            category: "server",
          },
          {
            id: "word-query",
            label: "query",
            tooltip: "Fetch data from database",
            category: "database",
          },
          {
            id: "word-process",
            label: "process",
            tooltip: "Server processes data and applies logic",
            category: "server",
          },
          {
            id: "word-response",
            label: "response",
            tooltip: "HTTP response sent back to client",
            category: "server",
          },
          {
            id: "word-render",
            label: "render",
            tooltip: "Browser displays the response to user",
            category: "client",
          },
        ],
        correctSequence: [
          [
            "word-request",
            "word-route",
            "word-query",
            "word-process",
            "word-response",
            "word-render",
          ],
        ],
        baseXP: 120,
      },
      {
        id: "wp-4",
        title: "Three-Tier Architecture",
        description:
          "Connect the layers of a web application from user interface to data storage:",
        type: "interactive",
        actors: [
          {
            id: "actor-frontend",
            name: "Frontend",
            description: "User interface layer",
          },
          {
            id: "actor-backend",
            name: "Backend",
            description: "Business logic layer",
          },
          {
            id: "actor-database",
            name: "Database",
            description: "Data persistence layer",
          },
        ],
        availableWords: [
          {
            id: "word-click",
            label: "click",
            tooltip: "User interaction triggers event",
            category: "ui",
          },
          {
            id: "word-fetch",
            label: "fetch",
            tooltip: "API call from frontend to backend",
            category: "network",
          },
          {
            id: "word-validate",
            label: "validate",
            tooltip: "Server validates request data",
            category: "logic",
          },
          {
            id: "word-select",
            label: "SELECT",
            tooltip: "Query database for data",
            category: "database",
          },
          {
            id: "word-json",
            label: "JSON",
            tooltip: "Data serialized for transfer",
            category: "network",
          },
          {
            id: "word-update-ui",
            label: "update UI",
            tooltip: "Display data to user",
            category: "ui",
          },
        ],
        correctSequence: [
          ["word-click", "word-fetch"],
          ["word-validate", "word-select"],
          ["word-json", "word-update-ui"],
        ],
        baseXP: 150,
      },
      {
        id: "wp-5",
        title: "Microservices Communication",
        description:
          "Order the flow of data through a microservices architecture:",
        type: "interactive",
        actors: [
          {
            id: "actor-api-gateway",
            name: "API Gateway",
            description: "Entry point for all requests",
          },
          {
            id: "actor-auth-service",
            name: "Auth Service",
            description: "Handles authentication",
          },
          {
            id: "actor-user-service",
            name: "User Service",
            description: "Manages user data",
          },
          {
            id: "actor-notification-service",
            name: "Notification Service",
            description: "Sends notifications",
          },
        ],
        availableWords: [
          {
            id: "word-route-request",
            label: "route",
            tooltip: "Gateway routes incoming request",
            category: "gateway",
          },
          {
            id: "word-verify",
            label: "verify",
            tooltip: "Verify JWT token",
            category: "auth",
          },
          {
            id: "word-update-profile",
            label: "update",
            tooltip: "Update user profile",
            category: "user",
          },
          {
            id: "word-emit-event",
            label: "emit event",
            tooltip: "Publish event to message queue",
            category: "event",
          },
          {
            id: "word-send-email",
            label: "send email",
            tooltip: "Send notification email",
            category: "notification",
          },
        ],
        correctSequence: [
          ["word-route-request"],
          ["word-verify"],
          ["word-update-profile", "word-emit-event"],
          ["word-send-email"],
        ],
        baseXP: 200,
      },
    ]);
    console.log("✅ Word puzzles seeded");
  } catch (error) {
    console.log("ℹ️ Word puzzles already exist (skipping)");
  }

  // Seed multiple choice questions
  console.log("📝 Seeding multiple choice questions...");
  try {
    await db.insert(multipleChoiceQuestions).values([
      {
        id: "mcq-1",
        baseXP: 50,
        question: {
          text: "What is the correct way to define an optional parameter in TypeScript?",
          imageFallback: "TypeScript question",
        },
        options: [
          {
            id: "mcq-1-opt-a",
            text: "function greet(name: string | null) {}",
            imageFallback: "Option A",
          },
          {
            id: "mcq-1-opt-b",
            text: "function greet(name?: string) {}",
            imageFallback: "Option B",
          },
          {
            id: "mcq-1-opt-c",
            text: "function greet(name: string?) {}",
            imageFallback: "Option C",
          },
          {
            id: "mcq-1-opt-d",
            text: "function greet(optional name: string) {}",
            imageFallback: "Option D",
          },
        ],
        correctOptionId: "mcq-1-opt-b",
      },
      {
        id: "mcq-2",
        baseXP: 60,
        question: {
          text: "Which hook should you use to perform side effects in React?",
          imageFallback: "React question",
        },
        options: [
          {
            id: "mcq-2-opt-a",
            text: "useState",
            imageFallback: "Option A",
          },
          {
            id: "mcq-2-opt-b",
            text: "useContext",
            imageFallback: "Option B",
          },
          {
            id: "mcq-2-opt-c",
            text: "useEffect",
            imageFallback: "Option C",
          },
          {
            id: "mcq-2-opt-d",
            text: "useCallback",
            imageFallback: "Option D",
          },
        ],
        correctOptionId: "mcq-2-opt-c",
      },
      {
        id: "mcq-3",
        baseXP: 40,
        question: {
          text: "Which SQL command is used to retrieve data from a database?",
          imageFallback: "SQL question",
        },
        options: [
          {
            id: "mcq-3-opt-a",
            text: "SELECT",
            imageFallback: "Option A",
          },
          {
            id: "mcq-3-opt-b",
            text: "INSERT",
            imageFallback: "Option B",
          },
          {
            id: "mcq-3-opt-c",
            text: "UPDATE",
            imageFallback: "Option C",
          },
          {
            id: "mcq-3-opt-d",
            text: "DELETE",
            imageFallback: "Option D",
          },
        ],
        correctOptionId: "mcq-3-opt-a",
      },
    ]);

    console.log("✅ Multiple choice questions seeded");
  } catch (error) {
    console.log("ℹ️ Multiple choice questions already exist (skipping)");
  }

  console.log("✅ Seeding complete!");
}

seed()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
