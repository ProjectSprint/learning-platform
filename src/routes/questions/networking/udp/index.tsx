import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	getNextQuestionPath,
	markNetworkingQuestionComplete,
} from "../-utils/module-progress";
import { UdpQuestion } from "./-page";

const UdpQuestionRoute = () => {
	const navigate = useNavigate();

	const handleQuestionComplete = () => {
		markNetworkingQuestionComplete("udp");
		const nextPath = getNextQuestionPath("udp");
		void navigate({ to: nextPath ?? "/questions/networking" });
	};

	return <UdpQuestion onQuestionComplete={handleQuestionComplete} />;
};

export const Route = createFileRoute("/questions/networking/udp/")({
	component: UdpQuestionRoute,
});
