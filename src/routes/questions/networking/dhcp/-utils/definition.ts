import {
	ConditionFactory,
	EntityFactory,
	PhaseRuleFactory,
	QuestionDefinition,
	type QuestionTypeSpec,
	SpaceFactory,
} from "@/components/game/engine/runtime";
import {
	DHCP_BEHAVIORS,
	type DhcpBehaviorContext,
	type DhcpEntityType,
	type DhcpPhase,
} from "./behaviors";
import {
	type DhcpSpaceKey,
	INVENTORY_ITEMS,
	INVENTORY_POOL_CONFIG,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
	SPACE_CONFIGS,
} from "./constants";

export type DhcpConditionKey = "dragStatus" | "questionStatus";

type DhcpQuestionSpec = QuestionTypeSpec & {
	conditionKey: DhcpConditionKey;
	context: DhcpBehaviorContext;
	phase: DhcpPhase;
	spaceId: DhcpSpaceKey | "inventory";
	entityType: DhcpEntityType;
	questionId: typeof QUESTION_ID;
	conditionValue: string | boolean;
};

export const DHCP_DEFINITION = QuestionDefinition<DhcpQuestionSpec>({
	meta: {
		id: QUESTION_ID,
		title: QUESTION_TITLE,
		description: QUESTION_DESCRIPTION,
	},
	initialPhase: "setup",
	spaces: [
		...Object.values(SPACE_CONFIGS).map((config) => SpaceFactory.grid(config)),
		SpaceFactory.pool(INVENTORY_POOL_CONFIG),
	],
	entities: INVENTORY_ITEMS.map((item) =>
		EntityFactory.itemInSpace(item, "inventory"),
	),
	phaseRules: [
		PhaseRuleFactory.set(
			ConditionFactory.eq("questionStatus", "completed"),
			"completed",
		),
		PhaseRuleFactory.set(
			ConditionFactory.eq("dragStatus", "finished"),
			"terminal",
		),
		PhaseRuleFactory.set(
			ConditionFactory.eq("dragStatus", "started"),
			"playing",
		),
	],
	behaviors: DHCP_BEHAVIORS,
});
