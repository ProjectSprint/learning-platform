// Rank calculation and XP management utilities

export const RANK_THRESHOLDS = {
	newcomer: 0,
	junior: 1000,
	medior: 3000,
	master: 10000,
	shaman: 30000,
} as const;

export type Rank = keyof typeof RANK_THRESHOLDS;

/**
 * Calculate user rank based on total XP
 * Note: Rank oscillation at boundaries is intentional - creates tension
 */
export function calculateRank(totalXP: number): Rank {
	if (totalXP >= RANK_THRESHOLDS.shaman) return "shaman";
	if (totalXP >= RANK_THRESHOLDS.master) return "master";
	if (totalXP >= RANK_THRESHOLDS.medior) return "medior";
	if (totalXP >= RANK_THRESHOLDS.junior) return "junior";
	return "newcomer";
}

/**
 * Calculate XP multiplier based on answer result
 * - Green (optimal): 100% XP
 * - Yellow (acceptable): 50% XP
 * - Red (wrong): 0% XP
 */
export function calculateXPMultiplier(
	result: "green" | "yellow" | "red",
): number {
	switch (result) {
		case "green":
			return 1.0;
		case "yellow":
			return 0.5;
		case "red":
			return 0;
	}
}

/**
 * Get XP needed to reach the next rank
 * Returns null if already at max rank (shaman)
 */
export function getXPToNextRank(currentXP: number): {
	nextRank: Rank | null;
	xpNeeded: number;
} {
	const ranks: Rank[] = ["newcomer", "junior", "medior", "master", "shaman"];
	const currentRank = calculateRank(currentXP);
	const currentIndex = ranks.indexOf(currentRank);

	if (currentIndex === ranks.length - 1) {
		return { nextRank: null, xpNeeded: 0 };
	}

	const nextRank = ranks[currentIndex + 1];
	return {
		nextRank,
		xpNeeded: RANK_THRESHOLDS[nextRank] - currentXP,
	};
}

/**
 * Calculate progress percentage towards next rank
 * Returns 100 if at max rank
 */
export function getRankProgress(currentXP: number): number {
	const ranks: Rank[] = ["newcomer", "junior", "medior", "master", "shaman"];
	const currentRank = calculateRank(currentXP);
	const currentIndex = ranks.indexOf(currentRank);

	if (currentIndex === ranks.length - 1) {
		return 100; // Max rank
	}

	const currentThreshold = RANK_THRESHOLDS[currentRank];
	const nextRank = ranks[currentIndex + 1];
	const nextThreshold = RANK_THRESHOLDS[nextRank];

	const progress =
		((currentXP - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
	return Math.min(Math.max(progress, 0), 100);
}

/**
 * Get rank display information (color, icon, etc.)
 */
export function getRankInfo(rank: Rank) {
	const rankInfo = {
		newcomer: {
			color: "gray",
			icon: "🌱",
			label: "Newcomer",
			description: "Just started",
		},
		junior: {
			color: "bronze",
			icon: "📘",
			label: "Junior",
			description: "Learning fundamentals",
		},
		medior: {
			color: "silver",
			icon: "🛡️",
			label: "Medior",
			description: "Solid understanding",
		},
		master: {
			color: "gold",
			icon: "⭐",
			label: "Master",
			description: "Deep expertise",
		},
		shaman: {
			color: "purple",
			icon: "🔮",
			label: "Shaman",
			description: "Mastery achieved",
		},
	};

	return rankInfo[rank];
}
