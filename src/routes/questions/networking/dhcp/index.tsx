import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	getNextQuestionPath,
	markNetworkingQuestionComplete,
} from "../-utils/module-progress";
import { DhcpQuestion } from "./-page";

const DhcpQuestionRoute = () => {
	const navigate = useNavigate();

	const handleQuestionComplete = () => {
		markNetworkingQuestionComplete("dhcp");
		const nextPath = getNextQuestionPath("dhcp");
		void navigate({ to: nextPath ?? "/questions/networking" });
	};

	return <DhcpQuestion onQuestionComplete={handleQuestionComplete} />;
};

export const Route = createFileRoute("/questions/networking/dhcp/")({
	component: DhcpQuestionRoute,
});
