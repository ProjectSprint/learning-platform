export const getInternetItemLabel = (itemType: string): string => {
	switch (itemType) {
		case "pc":
			return "PC";
		case "cable":
			return "Ethernet Cable";
		case "router-lan":
			return "Router (LAN)";
		case "router-nat":
			return "Router (NAT)";
		case "router-wan":
			return "Router (WAN)";
		case "fiber":
			return "Fiber Cable";
		case "igw":
			return "Internet Gateway";
		case "dns":
			return "DNS Server";
		case "google":
			return "Google";
		default:
			return itemType.charAt(0).toUpperCase() + itemType.slice(1);
	}
};
