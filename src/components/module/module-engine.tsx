import { Box } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import type { ModuleConfig } from "./module-types";
import { ProgressHeader } from "./progress-header";

type ModuleEngineProps = {
	config: ModuleConfig;
	onExit: () => void;
	onComplete: () => void;
};

export const ModuleEngine = ({
	config,
	onExit,
	onComplete,
}: ModuleEngineProps) => {
	const [currentIndex, setCurrentIndex] = useState(0);

	const handleQuestionComplete = useCallback(() => {
		const nextIndex = currentIndex + 1;
		if (nextIndex >= config.questions.length) {
			onComplete();
			return;
		}
		setCurrentIndex(nextIndex);
	}, [currentIndex, config.questions.length, onComplete]);

	const currentQuestion = config.questions[currentIndex];
	if (!currentQuestion) {
		return null;
	}

	const QuestionComponent = currentQuestion.component;

	return (
		<Box display="flex" flexDirection="column" height="100vh" bg="gray.950">
			<ProgressHeader
				progress={{
					currentIndex,
					totalQuestions: config.questions.length,
				}}
				onExit={onExit}
			/>
			<Box flex="1" overflow="auto">
				<QuestionComponent
					key={currentQuestion.id}
					onQuestionComplete={handleQuestionComplete}
				/>
			</Box>
		</Box>
	);
};
