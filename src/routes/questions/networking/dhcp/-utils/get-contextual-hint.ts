import type { SpaceItemLocation } from "@/components/game/engine/game-provider";
import {
	calculateIpRangeSize,
	isValidIp,
	parseIpToNumber,
} from "../../-utils/network-utils";
import type { DeviceConnection } from "./network-utils";

export interface NetworkState {
	placedItems: SpaceItemLocation[];
	connections: DeviceConnection[];
	router: SpaceItemLocation | undefined;
	pc1: SpaceItemLocation | undefined;
	pc2: SpaceItemLocation | undefined;
	connectedPcIds: Set<string>;
	routerConfigured: boolean;
	dhcpEnabled: boolean;
	startIp: string | null;
	endIp: string | null;
	routerSettingsOpen: boolean;
	pc1HasIp: boolean;
	pc2HasIp: boolean;
}

export const getContextualHint = (state: NetworkState): string => {
	const {
		placedItems,
		connections,
		router,
		connectedPcIds,
		routerConfigured,
		dhcpEnabled,
		startIp,
		endIp,
		routerSettingsOpen,
		pc1HasIp,
		pc2HasIp,
	} = state;

	const pcCount = placedItems.filter((item) => item.type === "pc").length;
	const routerCount = placedItems.filter(
		(item) => item.type === "router",
	).length;

	const hasPcToPcConnection = connections.some((c) => {
		const fromItem = placedItems.find((item) => item.id === c.fromId);
		const toItem = placedItems.find((item) => item.id === c.toId);
		return fromItem?.type === "pc" && toItem?.type === "pc";
	});

	const hasRouterToRouterConnection = connections.some((c) => {
		const fromItem = placedItems.find((item) => item.id === c.fromId);
		const toItem = placedItems.find((item) => item.id === c.toId);
		return fromItem?.type === "router" && toItem?.type === "router";
	});

	const cableCountByDevice = new Map<string, number>();
	for (const conn of connections) {
		const fromItem = placedItems.find((item) => item.id === conn.fromId);
		const toItem = placedItems.find((item) => item.id === conn.toId);
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

	// Validate IP range when router settings are open
	if (routerSettingsOpen && startIp && endIp) {
		if (!isValidIp(startIp)) {
			return "❌ Invalid start IP - each number must be between 0-255";
		}
		if (!isValidIp(endIp)) {
			return "❌ Invalid end IP - each number must be between 0-255";
		}
		if (parseIpToNumber(startIp) > parseIpToNumber(endIp)) {
			return "❌ Start IP must be lower than End IP";
		}
		if (calculateIpRangeSize(startIp, endIp) < 2) {
			return "❌ Range too small - you need at least 2 addresses for 2 PCs";
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

	if (routerSettingsOpen && dhcpEnabled && !startIp) {
		return "Set the start IP address (e.g., 192.168.1.100)";
	}

	if (routerSettingsOpen && dhcpEnabled && startIp && !endIp) {
		return "Set the end IP address (e.g., 192.168.1.200)";
	}

	if (
		routerSettingsOpen &&
		dhcpEnabled &&
		startIp &&
		endIp &&
		!routerConfigured
	) {
		return "Click 'Save' to activate DHCP";
	}

	if (routerConfigured && pc1HasIp && pc2HasIp) {
		return "🎉 Network configured! Both PCs can now communicate";
	}

	if (router && connections.length === 0) {
		return "💡 Tip: Add cables on both connectors to link the PCs to the router";
	}

	return "";
};
