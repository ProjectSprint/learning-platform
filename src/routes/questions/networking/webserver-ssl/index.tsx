// Route for webserver-ssl question
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	getNextQuestionPath,
	markNetworkingQuestionComplete,
} from "../-utils/module-progress";
import { WebserverSslQuestion } from "./-page";

const WebserverSslQuestionRoute = () => {
	const navigate = useNavigate();

	const handleQuestionComplete = () => {
		markNetworkingQuestionComplete("webserver-ssl");
		const nextPath = getNextQuestionPath("webserver-ssl");
		void navigate({ to: nextPath ?? "/questions/networking" });
	};

	return <WebserverSslQuestion onQuestionComplete={handleQuestionComplete} />;
};

export const Route = createFileRoute("/questions/networking/webserver-ssl/")({
	component: WebserverSslQuestionRoute,
});
