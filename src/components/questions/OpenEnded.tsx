import { useState } from "react";
import { CharacterCounter } from "@/components/game";
import { Button } from "@/components/ui/button";

/**
 * OpenEnded Component
 *
 * Features:
 * - Textarea with 2000 character soft limit
 * - Character counter
 * - Warning when over limit (but doesn't prevent submission)
 * - No truncation
 */

interface OpenEndedProps {
	prompt: string;
	maxLength?: number;
	onSubmit: (answer: string) => void;
	isSubmitting?: boolean;
}

export function OpenEnded({
	prompt,
	maxLength = 2000,
	onSubmit,
	isSubmitting = false,
}: OpenEndedProps) {
	const [answer, setAnswer] = useState("");

	const handleSubmit = () => {
		onSubmit(answer.trim());
	};

	return (
		<div className="space-y-4">
			{/* Prompt */}
			<div>
				<h2 className="text-xl font-semibold mb-2">Question</h2>
				<p className="text-muted-foreground whitespace-pre-wrap">{prompt}</p>
			</div>

			{/* Answer Textarea */}
			<div className="space-y-2">
				<label htmlFor="answer" className="text-sm font-medium">
					Your Answer
				</label>
				<textarea
					id="answer"
					value={answer}
					onChange={(e) => setAnswer(e.target.value)}
					className="w-full min-h-[300px] p-4 border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary"
					placeholder="Enter your answer here..."
					disabled={isSubmitting}
				/>
				<CharacterCounter count={answer.length} maxLength={maxLength} />
			</div>

			{/* Submit */}
			<Button
				onClick={handleSubmit}
				disabled={isSubmitting || answer.trim().length === 0}
			>
				{isSubmitting ? "Submitting..." : "Submit Answer"}
			</Button>

			{/* Info */}
			<p className="text-sm text-muted-foreground">
				Your answer will be manually graded by an instructor. You'll receive XP
				once it's been reviewed.
			</p>
		</div>
	);
}
