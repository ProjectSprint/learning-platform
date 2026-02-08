import type { QuestionDefinition } from "@/components/game/runtime";
import {
	BASIC_INVENTORY_ITEMS,
	INVENTORY_POOL_CONFIG,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
	SPACE_CONFIGS,
	SSL_ITEMS_INVENTORY,
	SSL_ITEMS_POOL_CONFIG,
	SSL_SETUP_INVENTORY_ITEMS,
	SSL_SETUP_POOL_CONFIG,
} from "./constants";

export const SSL_DEFINITION: QuestionDefinition = {
	meta: {
		id: QUESTION_ID,
		title: QUESTION_TITLE,
		description: QUESTION_DESCRIPTION,
	},
	initialPhase: "setup",
	spaces: [
		...Object.values(SPACE_CONFIGS).map((config) => ({
			kind: "grid" as const,
			config,
		})),
		{ kind: "pool" as const, config: INVENTORY_POOL_CONFIG },
		{ kind: "pool" as const, config: SSL_SETUP_POOL_CONFIG },
		{ kind: "pool" as const, config: SSL_ITEMS_POOL_CONFIG },
	],
	entities: [
		...BASIC_INVENTORY_ITEMS.map((item) => ({
			config: {
				id: item.id,
				name: item.name,
				icon: item.icon,
				tooltip: item.tooltip,
				allowedPlaces: item.allowedPlaces,
				data: { ...item.data, type: item.type },
			},
			initialSpace: "inventory",
		})),
		...SSL_SETUP_INVENTORY_ITEMS.map((item) => ({
			config: {
				id: item.id,
				name: item.name,
				icon: item.icon,
				tooltip: item.tooltip,
				allowedPlaces: item.allowedPlaces,
				data: { ...item.data, type: item.type },
			},
		})),
		...SSL_ITEMS_INVENTORY.map((item) => ({
			config: {
				id: item.id,
				name: item.name,
				icon: item.icon,
				tooltip: item.tooltip,
				allowedPlaces: item.allowedPlaces,
				data: { ...item.data, type: item.type },
			},
		})),
	],
	phaseRules: [],
};
