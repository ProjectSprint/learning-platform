export type { GameReadState, ReadApi } from "@/components/game/types/read";
export { readApi } from "./contracts";
export {
	getEntity,
	getEntitySpaceId,
	getGridEntityPosition,
	getSpace,
	getSpaceEntityIds,
} from "./get";
export {
	isEntityInSpace,
	isEntityKnown,
	isEntityPlacementAllowed,
	isSpaceKnown,
} from "./guards";
export {
	selectDerivedPhase,
	selectEntitiesByType,
	selectEntityStateValue,
	selectGridEmptyPositions,
	selectSpaceEntityCount,
	selectSpaceIsEmpty,
	selectSpaceIsFull,
} from "./select";
