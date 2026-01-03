import { Progress } from "@/components/ui/progress";
import { getRankInfo, getRankProgress, getXPToNextRank } from "@/lib/rank";
import { cn } from "@/lib/utils";

interface XPProgressProps {
	currentXP: number;
	showLabel?: boolean;
	showNextRank?: boolean;
	className?: string;
}

/**
 * XPProgress displays a progress bar showing advancement towards the next rank
 * Shows current XP, progress percentage, and XP needed for next rank
 */
export function XPProgress({
	currentXP,
	showLabel = true,
	showNextRank = true,
	className,
}: XPProgressProps) {
	const progress = getRankProgress(currentXP);
	const { nextRank, xpNeeded } = getXPToNextRank(currentXP);

	// At max rank
	if (!nextRank) {
		return (
			<div className={cn("space-y-2", className)}>
				{showLabel && (
					<div className="flex justify-between text-sm">
						<span className="font-medium">Max Rank Achieved!</span>
						<span className="text-muted-foreground">
							{currentXP.toLocaleString()} XP
						</span>
					</div>
				)}
				<Progress value={100} className="h-2" />
			</div>
		);
	}

	const nextRankInfo = getRankInfo(nextRank);

	return (
		<div className={cn("space-y-2", className)}>
			{showLabel && (
				<div className="flex justify-between text-sm">
					<span className="font-medium">{currentXP.toLocaleString()} XP</span>
					{showNextRank && (
						<span className="text-muted-foreground">
							{xpNeeded.toLocaleString()} to {nextRankInfo.icon}{" "}
							{nextRankInfo.label}
						</span>
					)}
				</div>
			)}
			<Progress value={progress} className="h-2" />
		</div>
	);
}
