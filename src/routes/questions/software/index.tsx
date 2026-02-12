import { createFileRoute } from "@tanstack/react-router";

import { SoftwareModulePage } from "./-page";

export const Route = createFileRoute("/questions/software/")({
	component: SoftwareModulePage,
});
