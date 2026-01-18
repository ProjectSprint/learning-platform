import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { DnsQuestion } from "./-page";

const DnsQuestionRoute = () => {
	const navigate = useNavigate();

	const handleQuestionComplete = () => {
		void navigate({ to: "/questions/networking" });
	};

	return <DnsQuestion onQuestionComplete={handleQuestionComplete} />;
};

export const Route = createFileRoute("/questions/networking/dns/")({
	component: DnsQuestionRoute,
});
