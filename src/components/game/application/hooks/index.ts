/**
 * Application layer hooks.
 * Exports all hooks for accessing spaces and entities from the game state.
 */

export {
	useEntities,
	useEntitiesByType,
	useEntity,
	useEntityExists,
	useEntityPosition,
	useEntitySpace,
	useEntityState,
	useEntityStateValue,
} from "./useEntity";
export { useGameEvents } from "./useEvents";
export {
	useSpace,
	useSpaceCapacity,
	useSpaceEntities,
	useSpaceIsEmpty,
	useSpaceIsFull,
	useSpaces,
} from "./useSpace";
