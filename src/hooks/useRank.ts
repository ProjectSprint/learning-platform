import { useQuery } from "@tanstack/react-query";
import { getRankProgress, getXPToNextRank } from "@/lib/rank";

/**
 * useRank - Tracks user rank and progression
 *
 * Responsibilities:
 * - Fetch user's current XP and rank
 * - Calculate XP to next rank
 * - Track if rank changed during session (for animations)
 */

interface UserRank {
	totalXP: number;
	currentRank: string;
	xpToNextRank: number;
	nextRank: string | null;
	progress: number;
}

export function useRank(userId: string) {
	const {
		data: user,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["user", userId],
		queryFn: async () => {
			const response = await fetch(`/api/users/${userId}`);
			if (!response.ok) {
				throw new Error("Failed to fetch user");
			}
			return response.json();
		},
	});

	if (!user) {
		return {
			rank: null,
			isLoading,
			error,
		};
	}

	const { nextRank, xpNeeded } = getXPToNextRank(user.totalXP);
	const progress = getRankProgress(user.totalXP);

	const rankData: UserRank = {
		totalXP: user.totalXP,
		currentRank: user.currentRank,
		xpToNextRank: xpNeeded,
		nextRank,
		progress,
	};

	return {
		rank: rankData,
		isLoading,
		error,
	};
}
