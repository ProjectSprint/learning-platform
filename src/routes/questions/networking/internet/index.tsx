import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { InternetQuestion } from "./-page";

const InternetQuestionRoute = () => {
	const navigate = useNavigate();

	const handleQuestionComplete = () => {
		void navigate({ to: "/questions/networking" });
	};

	return <InternetQuestion onQuestionComplete={handleQuestionComplete} />;
};

export const Route = createFileRoute("/questions/networking/internet/")({
	component: InternetQuestionRoute,
});
