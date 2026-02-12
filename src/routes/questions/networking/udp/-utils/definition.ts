import type { QuestionDefinition } from "@/components/game/runtime";
import { UDP_BEHAVIORS } from "./behaviors";
import {
	ACK_PACKETS,
	CUSTOM_SPACE_CONFIGS,
	DATA_PACKETS,
	FRAME_ITEMS,
	GRID_SPACE_CONFIGS,
	INVENTORY_POOL_CONFIG,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
	RECEIVED_SYN_PACKETS,
	SYN_ACK_PACKETS,
	SYN_PACKETS,
} from "./constants";

export const UDP_DEFINITION: QuestionDefinition<
	string,
	Record<string, never>
> = {
	meta: {
		id: QUESTION_ID,
		title: QUESTION_TITLE,
		description: QUESTION_DESCRIPTION,
	},
	initialPhase: "setup",
	spaces: [
		...Object.values(GRID_SPACE_CONFIGS).map((config) => ({
			kind: "grid" as const,
			config,
		})),
		...Object.values(CUSTOM_SPACE_CONFIGS).map((config) => ({
			kind: "custom" as const,
			config,
		})),
		{ kind: "pool" as const, config: INVENTORY_POOL_CONFIG },
	],
	entities: [
		...SYN_PACKETS.map((item) => ({
			config: {
				id: item.id,
				name: item.name,
				icon: item.icon,
				tooltip: item.tooltip,
				allowedPlaces: item.allowedPlaces,
				data: { ...item.data, type: item.type },
				draggable: item.draggable,
				category: item.category,
			},
		})),
		...SYN_ACK_PACKETS.map((item) => ({
			config: {
				id: item.id,
				name: item.name,
				icon: item.icon,
				tooltip: item.tooltip,
				allowedPlaces: item.allowedPlaces,
				data: { ...item.data, type: item.type },
				draggable: item.draggable,
				category: item.category,
			},
		})),
		...ACK_PACKETS.map((item) => ({
			config: {
				id: item.id,
				name: item.name,
				icon: item.icon,
				tooltip: item.tooltip,
				allowedPlaces: item.allowedPlaces,
				data: { ...item.data, type: item.type },
				draggable: item.draggable,
				category: item.category,
			},
		})),
		...DATA_PACKETS.map((item) => ({
			config: {
				id: item.id,
				name: item.name,
				icon: item.icon,
				tooltip: item.tooltip,
				allowedPlaces: item.allowedPlaces,
				data: { ...item.data, type: item.type },
				draggable: item.draggable,
				category: item.category,
			},
		})),
		...RECEIVED_SYN_PACKETS.map((item) => ({
			config: {
				id: item.id,
				name: item.name,
				icon: item.icon,
				tooltip: item.tooltip,
				allowedPlaces: item.allowedPlaces,
				data: { ...item.data, type: item.type },
				draggable: item.draggable,
				category: item.category,
			},
		})),
		...FRAME_ITEMS.map((item) => ({
			config: {
				id: item.id,
				name: item.name,
				icon: item.icon,
				tooltip: item.tooltip,
				allowedPlaces: item.allowedPlaces,
				data: { ...item.data, type: item.type },
				draggable: item.draggable,
				category: item.category,
			},
		})),
	],
	phaseRules: [],
	behaviors: UDP_BEHAVIORS,
};
