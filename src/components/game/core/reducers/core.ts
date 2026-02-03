import {
	DEFAULT_INVENTORY_GROUP_ID,
	DEFAULT_INVENTORY_TITLE,
	findInventoryItem,
	normalizeInventoryGroups,
} from "../../domain/validation/inventory";
import type { GameAction } from "../actions";
import type {
	BoardItemLocation,
	GameState,
	InventoryGroup,
	SpaceConfig,
	SpaceState,
} from "../types";
import { updateBlock } from "./legacy-utils";
import { createSpaceState } from "./puzzle-state";

const defaultSpaceConfig: SpaceConfig = {
	id: "default-space",
	size: { base: [6, 4] },
	orientation: "horizontal",
};

export const createDefaultState = (): GameState => ({
	phase: "setup",
	inventory: {
		groups: [
			{
				id: DEFAULT_INVENTORY_GROUP_ID,
				title: DEFAULT_INVENTORY_TITLE,
				visible: true,
				items: [],
			},
		],
	},
	space: createSpaceState(defaultSpaceConfig),
	arrows: [],
	terminal: {
		visible: false,
		prompt: "",
		history: [],
	},
	hint: {
		visible: false,
		content: null,
	},
	overlay: {
		modals: {},
	},
	question: {
		id: "",
		status: "in_progress",
	},
	sequence: 0,
});

const applyInitialPlacements = (
	space: SpaceState,
	inventoryGroups: InventoryGroup[],
): { space: SpaceState; inventoryGroups: InventoryGroup[] } => {
	const placements = space.config.initialPlacements ?? [];
	if (placements.length === 0) {
		return { space, inventoryGroups };
	}

	let nextBlocks = space.blocks;
	const nextInventoryGroups = inventoryGroups;
	const placedItems: BoardItemLocation[] = [];
	placements.forEach((placement) => {
		if (!nextBlocks[placement.blockY]?.[placement.blockX]) {
			return;
		}

		if (nextBlocks[placement.blockY][placement.blockX].status === "occupied") {
			return;
		}

		const itemId = placement.itemId;
		const inventoryMatch = findInventoryItem(nextInventoryGroups, itemId);
		const matchedItem = inventoryMatch?.item;

		if (!matchedItem) {
			return;
		}

		placedItems.push({
			id: itemId,
			itemId,
			type: matchedItem.type,
			blockX: placement.blockX,
			blockY: placement.blockY,
			status: placement.status ?? "normal",
			icon: matchedItem?.icon,
			data: placement.data ?? matchedItem?.data ?? {},
		});

		nextBlocks = updateBlock(nextBlocks, placement.blockX, placement.blockY, {
			status: "occupied",
			itemId,
		});
	});

	return {
		space: {
			...space,
			blocks: nextBlocks,
			placedItems,
		},
		inventoryGroups: nextInventoryGroups,
	};
};

export const coreReducer = (
	state: GameState,
	action: GameAction,
): GameState => {
	switch (action.type) {
		case "INIT_MULTI_SPACE": {
			const config = action.payload;
			const entries = Object.entries(config.spaces);
			if (entries.length === 0) {
				return state;
			}

			const spaceIds = new Set<string>();
			const normalizedSpaces: Array<{ key: string; config: SpaceConfig }> = [];
			for (const [entryKey, spaceConfig] of entries) {
				const resolvedKey = spaceConfig.spaceId ?? entryKey;
				if (spaceIds.has(resolvedKey)) {
					return state;
				}
				spaceIds.add(resolvedKey);
				normalizedSpaces.push({ key: resolvedKey, config: spaceConfig });
			}

			let inventoryGroups = normalizeInventoryGroups(config.inventoryGroups);
			const nextSpaces: Record<string, SpaceState> = {};

			for (const entry of normalizedSpaces) {
				const key = entry.key;
				const spaceConfig = entry.config;
				const seeded = applyInitialPlacements(
					createSpaceState(spaceConfig),
					inventoryGroups,
				);
				inventoryGroups = seeded.inventoryGroups;
				nextSpaces[key] = seeded.space;
			}

			const firstKey = normalizedSpaces[0]?.key;
			if (!firstKey) {
				return state;
			}
			const firstSpace = nextSpaces[firstKey];
			if (!firstSpace) {
				return state;
			}

			const terminal = {
				...state.terminal,
				...config.terminal,
			};

			return {
				...createDefaultState(),
				phase: config.phase ?? "setup",
				inventory: { groups: inventoryGroups },
				space: firstSpace,
				spaces: nextSpaces,
				terminal: {
					visible: terminal.visible ?? false,
					prompt: terminal.prompt ?? "",
					history: terminal.history ?? [],
				},
				question: {
					id: config.questionId,
					status: config.questionStatus ?? "in_progress",
				},
			};
		}
		case "SET_PHASE":
			return {
				...state,
				phase: action.payload.phase,
			};
		case "COMPLETE_QUESTION":
			return {
				...state,
				phase: "completed",
				question: { ...state.question, status: "completed" },
			};
		default:
			return state;
	}
};
