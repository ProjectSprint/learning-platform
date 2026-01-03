import { cn } from "@/lib/utils";

interface CharacterCounterProps {
	count: number;
	maxLength?: number;
	className?: string;
}

/**
 * CharacterCounter displays character count for text inputs
 * Shows warning when soft limit is exceeded (but doesn't prevent submission)
 */
export function CharacterCounter({
	count,
	maxLength = 2000,
	className,
}: CharacterCounterProps) {
	const exceedsLimit = count > maxLength;

	return (
		<div
			className={cn(
				"text-sm",
				exceedsLimit ? "text-red-500 font-medium" : "text-muted-foreground",
				className,
			)}
		>
			{count.toLocaleString()}/{maxLength.toLocaleString()}
			{exceedsLimit && " — Please shorten your response"}
		</div>
	);
}
