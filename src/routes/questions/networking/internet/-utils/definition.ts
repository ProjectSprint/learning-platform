import {
	ConditionFactory,
	EntityFactory,
	PhaseRuleFactory,
	SpaceFactory,
} from "@/components/game/engine/runtime";
import type {
	QuestionDefinitionFor,
	QuestionTypeSpec,
} from "@/components/game/types/question";
import {
	INTERNET_BEHAVIORS,
	type InternetBehaviorContext,
	type InternetEntityType,
	type InternetPhase,
} from "./behaviors";
import {
	INVENTORY_ITEMS,
	INVENTORY_POOL_CONFIG,
	type InternetSpaceKey,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
	SPACE_CONFIGS,
} from "./constants";

export type InternetConditionKey =
	| "questionStatus"
	| "dragStatus"
	| "allDevicesPlaced";

type InternetQuestionSpec = QuestionTypeSpec & {
	conditionKey: InternetConditionKey;
	context: InternetBehaviorContext;
	phase: InternetPhase;
	spaceId: InternetSpaceKey | "inventory";
	entityType: InternetEntityType;
	questionId: typeof QUESTION_ID;
	conditionValue: string | boolean;
};

export const INTERNET_DEFINITION: QuestionDefinitionFor<InternetQuestionSpec> =
	{
		meta: {
			id: QUESTION_ID,
			title: QUESTION_TITLE,
			description: QUESTION_DESCRIPTION,
		},
		initialPhase: "setup",
		spaces: [
			...Object.values(SPACE_CONFIGS).map((config) =>
				SpaceFactory.grid(config),
			),
			SpaceFactory.pool(INVENTORY_POOL_CONFIG),
		],
		entities: INVENTORY_ITEMS.map((item) =>
			EntityFactory.itemInSpace(item, "inventory"),
		),
		phaseRules: [
			PhaseRuleFactory.set(
				ConditionFactory.eq("allDevicesPlaced", true),
				"configuring",
			),
			PhaseRuleFactory.set(
				ConditionFactory.eq("dragStatus", "started"),
				"playing",
			),
			PhaseRuleFactory.set(
				ConditionFactory.eq("dragStatus", "finished"),
				"terminal",
			),
			PhaseRuleFactory.set(
				ConditionFactory.eq("questionStatus", "completed"),
				"completed",
			),
		],
		behaviors: INTERNET_BEHAVIORS,
	};
