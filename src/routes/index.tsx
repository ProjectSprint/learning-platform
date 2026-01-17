import { createFileRoute } from "@tanstack/react-router";

import { NetworkingQuestion } from "./questions/networking/-page";

export const Route = createFileRoute("/")({
	component: NetworkingQuestion,
});
