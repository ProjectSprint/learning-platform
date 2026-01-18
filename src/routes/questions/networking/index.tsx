import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { NetworkingQuestion } from "./-page";

const NetworkingQuestionRoute = () => {
	const navigate = useNavigate();

	const handleQuestionComplete = () => {
		void navigate({ to: "/" });
	};

	return <NetworkingQuestion onQuestionComplete={handleQuestionComplete} />;
};

export const Route = createFileRoute("/questions/networking/")({
	component: NetworkingQuestionRoute,
});
