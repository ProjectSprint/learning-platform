import type {
	QuestionDefinitionFor,
	QuestionTypeSpec,
} from "@/components/game/types/question";

import {
	CORES_BEHAVIORS,
	type CoresBehaviorContext,
	type CoresEntityType,
	type CoresPhase,
	type CoresSpaceId,
} from "./behaviors";
import {
	APP_ITEMS,
	APP_POOL_CONFIG,
	CORE1_PATH_CONFIG,
	CORE2_PATH_CONFIG,
	EXECUTION_GRID_CONFIG,
	OPEN_GRID_CONFIG,
	OPENED_GRID_CONFIG,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
	SPACE_IDS,
	STORAGE_PATH_CONFIG,
} from "./constants";

type CoresQuestionSpec = QuestionTypeSpec & {
	conditionKey: never;
	context: CoresBehaviorContext;
	phase: CoresPhase;
	spaceId: CoresSpaceId;
	entityType: CoresEntityType;
	questionId: typeof QUESTION_ID;
	conditionValue: never;
};

export const CORES_THREADS_DEFINITION: QuestionDefinitionFor<CoresQuestionSpec> =
	{
		meta: {
			id: QUESTION_ID,
			title: QUESTION_TITLE,
			description: QUESTION_DESCRIPTION,
		},
		initialPhase: "single-core",
		spaces: [
			{ kind: "pool" as const, config: APP_POOL_CONFIG },
			{ kind: "grid" as const, config: OPEN_GRID_CONFIG },
			{ kind: "grid" as const, config: EXECUTION_GRID_CONFIG },
			{ kind: "path" as const, config: CORE1_PATH_CONFIG },
			{ kind: "path" as const, config: CORE2_PATH_CONFIG },
			{ kind: "path" as const, config: STORAGE_PATH_CONFIG },
			{ kind: "grid" as const, config: OPENED_GRID_CONFIG },
		],
		entities: APP_ITEMS.map((item) => ({
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
			initialSpace: SPACE_IDS.appPool,
		})),
		phaseRules: [],
		behaviors: CORES_BEHAVIORS,
	};
