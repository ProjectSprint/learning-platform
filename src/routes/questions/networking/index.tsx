import { createFileRoute } from "@tanstack/react-router";

import { NetworkingModulePage } from "./-page";

export const Route = createFileRoute("/questions/networking/")({
	component: NetworkingModulePage,
});
