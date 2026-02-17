import type {
	QuestionDefinitionFor,
	QuestionTypeSpec,
} from "@/components/game/types/question";
import {
	UDP_BEHAVIORS,
	type UdpBehaviorContext,
	type UdpEntityType,
	type UdpPhaseId,
} from "./behaviors";
import {
	CUSTOM_SPACE_CONFIGS,
	type CustomSpaceKey,
	DATA_PACKETS,
	FRAME_ITEMS,
	GRID_SPACE_CONFIGS,
	type GridSpaceKey,
	INITIAL_TCP_CLIENT_IDS,
	INVENTORY_POOL_CONFIG,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
	RECEIVED_POOL_CONFIG,
	SYN_ACK_PACKETS,
} from "./constants";

const INITIAL_SYN_ACK_IDS = new Set(
	INITIAL_TCP_CLIENT_IDS.map((id) => `syn-ack-packet-${id}`),
);

type UdpQuestionSpec = QuestionTypeSpec & {
	conditionKey: never;
	context: UdpBehaviorContext;
	phase: UdpPhaseId;
	spaceId: GridSpaceKey | CustomSpaceKey | "inventory" | "received";
	entityType: UdpEntityType;
	questionId: typeof QUESTION_ID;
	conditionValue: never;
};

export const UDP_DEFINITION: QuestionDefinitionFor<UdpQuestionSpec> = {
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
		{ kind: "pool" as const, config: RECEIVED_POOL_CONFIG },
	],
	entities: [
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
			initialSpace: INITIAL_SYN_ACK_IDS.has(item.id) ? "inventory" : undefined,
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
