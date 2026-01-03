import { Button } from "@/components/ui/button";
import { MultipleChoice } from "@/components/questions/MultipleChoice";
import { WordPuzzle } from "@/components/questions/WordPuzzle";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/play/$questionId")({
  component: QuestionPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      sessionId: (search.sessionId as string) || "",
    };
  },
});

function QuestionPage() {
  const { questionId } = Route.useParams();
  const { sessionId } = Route.useSearch();
  const navigate = useNavigate();

  const [questionData, setQuestionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    result: "green" | "yellow" | "red";
    xpEarned: number;
    newTotalXP: number;
    newRank: string;
    rankChanged: boolean;
  } | null>(null);

  // Fetch question data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      fetchQuestionData();
    }
  }, []);

  async function fetchQuestionData() {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/questions/next?sessionId=${sessionId}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch question");
      }

      const data = await response.json();
      setQuestionData(data);
    } catch (err) {
      console.error("Error fetching question:", err);
      setError("Failed to load question. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmitAnswer(answer: any) {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/submit-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          questionId: questionData.questionId,
          questionType: questionData.questionType,
          answer,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit answer");
      }

      const resultData = await response.json();
      setResult(resultData);
    } catch (err) {
      console.error("Error submitting answer:", err);
      setError("Failed to submit answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleNextQuestion() {
    // Reload the page to fetch next question
    setResult(null);
    setQuestionData(null);
    await fetchQuestionData();
  }

  function handleEndSession() {
    navigate({ to: "/play/summary", search: { sessionId } });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading question...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={() => navigate({ to: "/" })}>Back to Home</Button>
        </div>
      </div>
    );
  }

  if (!questionData) {
    return null;
  }

  // Show result screen after submission
  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8">
          <div className="text-center mb-8">
            <div
              className={`text-6xl font-bold mb-4 ${
                result.result === "green"
                  ? "text-green-400"
                  : result.result === "yellow"
                    ? "text-yellow-400"
                    : "text-red-400"
              }`}
            >
              {result.result === "green"
                ? "Correct!"
                : result.result === "yellow"
                  ? "Partially Correct"
                  : "Incorrect"}
            </div>
            <p className="text-2xl text-white mb-2">
              +{result.xpEarned} XP
            </p>
            <p className="text-gray-400">
              Total XP: {result.newTotalXP} | Rank: {result.newRank}
            </p>
            {result.rankChanged && (
              <p className="text-cyan-400 font-semibold mt-2">
                Rank changed to {result.newRank}!
              </p>
            )}
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleNextQuestion}
              className="flex-1 bg-cyan-500 hover:bg-cyan-600"
            >
              Next Question
            </Button>
            <Button
              onClick={handleEndSession}
              variant="outline"
              className="flex-1"
            >
              End Session
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render question based on type
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h1 className="text-2xl font-bold text-white">
                {questionData.questionType === "word-puzzle"
                  ? questionData.question.title
                  : "Multiple Choice Question"}
              </h1>
              <span className="text-sm text-gray-400">
                Base XP: {questionData.question.baseXP}
              </span>
            </div>
            {questionData.questionType === "word-puzzle" && (
              <p className="text-gray-300">{questionData.question.description}</p>
            )}
          </div>

          {/* Question Component */}
          {questionData.questionType === "word-puzzle" ? (
            <WordPuzzle
              actors={questionData.question.actors}
              availableWords={questionData.question.availableWords}
              onSubmit={(sequences) => handleSubmitAnswer(sequences)}
              isSubmitting={isSubmitting}
            />
          ) : questionData.questionType === "multiple-choice" ? (
            <MultipleChoice
              question={{
                text: questionData.question.content,
                imageFallback: "Question image",
              }}
              options={questionData.question.options.map((opt: any) => ({
                id: opt.id,
                text: opt.text,
                imageUrl: opt.imageUrl,
                imageFallback: "Option image",
              }))}
              onSubmit={(selectedOptionId) =>
                handleSubmitAnswer({ selectedOptionId })
              }
              isSubmitting={isSubmitting}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
