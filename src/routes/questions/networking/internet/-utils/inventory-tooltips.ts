import type { TooltipInfo } from "@/components/game/inventory";

export const INVENTORY_TOOLTIPS: Record<string, TooltipInfo> = {
	cable: {
		content: "Ethernet cable connects your PC to the router's LAN port",
		seeMoreHref: "https://www.google.com/search?q=what+is+ethernet+cable",
	},
	"router-lan": {
		content:
			"The LAN (Local Area Network) side of the router. Assigns private IP addresses to devices via DHCP and configures which DNS server to use.",
		seeMoreHref: "https://www.google.com/search?q=what+is+router+LAN",
	},
	"router-nat": {
		content:
			"NAT (Network Address Translation) translates private IP addresses to the public IP address so multiple devices can share one internet connection.",
		seeMoreHref:
			"https://www.google.com/search?q=what+is+NAT+network+address+translation",
	},
	"router-wan": {
		content:
			"The WAN (Wide Area Network) side of the router. Connects to your ISP using PPPoE authentication to get a public IP address.",
		seeMoreHref: "https://www.google.com/search?q=what+is+router+WAN+PPPoE",
	},
	fiber: {
		content: "Fiber optic cable provides high-speed connection to your ISP",
		seeMoreHref: "https://www.google.com/search?q=what+is+fiber+optic+internet",
	},
	igw: {
		content: "Internet Gateway (modem) connects your home to the ISP's network",
		seeMoreHref: "https://www.google.com/search?q=what+is+internet+gateway",
	},
	internet: {
		content: "The global network of interconnected computers",
		seeMoreHref: "https://www.google.com/search?q=how+does+the+internet+work",
	},
	dns: {
		content: "DNS Server translates domain names (google.com) to IP addresses",
		seeMoreHref: "https://www.google.com/search?q=what+is+DNS",
	},
	google: {
		content: "Google's server - your destination!",
		seeMoreHref: "https://www.google.com/search?q=how+do+websites+work",
	},
};
