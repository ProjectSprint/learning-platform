// Route for webserver-ssl question
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { WebserverSslQuestion } from "./-page";

const WebserverSslQuestionRoute = () => {
	const navigate = useNavigate();

	const handleQuestionComplete = () => {
		void navigate({ to: "/questions/networking" });
	};

	return <WebserverSslQuestion onQuestionComplete={handleQuestionComplete} />;
};

export const Route = createFileRoute("/questions/networking/webserver-ssl/")({
	component: WebserverSslQuestionRoute,
});