import { EntityFactory, SpaceFactory } from "@/components/game/engine/runtime";
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
			SpaceFactory.pool(APP_POOL_CONFIG),
			SpaceFactory.grid(OPEN_GRID_CONFIG),
			SpaceFactory.grid(EXECUTION_GRID_CONFIG),
			SpaceFactory.path(CORE1_PATH_CONFIG),
			SpaceFactory.path(CORE2_PATH_CONFIG),
			SpaceFactory.path(STORAGE_PATH_CONFIG),
			SpaceFactory.grid(OPENED_GRID_CONFIG),
		],
		entities: APP_ITEMS.map((item) =>
			EntityFactory.itemInSpace(item, SPACE_IDS.appPool),
		),
		phaseRules: [],
		behaviors: CORES_BEHAVIORS,
	};
