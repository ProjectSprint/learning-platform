import { cn } from "@/lib/utils";

interface ConnectionIndicatorProps {
	result: "green" | "yellow" | "red" | "neutral";
	size?: "sm" | "md" | "lg";
	showLabel?: boolean;
	className?: string;
}

const sizeClasses = {
	sm: "w-3 h-3",
	md: "w-4 h-4",
	lg: "w-6 h-6",
};

const resultClasses = {
	green: "bg-green-500",
	yellow: "bg-yellow-500",
	red: "bg-red-500",
	neutral: "bg-gray-300",
};

const resultLabels = {
	green: "Optimal",
	yellow: "Acceptable",
	red: "Invalid",
	neutral: "Not evaluated",
};

/**
 * ConnectionIndicator shows the validity of a word puzzle connection
 * Used to indicate whether a word sequence is:
 * - Green: Optimal solution (100% XP)
 * - Yellow: Works but suboptimal (50% XP)
 * - Red: Won't work at all (0% XP)
 * - Neutral: Not yet evaluated
 */
export function ConnectionIndicator({
	result,
	size = "md",
	showLabel = false,
	className,
}: ConnectionIndicatorProps) {
	return (
		<div className={cn("flex items-center gap-2", className)}>
			<div
				className={cn("rounded-full", sizeClasses[size], resultClasses[result])}
				role="status"
				aria-label={resultLabels[result]}
			/>
			{showLabel && (
				<span className="text-sm font-medium">{resultLabels[result]}</span>
			)}
		</div>
	);
}
