import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	getNextQuestionPath,
	markNetworkingQuestionComplete,
} from "../-utils/module-progress";
import { TcpQuestion } from "./-page";

const TcpQuestionRoute = () => {
	const navigate = useNavigate();

	const handleQuestionComplete = () => {
		markNetworkingQuestionComplete("tcp");
		const nextPath = getNextQuestionPath("tcp");
		void navigate({ to: nextPath ?? "/questions/networking" });
	};

	return <TcpQuestion onQuestionComplete={handleQuestionComplete} />;
};

export const Route = createFileRoute("/questions/networking/tcp/")({
	component: TcpQuestionRoute,
});
