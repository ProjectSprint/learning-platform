import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Rank } from "@/lib/rank";
import { cn } from "@/lib/utils";
import { RankBadge } from "./RankBadge";

interface SessionSummaryProps {
	sessionXP: number;
	totalXP: number;
	currentRank: Rank;
	previousRank?: Rank;
	questionsAnswered: number;
	correctAnswers: number;
	className?: string;
}

/**
 * SessionSummary displays results after completing a learning session
 * Shows XP earned, rank changes, and performance statistics
 */
export function SessionSummary({
	sessionXP,
	totalXP,
	currentRank,
	previousRank,
	questionsAnswered,
	correctAnswers,
	className,
}: SessionSummaryProps) {
	const rankChanged = previousRank && previousRank !== currentRank;
	const rankUp = rankChanged && isRankHigher(currentRank, previousRank);
	const accuracy =
		questionsAnswered > 0
			? Math.round((correctAnswers / questionsAnswered) * 100)
			: 0;

	return (
		<Card className={cn("w-full max-w-2xl", className)}>
			<CardHeader>
				<CardTitle className="text-2xl">Session Complete!</CardTitle>
				<CardDescription>Here's how you performed</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Rank Status */}
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm text-muted-foreground mb-2">Current Rank</p>
						<RankBadge rank={currentRank} size="lg" />
					</div>
					{rankChanged && (
						<div className="text-right">
							<p className="text-sm text-muted-foreground mb-2">
								{rankUp ? "Rank Up!" : "Rank Changed"}
							</p>
							<div className="flex items-center gap-2">
								<RankBadge rank={previousRank} size="sm" />
								<span className="text-muted-foreground">→</span>
								<RankBadge rank={currentRank} size="sm" />
							</div>
						</div>
					)}
				</div>

				{/* XP Earned */}
				<div className="grid grid-cols-2 gap-4">
					<div className="bg-muted rounded-lg p-4">
						<p className="text-sm text-muted-foreground mb-1">Session XP</p>
						<p className="text-2xl font-bold text-green-600">
							+{sessionXP.toLocaleString()}
						</p>
					</div>
					<div className="bg-muted rounded-lg p-4">
						<p className="text-sm text-muted-foreground mb-1">Total XP</p>
						<p className="text-2xl font-bold">{totalXP.toLocaleString()}</p>
					</div>
				</div>

				{/* Performance Stats */}
				<div className="grid grid-cols-2 gap-4">
					<div className="bg-muted rounded-lg p-4">
						<p className="text-sm text-muted-foreground mb-1">Questions</p>
						<p className="text-2xl font-bold">{questionsAnswered}</p>
					</div>
					<div className="bg-muted rounded-lg p-4">
						<p className="text-sm text-muted-foreground mb-1">Accuracy</p>
						<p className="text-2xl font-bold">{accuracy}%</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * Helper to determine if one rank is higher than another
 */
function isRankHigher(current: Rank, previous: Rank): boolean {
	const rankOrder: Rank[] = [
		"newcomer",
		"junior",
		"medior",
		"master",
		"shaman",
	];
	return rankOrder.indexOf(current) > rankOrder.indexOf(previous);
}
