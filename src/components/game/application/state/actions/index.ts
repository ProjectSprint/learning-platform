/**
 * Application layer actions.
 * Exports all action types and creators for the new domain-driven architecture.
 */

export type { CoreAction } from "./core";
export type {
	EntitiesDeletedAction,
	EntityAction,
	EntityCreatedAction,
	EntityStateUpdatedAction,
	EntityUpdatedAction,
} from "./entity";
export type {
	EntitiesSwappedAction,
	EntityAddedAction,
	EntityMovedAction,
	EntityPositionUpdatedAction,
	EntityRemovedAction,
	SpaceAction,
	SpaceCreatedAction,
	SpaceRemovedAction,
} from "./space";
export type {
	ModalAction,
	UIAction,
} from "./ui";

import type { CoreAction } from "./core";
import type { EntityAction } from "./entity";
import type { SpaceAction } from "./space";
import type { UIAction } from "./ui";

/**
 * Union of all application layer actions.
 */
export type ApplicationAction = SpaceAction | EntityAction;
export type Action = ApplicationAction | UIAction | CoreAction;
