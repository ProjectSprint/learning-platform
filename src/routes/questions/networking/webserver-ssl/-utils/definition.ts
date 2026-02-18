import { EntityFactory, SpaceFactory } from "@/components/game/engine/runtime";
import type {
	QuestionDefinitionFor,
	QuestionTypeSpec,
} from "@/components/game/types/question";
import {
	SSL_BEHAVIORS,
	type SslBehaviorContext,
	type SslEntityType,
	type SslPhase,
} from "./behaviors";
import {
	BASIC_INVENTORY_ITEMS,
	INVENTORY_POOL_CONFIG,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
	SPACE_CONFIGS,
	SSL_ITEMS_INVENTORY,
	SSL_ITEMS_POOL_CONFIG,
	SSL_POOL_IDS,
	SSL_SETUP_INVENTORY_ITEMS,
	SSL_SETUP_POOL_CONFIG,
	type WebSslSpaceId,
} from "./constants";

type SslQuestionSpec = QuestionTypeSpec & {
	conditionKey: never;
	context: SslBehaviorContext;
	phase: SslPhase;
	spaceId: WebSslSpaceId;
	entityType: SslEntityType;
	questionId: typeof QUESTION_ID;
	conditionValue: never;
};

const INVENTORY_SPACE_ID: SslQuestionSpec["spaceId"] = "inventory";
const SSL_SETUP_SPACE_ID: SslQuestionSpec["spaceId"] = SSL_POOL_IDS.setup;
const SSL_CERTIFICATES_SPACE_ID: SslQuestionSpec["spaceId"] =
	SSL_POOL_IDS.certificates;

export const SSL_DEFINITION: QuestionDefinitionFor<SslQuestionSpec> = {
	meta: {
		id: QUESTION_ID,
		title: QUESTION_TITLE,
		description: QUESTION_DESCRIPTION,
	},
	initialPhase: "setup",
	spaces: [
		...Object.values(SPACE_CONFIGS).map((config) => SpaceFactory.grid(config)),
		SpaceFactory.pool(INVENTORY_POOL_CONFIG),
		SpaceFactory.pool(SSL_SETUP_POOL_CONFIG),
		SpaceFactory.pool(SSL_ITEMS_POOL_CONFIG),
	],
	entities: [
		...BASIC_INVENTORY_ITEMS.map((item) =>
			EntityFactory.itemInSpace(item, INVENTORY_SPACE_ID),
		),
		...SSL_SETUP_INVENTORY_ITEMS.map((item) =>
			EntityFactory.itemInSpace(item, SSL_SETUP_SPACE_ID),
		),
		...SSL_ITEMS_INVENTORY.map((item) =>
			EntityFactory.itemInSpace(item, SSL_CERTIFICATES_SPACE_ID),
		),
	],
	phaseRules: [],
	behaviors: SSL_BEHAVIORS,
};
