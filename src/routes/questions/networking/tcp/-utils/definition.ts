import { EntityFactory, SpaceFactory } from "@/components/game/engine/runtime";
import type {
	QuestionDefinitionFor,
	QuestionTypeSpec,
} from "@/components/game/types/question";
import {
	TCP_BEHAVIORS,
	type TcpBehaviorContext,
	type TcpEntityType,
	type TcpPhase,
} from "./behaviors";
import {
	FILE_INVENTORY_ITEMS,
	INVENTORY_POOL_CONFIG,
	MESSAGE_PACKET_ITEMS,
	NOTES_FILE_ITEM,
	NOTES_PACKET_ITEMS,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
	RECEIVED_POOL_CONFIG,
	SPACE_CONFIGS,
	SYSTEM_PACKET_ITEMS,
	TCP_TOOL_ITEMS,
	TCP_TOOLS_POOL_CONFIG,
	type TcpSpaceKey,
} from "./constants";

type TcpQuestionSpec = QuestionTypeSpec & {
	conditionKey: never;
	context: TcpBehaviorContext;
	phase: TcpPhase;
	spaceId: TcpSpaceKey | "inventory" | "received" | "tcp-tools";
	entityType: TcpEntityType;
	questionId: typeof QUESTION_ID;
	conditionValue: never;
};

export const TCP_DEFINITION: QuestionDefinitionFor<TcpQuestionSpec> = {
	meta: {
		id: QUESTION_ID,
		title: QUESTION_TITLE,
		description: QUESTION_DESCRIPTION,
	},
	initialPhase: "mtu",
	spaces: [
		...Object.values(SPACE_CONFIGS).map((config) => SpaceFactory.grid(config)),
		SpaceFactory.pool(TCP_TOOLS_POOL_CONFIG),
		SpaceFactory.pool(INVENTORY_POOL_CONFIG),
		SpaceFactory.pool(RECEIVED_POOL_CONFIG),
	],
	entities: [
		// File inventory items — start in inventory
		...FILE_INVENTORY_ITEMS.map((item) =>
			EntityFactory.itemInSpace(item, "inventory"),
		),
		// System packets — created but NOT placed in a space
		...Object.values(SYSTEM_PACKET_ITEMS).map((item) =>
			EntityFactory.item(item),
		),
		// TCP tool items — created but NOT placed
		...Object.values(TCP_TOOL_ITEMS).map((item) => EntityFactory.item(item)),
		// Message packet items — created but NOT placed
		...MESSAGE_PACKET_ITEMS.map((item) => EntityFactory.item(item)),
		// Notes file item — created but NOT placed
		EntityFactory.item(NOTES_FILE_ITEM),
		// Notes packet items — created but NOT placed
		...NOTES_PACKET_ITEMS.map((item) => EntityFactory.item(item)),
	],
	phaseRules: [],
	behaviors: TCP_BEHAVIORS,
};
