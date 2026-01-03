import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * useSession - Manages game session lifecycle
 *
 * Responsibilities:
 * - Create new session on start
 * - Track session XP accumulation
 * - End session and return summary
 */

interface Session {
	id: string;
	userId: string;
	sessionXP: number;
	startedAt: string;
	completedAt?: string;
}

export function useSession(userId: string) {
	const queryClient = useQueryClient();

	// Fetch current active session
	const { data: session, isLoading } = useQuery<Session | null>({
		queryKey: ["session", userId],
		queryFn: async () => {
			const response = await fetch(`/api/sessions/active?userId=${userId}`);
			if (!response.ok) return null;
			return response.json();
		},
	});

	// Create new session
	const createSession = useMutation({
		mutationFn: async () => {
			const response = await fetch("/api/sessions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId }),
			});

			if (!response.ok) {
				throw new Error("Failed to create session");
			}

			return response.json();
		},
		onSuccess: (newSession) => {
			queryClient.setQueryData(["session", userId], newSession);
		},
	});

	// End session
	const endSession = useMutation({
		mutationFn: async (sessionId: string) => {
			const response = await fetch(`/api/sessions/${sessionId}/end`, {
				method: "POST",
			});

			if (!response.ok) {
				throw new Error("Failed to end session");
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.setQueryData(["session", userId], null);
			queryClient.invalidateQueries({ queryKey: ["user", userId] });
		},
	});

	return {
		session,
		isLoading,
		createSession: createSession.mutate,
		endSession: endSession.mutate,
		isCreating: createSession.isPending,
		isEnding: endSession.isPending,
	};
}
