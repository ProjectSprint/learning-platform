import type { SpaceItemLocation } from "@/components/game/engine/game-provider";

export const PRIVATE_IP_RANGES = [
	/^10\./,
	/^172\.(1[6-9]|2\d|3[01])\./,
	/^192\.168\./,
];

export const isValidIp = (ip: string): boolean => {
	const parts = ip.split(".");
	if (parts.length !== 4) return false;
	return parts.every((part) => {
		const num = Number.parseInt(part, 10);
		return !Number.isNaN(num) && num >= 0 && num <= 255 && part === String(num);
	});
};

export const isPrivateIp = (ip: string): boolean => {
	return PRIVATE_IP_RANGES.some((range) => range.test(ip));
};

export const isPublicIp = (ip: string): boolean => {
	if (!isValidIp(ip)) return false;
	return !isPrivateIp(ip);
};

export const parseIpToNumber = (ip: string): number => {
	const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
	return (
		((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
	);
};

export const parseIpRangeBase = (startIp?: string | null): string | null => {
	if (!startIp || !isValidIp(startIp) || !isPrivateIp(startIp)) {
		return null;
	}

	const octets = startIp.split(".").map((value) => Number.parseInt(value, 10));
	return `${octets[0]}.${octets[1]}.${octets[2]}`;
};

export const calculateIpRangeSize = (
	startIp: string,
	endIp: string,
): number => {
	if (!isValidIp(startIp) || !isValidIp(endIp)) {
		return 0;
	}
	const start = parseIpToNumber(startIp);
	const end = parseIpToNumber(endIp);
	if (end < start) {
		return 0;
	}
	return end - start + 1;
};

export const validateIpRange = (
	startIp: string,
	endIp: string,
): { isValid: boolean; error?: string } => {
	if (!isValidIp(startIp)) {
		return { isValid: false, error: "Invalid start IP format." };
	}
	if (!isValidIp(endIp)) {
		return { isValid: false, error: "Invalid end IP format." };
	}
	if (!isPrivateIp(startIp)) {
		return { isValid: false, error: "Start IP must be a private IP." };
	}
	if (!isPrivateIp(endIp)) {
		return { isValid: false, error: "End IP must be a private IP." };
	}

	const startNum = parseIpToNumber(startIp);
	const endNum = parseIpToNumber(endIp);

	if (endNum < startNum) {
		return { isValid: false, error: "End IP must be greater than start IP." };
	}

	const rangeSize = endNum - startNum + 1;
	if (rangeSize < 2) {
		return { isValid: false, error: "Range must have at least 2 addresses." };
	}

	return { isValid: true };
};

export interface InternetNetworkSnapshot {
	pc: SpaceItemLocation | undefined;
	cable: SpaceItemLocation | undefined;
	routerLan: SpaceItemLocation | undefined;
	routerNat: SpaceItemLocation | undefined;
	routerWan: SpaceItemLocation | undefined;
	fiber: SpaceItemLocation | undefined;
	igw: SpaceItemLocation | undefined;
	dns: SpaceItemLocation | undefined;
	google: SpaceItemLocation | undefined;
	pcConnectedToRouterLan: boolean;
	routerWanConnectedToIgw: boolean;
	isFullyConnected: boolean;
	connectionErrors: string[];
}

export const buildInternetNetworkSnapshot = (
	placedItems: SpaceItemLocation[],
): InternetNetworkSnapshot => {
	const pc = placedItems.find((item) => item.type === "pc");
	const cable = placedItems.find((item) => item.type === "cable");
	const routerLan = placedItems.find((item) => item.type === "router-lan");
	const routerNat = placedItems.find((item) => item.type === "router-nat");
	const routerWan = placedItems.find((item) => item.type === "router-wan");
	const fiber = placedItems.find((item) => item.type === "fiber");
	const igw = placedItems.find((item) => item.type === "igw");
	const dns = placedItems.find((item) => item.type === "dns");
	const google = placedItems.find((item) => item.type === "google");

	const devices = [
		pc,
		cable,
		routerLan,
		routerNat,
		routerWan,
		fiber,
		igw,
		dns,
		google,
	];

	const connectionErrors: string[] = [];
	let isFullyConnected = true;

	const placedDevices = devices.filter(Boolean) as SpaceItemLocation[];

	if (placedDevices.length !== devices.length) {
		isFullyConnected = false;
	}

	// Check if PC is connected to Router LAN via cable
	// With separate spaces, we just check that all required items are placed
	let pcConnectedToRouterLan = false;
	if (pc && cable && routerLan) {
		pcConnectedToRouterLan = true;
	}

	// Check if Router WAN is connected to IGW via fiber
	// With separate spaces, we just check that all required items are placed
	let routerWanConnectedToIgw = false;
	if (routerWan && fiber && igw) {
		routerWanConnectedToIgw = true;
	}

	return {
		pc,
		cable,
		routerLan,
		routerNat,
		routerWan,
		fiber,
		igw,
		dns,
		google,
		pcConnectedToRouterLan,
		routerWanConnectedToIgw,
		isFullyConnected,
		connectionErrors,
	};
};
