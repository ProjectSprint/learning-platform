import { createFileRoute, useNavigate } from "@tanstack/react-router";

import {
	getNextQuestionPath,
	markSoftwareQuestionComplete,
} from "../-utils/module-progress";
import { CoresAndThreadsQuestion } from "./-page";

const CoresAndThreadsRoute = () => {
	const navigate = useNavigate();

	const handleQuestionComplete = () => {
		markSoftwareQuestionComplete("cores-and-threads");
		const nextPath = getNextQuestionPath("cores-and-threads");
		void navigate({ to: nextPath ?? "/questions/software" });
	};

	return (
		<CoresAndThreadsQuestion onQuestionComplete={handleQuestionComplete} />
	);
};

export const Route = createFileRoute("/questions/software/cores-and-threads/")({
	component: CoresAndThreadsRoute,
});
