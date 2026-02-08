import {
	DEFAULT_POOL_GROUP_ID,
	DEFAULT_POOL_TITLE,
	findPoolItem,
	normalizePoolGroups,
} from "../../domain/validation/pool";
import type { GameAction } from "../actions";
import type {
	GameState,
	InventoryGroup,
	SpaceConfig,
	SpaceItemLocation,
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
				id: DEFAULT_POOL_GROUP_ID,
				title: DEFAULT_POOL_TITLE,
				visible: true,
				items: [],
			},
		],
	},
	space: createSpaceState(defaultSpaceConfig),
	arrows: [],
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
	const placedItems: SpaceItemLocation[] = [];
	placements.forEach((placement) => {
		if (!nextBlocks[placement.blockY]?.[placement.blockX]) {
			return;
		}

		if (nextBlocks[placement.blockY][placement.blockX].status === "occupied") {
			return;
		}

		const itemId = placement.itemId;
		const inventoryMatch = findPoolItem(nextInventoryGroups, itemId);
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
			const entries = Object.values(config.spaces);
			if (entries.length === 0) {
				return state;
			}

			const spaceIds = new Set<string>();
			const normalizedSpaces: Array<{ key: string; config: SpaceConfig }> = [];
			for (const spaceConfig of entries) {
				const resolvedKey = spaceConfig.id;
				if (spaceIds.has(resolvedKey)) {
					return state;
				}
				spaceIds.add(resolvedKey);
				normalizedSpaces.push({ key: resolvedKey, config: spaceConfig });
			}

			let inventoryGroups = normalizePoolGroups(config.inventoryGroups);
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

			return {
				...createDefaultState(),
				phase: config.phase ?? "setup",
				inventory: { groups: inventoryGroups },
				space: firstSpace,
				spaces: nextSpaces,
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
