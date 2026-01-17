import { createFileRoute } from "@tanstack/react-router";

import { NetworkingQuestion } from "./-page";

export const Route = createFileRoute("/questions/networking/")({
	component: NetworkingQuestion,
});
