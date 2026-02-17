import type {
	QuestionDefinitionFor,
	QuestionTypeSpec,
} from "@/components/game/types/question";
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

export const DHCP_DEFINITION: QuestionDefinitionFor<DhcpQuestionSpec> = {
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
	],
	entities: INVENTORY_ITEMS.map((item) => ({
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
	phaseRules: [
		{
			kind: "set",
			when: { kind: "eq", key: "questionStatus", value: "completed" },
			to: "completed",
		},
		{
			kind: "set",
			when: { kind: "eq", key: "dragStatus", value: "finished" },
			to: "terminal",
		},
		{
			kind: "set",
			when: { kind: "eq", key: "dragStatus", value: "started" },
			to: "playing",
		},
	],
	behaviors: DHCP_BEHAVIORS,
};
