import type { SpaceItemLocation } from "@/components/game/engine/game-provider";

export { isPrivateIp, isPublicIp, isValidIp } from "../../-utils/network-utils";

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
	const isDefinedSpaceItem = (
		item: SpaceItemLocation | undefined,
	): item is SpaceItemLocation => item !== undefined;

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

	const placedDevices = devices.filter(isDefinedSpaceItem);

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
