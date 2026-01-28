import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { UdpQuestion } from "./-page";
import {
	getNextQuestionPath,
	markNetworkingQuestionComplete,
} from "../-utils/module-progress";

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
