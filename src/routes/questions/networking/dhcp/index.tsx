import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { DhcpQuestion } from "./-page";

const DhcpQuestionRoute = () => {
	const navigate = useNavigate();

	const handleQuestionComplete = () => {
		void navigate({ to: "/questions/networking" });
	};

	return <DhcpQuestion onQuestionComplete={handleQuestionComplete} />;
};

export const Route = createFileRoute("/questions/networking/dhcp/")({
	component: DhcpQuestionRoute,
});
