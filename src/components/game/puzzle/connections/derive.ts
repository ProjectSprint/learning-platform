// Connection derivation from cable placements

import type { Connection, PlacedItem } from "../../core/types";

export const CONNECTABLE_DEVICE_TYPES = new Set(["pc", "router"]);

export const isConnectableDevice = (item?: PlacedItem): boolean =>
	Boolean(item && CONNECTABLE_DEVICE_TYPES.has(item.type));

export const normalizeConnectionKey = (
	from: { x: number; y: number },
	to: { x: number; y: number },
): string => {
	if (from.y < to.y || (from.y === to.y && from.x <= to.x)) {
		return `${from.x},${from.y}-${to.x},${to.y}`;
	}
	return `${to.x},${to.y}-${from.x},${from.y}`;
};

export const deriveConnectionsFromCables = (
	placedItems: PlacedItem[],
): Connection[] => {
	const byCoord = new Map<string, PlacedItem>();
	placedItems.forEach((item) => {
		byCoord.set(`${item.blockX}-${item.blockY}`, item);
	});

	const connections: Connection[] = [];
	const seen = new Set<string>();

	const maybeAddConnection = (from: PlacedItem, to: PlacedItem) => {
		if (!isConnectableDevice(from) || !isConnectableDevice(to)) {
			return;
		}

		if (from.type === to.type) {
			return;
		}

		const fromCoord = { x: from.blockX, y: from.blockY };
		const toCoord = { x: to.blockX, y: to.blockY };
		const key = normalizeConnectionKey(fromCoord, toCoord);
		if (seen.has(key)) {
			return;
		}

		seen.add(key);
		connections.push({
			id: `connection-${key}-link`,
			type: "cable",
			from: fromCoord,
			to: toCoord,
		});
	};

	placedItems
		.filter((item) => item.type === "cable")
		.forEach((cable) => {
			const left = byCoord.get(`${cable.blockX - 1}-${cable.blockY}`);
			const right = byCoord.get(`${cable.blockX + 1}-${cable.blockY}`);
			const up = byCoord.get(`${cable.blockX}-${cable.blockY - 1}`);
			const down = byCoord.get(`${cable.blockX}-${cable.blockY + 1}`);

			if (left && right) {
				maybeAddConnection(left, right);
			}

			if (up && down) {
				maybeAddConnection(up, down);
			}
		});

	return connections;
};
