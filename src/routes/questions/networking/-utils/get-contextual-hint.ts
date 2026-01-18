import type { Connection, PlacedItem } from "@/components/game/game-provider";

export interface NetworkState {
	placedItems: PlacedItem[];
	connections: Connection[];
	router: PlacedItem | undefined;
	pc1: PlacedItem | undefined;
	pc2: PlacedItem | undefined;
	connectedPcIds: Set<string>;
	routerConfigured: boolean;
	dhcpEnabled: boolean;
	ipRange: string | null;
	routerSettingsOpen: boolean;
	pc1HasIp: boolean;
	pc2HasIp: boolean;
}

const isValidIP = (ip: string): boolean => {
	const parts = ip.split(".");
	if (parts.length !== 4) return false;
	return parts.every((part) => {
		const num = Number.parseInt(part, 10);
		return !Number.isNaN(num) && num >= 0 && num <= 255;
	});
};

const parseIP = (ip: string): number => {
	const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
	return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
};

const calculateRange = (startIP: string, endIP: string): number => {
	return parseIP(endIP) - parseIP(startIP) + 1;
};

const extractIPRangeFromCidr = (
	cidr: string | null,
): { startIP: string; endIP: string } | null => {
	if (!cidr) return null;
	const match = cidr.match(/^(\d+\.\d+\.\d+)\.(\d+)\/(\d+)$/);
	if (!match) return null;
	const base = match[1];
	const lastOctet = Number.parseInt(match[2], 10);
	const prefix = Number.parseInt(match[3], 10);
	const hostBits = 32 - prefix;
	const numAddresses = 2 ** hostBits;
	return {
		startIP: `${base}.${lastOctet}`,
		endIP: `${base}.${Math.min(lastOctet + numAddresses - 1, 255)}`,
	};
};

export const getContextualHint = (state: NetworkState): string => {
	const {
		placedItems,
		connections,
		router,
		connectedPcIds,
		routerConfigured,
		dhcpEnabled,
		ipRange,
		routerSettingsOpen,
		pc1HasIp,
		pc2HasIp,
	} = state;

	const pcCount = placedItems.filter((item) => item.type === "pc").length;
	const routerCount = placedItems.filter(
		(item) => item.type === "router",
	).length;

	const hasPcToPcConnection = connections.some((c) => {
		const fromItem = placedItems.find(
			(item) => item.blockX === c.from.x && item.blockY === c.from.y,
		);
		const toItem = placedItems.find(
			(item) => item.blockX === c.to.x && item.blockY === c.to.y,
		);
		return fromItem?.type === "pc" && toItem?.type === "pc";
	});

	const hasRouterToRouterConnection = connections.some((c) => {
		const fromItem = placedItems.find(
			(item) => item.blockX === c.from.x && item.blockY === c.from.y,
		);
		const toItem = placedItems.find(
			(item) => item.blockX === c.to.x && item.blockY === c.to.y,
		);
		return fromItem?.type === "router" && toItem?.type === "router";
	});

	const cableCountByDevice = new Map<string, number>();
	for (const conn of connections) {
		const fromItem = placedItems.find(
			(item) => item.blockX === conn.from.x && item.blockY === conn.from.y,
		);
		const toItem = placedItems.find(
			(item) => item.blockX === conn.to.x && item.blockY === conn.to.y,
		);
		if (fromItem) {
			cableCountByDevice.set(
				fromItem.id,
				(cableCountByDevice.get(fromItem.id) || 0) + 1,
			);
		}
		if (toItem) {
			cableCountByDevice.set(
				toItem.id,
				(cableCountByDevice.get(toItem.id) || 0) + 1,
			);
		}
	}

	const hasDuplicateCableOnPC = Array.from(cableCountByDevice.entries()).some(
		([id, count]) => {
			const item = placedItems.find((p) => p.id === id);
			return item?.type === "pc" && count > 1;
		},
	);

	if (pcCount > 2) {
		return "❌ Only 2 PCs needed - remove the extra one";
	}

	if (routerCount > 1) {
		return "❌ Only 1 router needed - remove the extra one";
	}

	if (hasPcToPcConnection) {
		return "❌ PCs can't connect directly - connect them to the router instead";
	}

	if (hasRouterToRouterConnection) {
		return "❌ Both cable ends are on the router - connect one end to a PC";
	}

	if (hasDuplicateCableOnPC) {
		return "❌ This PC already has a cable - connect the other PC instead";
	}

	if (routerSettingsOpen && ipRange) {
		const range = extractIPRangeFromCidr(ipRange);
		if (range) {
			if (!isValidIP(range.startIP)) {
				return "❌ Invalid IP - each number must be between 0-255";
			}
			if (!isValidIP(range.endIP)) {
				return "❌ Invalid IP - each number must be between 0-255";
			}
			if (parseIP(range.startIP) > parseIP(range.endIP)) {
				return "❌ Start IP must be lower than End IP";
			}
			if (calculateRange(range.startIP, range.endIP) < 2) {
				return "❌ Range too small - you need at least 2 addresses for 2 PCs";
			}
		}
	}

	if (placedItems.length === 0) {
		return "Drag a PC from inventory to any slot to start";
	}

	if (pcCount === 1 && !router) {
		return "Add the second PC to another slot";
	}

	if (pcCount === 2 && !router) {
		return "Place the router in the middle slot to connect both PCs";
	}

	if (router && pcCount === 2 && connections.length === 0) {
		return "Connect PC-1 to the router using a cable";
	}

	if (connections.length === 1 && connectedPcIds.size === 1) {
		const connectedPcId = Array.from(connectedPcIds)[0];
		const otherPc = connectedPcId === "pc-1" ? "PC-2" : "PC-1";
		return `Connect ${otherPc} to the router with the second cable`;
	}

	if (
		connections.length === 2 &&
		connectedPcIds.size === 2 &&
		!routerSettingsOpen &&
		!routerConfigured
	) {
		return "⚠️ Physically connected but not working! Click the router to configure DHCP";
	}

	if (routerSettingsOpen && !dhcpEnabled) {
		return "Enable DHCP so the router can assign IP addresses";
	}

	if (routerSettingsOpen && dhcpEnabled && !ipRange) {
		return "Set IP range - Start: 192.168.1.100, End: 192.168.1.200";
	}

	if (routerSettingsOpen && dhcpEnabled && ipRange && !routerConfigured) {
		return "Click 'Apply' to activate DHCP";
	}

	if (routerConfigured && pc1HasIp && pc2HasIp) {
		return "🎉 Network configured! Both PCs can now communicate";
	}

	if (
		router &&
		!placedItems.find((item) => item.type === "router" && item.blockX === 2) &&
		connections.length === 0
	) {
		return "💡 Tip: Put the router in the center slot for easier connections";
	}

	return "";
};
