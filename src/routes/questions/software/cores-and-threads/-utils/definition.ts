import {
	QuestionDefinition,
	type QuestionTypeSpec,
	SpaceFactory,
} from "@/components/game/engine/runtime";
import { CORES_BEHAVIORS, type CoresBehaviorContext } from "./behaviors";
import {
	createLaneConfig,
	DB_PATH_CONFIG,
	DISK_PATH_CONFIG,
	GROWTH_FACTOR_CONFIG,
	INVENTORY_CONFIG,
	IO_WAIT_CONFIG,
	LANE_IDS,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
	REQUEST_QUEUE_CONFIG,
	UPGRADE_CONFIG,
} from "./constants";
import type { CoresPhase } from "./types";

type CoresEntityType =
	| "request"
	| "io-subtask"
	| "core"
	| "thread"
	| "marketing"
	| "inbound-marketing";
type CoresSpaceId = string;

type CoresQuestionSpec = QuestionTypeSpec & {
	conditionKey: never;
	context: CoresBehaviorContext;
	phase: CoresPhase;
	spaceId: CoresSpaceId;
	entityType: CoresEntityType;
	questionId: typeof QUESTION_ID;
	conditionValue: never;
};

export const CORES_THREADS_DEFINITION = QuestionDefinition<CoresQuestionSpec>({
	meta: {
		id: QUESTION_ID,
		title: QUESTION_TITLE,
		description: QUESTION_DESCRIPTION,
	},
	initialPhase: "boot",
	spaces: [
		// Request queue (source)
		SpaceFactory.grid(REQUEST_QUEUE_CONFIG),
		// Server lanes (dynamic based on core count)
		...LANE_IDS.map((laneId) => SpaceFactory.path(createLaneConfig(laneId))),
		// I/O paths
		SpaceFactory.path(DISK_PATH_CONFIG),
		SpaceFactory.path(DB_PATH_CONFIG),
		// I/O wait area (for threads)
		SpaceFactory.grid(IO_WAIT_CONFIG),
		// Upgrade drop zone (for cores)
		SpaceFactory.grid(UPGRADE_CONFIG),
		// Growth Factor gateway (for marketing items)
		SpaceFactory.grid(GROWTH_FACTOR_CONFIG),
		// Inventory for cores/threads/marketing
		SpaceFactory.pool(INVENTORY_CONFIG),
	],
	entities: [],
	phaseRules: [],
	behaviors: CORES_BEHAVIORS,
});
