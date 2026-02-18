import { EntityFactory, SpaceFactory } from "@/components/game/engine/runtime";
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
		...Object.values(GRID_SPACE_CONFIGS).map((config) =>
			SpaceFactory.grid(config),
		),
		...Object.values(CUSTOM_SPACE_CONFIGS).map((config) =>
			SpaceFactory.custom(config),
		),
		SpaceFactory.pool(INVENTORY_POOL_CONFIG),
		SpaceFactory.pool(RECEIVED_POOL_CONFIG),
	],
	entities: [
		...SYN_ACK_PACKETS.map((item) =>
			INITIAL_SYN_ACK_IDS.has(item.id)
				? EntityFactory.itemInSpace(item, "inventory")
				: EntityFactory.item(item),
		),
		...DATA_PACKETS.map((item) => EntityFactory.item(item)),
		...FRAME_ITEMS.map((item) => EntityFactory.item(item)),
	],
	phaseRules: [],
	behaviors: UDP_BEHAVIORS,
};
