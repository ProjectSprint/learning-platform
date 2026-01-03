import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * useQuestionSubmit - Handles answer submission
 *
 * Responsibilities:
 * - POST answer to API
 * - Return result (green/yellow/red/pending)
 * - Return XP earned and new totals
 * - Invalidate relevant queries on success
 */

interface SubmitAnswerParams {
	sessionId: string;
	questionId: string;
	questionType: "word-puzzle" | "coding" | "multiple-choice" | "open-ended";
	answer: unknown;
}

interface SubmitAnswerResult {
	result: "green" | "yellow" | "red" | "pending";
	xpEarned: number;
	newTotalXP: number;
	newRank: string;
	rankChanged: boolean;
}

export function useQuestionSubmit(userId: string) {
	const queryClient = useQueryClient();

	const mutation = useMutation<SubmitAnswerResult, Error, SubmitAnswerParams>({
		mutationFn: async (params) => {
			const response = await fetch("/api/submit-answer", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(params),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to submit answer");
			}

			return response.json();
		},
		onSuccess: () => {
			// Invalidate user query to refresh rank
			queryClient.invalidateQueries({ queryKey: ["user", userId] });

			// Update session query data with new XP
			queryClient.invalidateQueries({ queryKey: ["session", userId] });
		},
	});

	return {
		submit: mutation.mutate,
		submitAsync: mutation.mutateAsync,
		isSubmitting: mutation.isPending,
		error: mutation.error,
		data: mutation.data,
	};
}
