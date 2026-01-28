// Inventory validation and normalization utilities

import type {
	InventoryGroup,
	InventoryGroupConfig,
	InventoryItem,
} from "../core/types";
import { MAX_INVENTORY_ITEMS } from "./sanitize";

export const DEFAULT_INVENTORY_GROUP_ID = "default";
export const DEFAULT_INVENTORY_TITLE = "Inventory";

export const normalizeInventory = (items: InventoryItem[]): InventoryItem[] =>
	items
		.filter(
			(item) =>
				item && typeof item.id === "string" && typeof item.type === "string",
		)
		.slice(0, MAX_INVENTORY_ITEMS);

export const normalizeInventoryGroup = (
	group: InventoryGroupConfig,
	usedIds: Set<string>,
): InventoryGroup | null => {
	if (!group || typeof group.id !== "string") {
		return null;
	}

	const normalizedItems = normalizeInventory(group.items ?? []).filter(
		(item) => {
			if (usedIds.has(item.id)) {
				return false;
			}
			usedIds.add(item.id);
			return true;
		},
	);

	return {
		id: group.id,
		title:
			typeof group.title === "string" && group.title.trim().length > 0
				? group.title
				: DEFAULT_INVENTORY_TITLE,
		visible: group.visible ?? true,
		items: normalizedItems,
	};
};

export const normalizeInventoryGroups = (
	inventoryGroups: InventoryGroupConfig[] | undefined,
): InventoryGroup[] => {
	const usedIds = new Set<string>();
	const groups: InventoryGroup[] = [];

	if (Array.isArray(inventoryGroups)) {
		for (const group of inventoryGroups) {
			const normalized = normalizeInventoryGroup(group, usedIds);
			if (!normalized) {
				continue;
			}
			if (groups.some((existing) => existing.id === normalized.id)) {
				continue;
			}
			groups.push(normalized);
		}
	}

	if (groups.length === 0) {
		groups.push({
			id: DEFAULT_INVENTORY_GROUP_ID,
			title: DEFAULT_INVENTORY_TITLE,
			visible: true,
			items: [],
		});
	}

	return groups;
};

export const findInventoryItem = (
	groups: InventoryGroup[],
	itemId: string,
): { groupIndex: number; itemIndex: number; item: InventoryItem } | null => {
	for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
		const itemIndex = groups[groupIndex].items.findIndex(
			(item) => item.id === itemId,
		);
		if (itemIndex >= 0) {
			return {
				groupIndex,
				itemIndex,
				item: groups[groupIndex].items[itemIndex],
			};
		}
	}
	return null;
};
