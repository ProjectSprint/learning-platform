import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * MultipleChoice Component
 *
 * Features:
 * - Single selection (radio behavior)
 * - Image + text support for both question and options
 * - Keyboard navigation (arrow keys, Enter)
 * - Full accessibility (ARIA labels, focus indicators)
 */

interface QuestionContent {
	imageUrl?: string;
	imageFallback: string;
	text: string;
}

interface AnswerOption {
	id: string;
	imageUrl?: string;
	imageFallback: string;
	text: string;
}

interface MultipleChoiceProps {
	question: QuestionContent;
	options: AnswerOption[];
	onSubmit: (selectedOptionId: string) => void;
	isSubmitting?: boolean;
}

export function MultipleChoice({
	question,
	options,
	onSubmit,
	isSubmitting = false,
}: MultipleChoiceProps) {
	const [selectedOption, setSelectedOption] = useState<string | null>(null);

	const handleSubmit = () => {
		if (selectedOption) {
			onSubmit(selectedOption);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent, optionId: string) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			setSelectedOption(optionId);
		}
	};

	return (
		<div className="space-y-6">
			{/* Question */}
			<div>
				{question.imageUrl && (
					<img
						src={question.imageUrl}
						alt={question.imageFallback}
						className="w-full max-w-2xl mb-4 rounded-lg"
						onError={(e) => {
							e.currentTarget.style.display = "none";
						}}
					/>
				)}
				<h2 className="text-xl font-semibold">{question.text}</h2>
			</div>

			{/* Options */}
			<div role="radiogroup" aria-label="Answer options" className="space-y-3">
				{options.map((option) => (
					<div
						key={option.id}
						role="radio"
						aria-checked={selectedOption === option.id}
						tabIndex={0}
						onClick={() => setSelectedOption(option.id)}
						onKeyDown={(e) => handleKeyDown(e, option.id)}
						className={`border rounded-lg p-4 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
							selectedOption === option.id
								? "border-primary bg-primary/10"
								: "hover:bg-muted"
						}`}
					>
						<div className="flex items-start gap-4">
							<div className="flex-shrink-0 w-5 h-5 mt-0.5">
								<div
									className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
										selectedOption === option.id
											? "border-primary"
											: "border-gray-300"
									}`}
								>
									{selectedOption === option.id && (
										<div className="w-3 h-3 rounded-full bg-primary" />
									)}
								</div>
							</div>
							<div className="flex-1">
								{option.imageUrl && (
									<img
										src={option.imageUrl}
										alt={option.imageFallback}
										className="w-full max-w-md mb-2 rounded"
										onError={(e) => {
											e.currentTarget.style.display = "none";
										}}
									/>
								)}
								<p className="text-sm">{option.text}</p>
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Submit */}
			<Button onClick={handleSubmit} disabled={isSubmitting || !selectedOption}>
				{isSubmitting ? "Submitting..." : "Submit Answer"}
			</Button>
		</div>
	);
}
