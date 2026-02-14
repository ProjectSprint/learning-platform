import {
	applyDeleteEntities,
	tryCreateEntity,
	tryPatchEntity,
	tryPatchEntityState,
} from "./entity";
import { applyAppendEvents, getNextActionId } from "./event-queue";
import {
	applyCompleteQuestion,
	tryAckEvents,
	tryEmitEvents,
	trySetPhase,
	trySetQuestion,
} from "./game";
import {
	applyCreateSpace,
	tryAddEntityToSpace,
	tryMoveEntityAcrossSpaces,
	tryRemoveEntityFromSpace,
	tryRemoveSpace,
	trySwapGridEntities,
	tryUpdateGridEntityPosition,
} from "./space";

export type TransformApi = {
	applyAppendEvents: typeof applyAppendEvents;
	getNextActionId: typeof getNextActionId;
	applyCreateSpace: typeof applyCreateSpace;
	tryRemoveSpace: typeof tryRemoveSpace;
	tryAddEntityToSpace: typeof tryAddEntityToSpace;
	tryRemoveEntityFromSpace: typeof tryRemoveEntityFromSpace;
	tryMoveEntityAcrossSpaces: typeof tryMoveEntityAcrossSpaces;
	tryUpdateGridEntityPosition: typeof tryUpdateGridEntityPosition;
	trySwapGridEntities: typeof trySwapGridEntities;
	tryCreateEntity: typeof tryCreateEntity;
	tryPatchEntity: typeof tryPatchEntity;
	tryPatchEntityState: typeof tryPatchEntityState;
	applyDeleteEntities: typeof applyDeleteEntities;
	trySetQuestion: typeof trySetQuestion;
	trySetPhase: typeof trySetPhase;
	applyCompleteQuestion: typeof applyCompleteQuestion;
	tryAckEvents: typeof tryAckEvents;
	tryEmitEvents: typeof tryEmitEvents;
};

export const transformApi = {
	applyAppendEvents,
	getNextActionId,
	applyCreateSpace,
	tryRemoveSpace,
	tryAddEntityToSpace,
	tryRemoveEntityFromSpace,
	tryMoveEntityAcrossSpaces,
	tryUpdateGridEntityPosition,
	trySwapGridEntities,
	tryCreateEntity,
	tryPatchEntity,
	tryPatchEntityState,
	applyDeleteEntities,
	trySetQuestion,
	trySetPhase,
	applyCompleteQuestion,
	tryAckEvents,
	tryEmitEvents,
} satisfies TransformApi;
