import { Badge } from "@/components/ui/badge";
import { getRankInfo, type Rank } from "@/lib/rank";
import { cn } from "@/lib/utils";

interface RankBadgeProps {
	rank: Rank;
	size?: "sm" | "md" | "lg";
	showIcon?: boolean;
	showLabel?: boolean;
	className?: string;
}

const sizeClasses = {
	sm: "text-xs px-2 py-0.5",
	md: "text-sm px-3 py-1",
	lg: "text-base px-4 py-1.5",
};

const rankColorClasses = {
	newcomer: "bg-gray-100 text-gray-800 border-gray-300",
	junior: "bg-amber-100 text-amber-800 border-amber-300",
	medior: "bg-slate-200 text-slate-800 border-slate-400",
	master: "bg-yellow-100 text-yellow-900 border-yellow-400",
	shaman: "bg-purple-100 text-purple-800 border-purple-400",
};

/**
 * RankBadge displays a user's current rank with color and icon
 * Each rank has a distinctive color scheme and icon
 */
export function RankBadge({
	rank,
	size = "md",
	showIcon = true,
	showLabel = true,
	className,
}: RankBadgeProps) {
	const rankInfo = getRankInfo(rank);

	return (
		<Badge
			variant="outline"
			className={cn(
				"font-semibold",
				sizeClasses[size],
				rankColorClasses[rank],
				className,
			)}
		>
			{showIcon && <span className="mr-1">{rankInfo.icon}</span>}
			{showLabel && rankInfo.label}
		</Badge>
	);
}
