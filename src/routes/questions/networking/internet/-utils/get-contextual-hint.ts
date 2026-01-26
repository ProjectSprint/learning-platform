import type { Connection, PlacedItem } from "@/components/game/game-provider";

export interface InternetNetworkState {
	placedItems: PlacedItem[];
	connections: Connection[];
	pc: PlacedItem | undefined;
	cable: PlacedItem | undefined;
	routerLan: PlacedItem | undefined;
	routerNat: PlacedItem | undefined;
	routerWan: PlacedItem | undefined;
	fiber: PlacedItem | undefined;
	igw: PlacedItem | undefined;
	internet: PlacedItem | undefined;
	dns: PlacedItem | undefined;
	google: PlacedItem | undefined;
	allDevicesPlaced: boolean;
	routerLanConfigured: boolean;
	routerNatConfigured: boolean;
	routerWanConfigured: boolean;
	routerLanSettingsOpen: boolean;
	routerNatSettingsOpen: boolean;
	routerWanSettingsOpen: boolean;
	dhcpEnabled: boolean;
	natEnabled: boolean;
	startIp: string | null;
	endIp: string | null;
	dnsServer: string | null;
	connectionType: string | null;
	pppoeUsername: string | null;
	pppoePassword: string | null;
	pcHasIp: boolean;
	googleReachable: boolean;
}

const EXPECTED_ORDER = [
	"pc",
	"cable",
	"router-lan",
	"router-nat",
	"router-wan",
	"fiber",
	"igw",
	"internet",
	"dns",
	"google",
];

const isCorrectOrder = (placedItems: PlacedItem[]): boolean => {
	const sorted = [...placedItems].sort((a, b) => a.blockX - b.blockX);
	for (let i = 0; i < sorted.length; i++) {
		const expectedIndex = EXPECTED_ORDER.indexOf(sorted[i].type);
		if (i > 0) {
			const prevExpectedIndex = EXPECTED_ORDER.indexOf(sorted[i - 1].type);
			if (expectedIndex <= prevExpectedIndex) {
				return false;
			}
		}
	}
	return true;
};

export const getContextualHint = (state: InternetNetworkState): string => {
	const {
		placedItems,
		pc,
		cable,
		routerLan,
		routerNat,
		routerWan,
		fiber,
		igw,
		internet,
		dns,
		google,
		allDevicesPlaced,
		routerLanConfigured,
		routerNatConfigured,
		routerWanConfigured,
		routerLanSettingsOpen,
		routerNatSettingsOpen,
		routerWanSettingsOpen,
		dhcpEnabled,
		natEnabled,
		startIp,
		endIp,
		dnsServer,
		connectionType,
		pppoeUsername,
		googleReachable,
	} = state;

	if (routerWanConfigured && !dnsServer) {
		return "⚠️ You're connected to the internet but can't resolve domain names - set a DNS server in Router LAN";
	}

	if (dnsServer && !natEnabled && routerLanConfigured) {
		return "⚠️ DNS is configured but NAT is disabled - traffic can't leave your network";
	}

	if (placedItems.length === 0) {
		return "Drag the PC from inventory to the leftmost slot";
	}

	if (pc && !cable) {
		return "Connect the ethernet cable to the PC";
	}

	if (cable && !routerLan) {
		return "Place the Router (LAN) - this is where your home network starts";
	}

	if (routerLan && !routerNat) {
		return "Place the Router (NAT) - this translates your private IP";
	}

	if (routerNat && !routerWan) {
		return "Place the Router (WAN) - this connects to your ISP";
	}

	if (routerWan && !fiber) {
		return "Connect the fiber cable to the router's WAN side";
	}

	if (fiber && !igw) {
		return "Place the Internet Gateway - this is your ISP's modem";
	}

	if (igw && !internet) {
		return "Add the Internet cloud";
	}

	if (internet && !dns) {
		return "Place the DNS server - it translates domain names to IPs";
	}

	if (dns && !google) {
		return "Finally, place Google - your destination!";
	}

	if (allDevicesPlaced && !routerLanConfigured && !routerLanSettingsOpen) {
		return "Click Router (LAN) to configure DHCP and DNS settings";
	}

	if (routerLanSettingsOpen && !dhcpEnabled) {
		return "Enable DHCP so your PC can get an IP address";
	}

	if (routerLanSettingsOpen && dhcpEnabled && (!startIp || !endIp)) {
		return "Set the IP range (e.g., 192.168.1.100 to 192.168.1.200)";
	}

	if (routerLanSettingsOpen && dhcpEnabled && startIp && endIp && !dnsServer) {
		return "Set the DNS server (e.g., 8.8.8.8) so you can resolve domain names";
	}

	if (routerLanConfigured && !routerWanConfigured && !routerWanSettingsOpen) {
		return "Click Router (WAN) to configure your ISP connection";
	}

	if (routerWanSettingsOpen && !connectionType) {
		return "Select PPPoE as the connection type";
	}

	if (routerWanSettingsOpen && connectionType === "PPPoE" && !pppoeUsername) {
		return "Enter your ISP credentials (username: user@telkom.net)";
	}

	if (routerWanConfigured && !routerNatConfigured && !routerNatSettingsOpen) {
		return "Click Router (NAT) to enable address translation";
	}

	if (routerNatSettingsOpen && !natEnabled) {
		return "Enable NAT so your private IP can reach the internet";
	}

	if (placedItems.length > 1 && !isCorrectOrder(placedItems)) {
		return "❌ Devices must be connected in order: PC → Cable → Router LAN → Router NAT → Router WAN → Fiber → IGW → Internet → DNS → Google";
	}

	if (
		routerLanConfigured &&
		routerNatConfigured &&
		routerWanConfigured &&
		googleReachable
	) {
		return "🎉 You're connected to the internet! Try pinging Google";
	}

	return "";
};
