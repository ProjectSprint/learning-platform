import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	getNextQuestionPath,
	markNetworkingQuestionComplete,
} from "../-utils/module-progress";
import { InternetQuestion } from "./-page";

const InternetQuestionRoute = () => {
	const navigate = useNavigate();

	const handleQuestionComplete = () => {
		markNetworkingQuestionComplete("internet");
		const nextPath = getNextQuestionPath("internet");
		void navigate({ to: nextPath ?? "/questions/networking" });
	};

	return <InternetQuestion onQuestionComplete={handleQuestionComplete} />;
};

export const Route = createFileRoute("/questions/networking/internet/")({
	component: InternetQuestionRoute,
});
