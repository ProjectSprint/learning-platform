import type { TooltipInfo } from "@/components/game/inventory";

export const INVENTORY_TOOLTIPS: Record<string, TooltipInfo> = {
	cable: {
		content:
			"Ethernet cables connect devices in a network, enabling data transfer between computers and routers.",
		seeMoreHref: "https://www.google.com/search?q=what+is+ethernet+cable",
	},
	router: {
		content:
			"A router connects multiple devices in a network and directs traffic between them.",
		seeMoreHref: "https://www.google.com/search?q=what+is+a+router",
	},
};
