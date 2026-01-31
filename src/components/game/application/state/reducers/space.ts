/**
 * Space reducer.
 * Handles state updates for space-related actions using Immer for immutability.
 */

import { produce } from "immer";
import type { Entity } from "../../../domain/entity";
import type { LegacySpaceAction, SpaceAction } from "../actions/space";
import type { GameState } from "../types";

/**
 * Type helper to cast Immer draft objects to their original types.
 * Immer wraps objects in Draft<T> which can cause type issues with complex objects.
 */
const asEntity = (entity: unknown): Entity => entity as Entity;

/**
 * Reduces space-related actions to update the game state.
 * Uses Immer's produce for immutable updates with mutable-like syntax.
 *
 * @param state Current game state
 * @param action Space action to process
 * @returns Updated game state
 */
export const spaceReducer = (
	state: GameState,
	action: SpaceAction | LegacySpaceAction,
): GameState => {
	switch (action.type) {
		case "CREATE_SPACE": {
			return produce(state, (draft) => {
				const { space } = action.payload;
				draft.spaces.set(space.id, space);
				draft.sequence += 1;
			});
		}

		case "REMOVE_SPACE": {
			return produce(state, (draft) => {
				const { spaceId } = action.payload;
				const space = draft.spaces.get(spaceId);
				if (!space) {
					return;
				}

				// Remove all entities from the space first
				const entities = space.getEntities();
				for (const entity of entities) {
					space.remove(entity);
				}

				// Remove the space
				draft.spaces.delete(spaceId);
				draft.sequence += 1;
			});
		}

		case "ADD_ENTITY_TO_SPACE": {
			return produce(state, (draft) => {
				const { entityId, spaceId, position } = action.payload;

				const space = draft.spaces.get(spaceId);
				const entity = draft.entities.get(entityId);

				if (!space || !entity) {
					return;
				}

				// Check if the space can accept the entity
				// Cast to Entity to satisfy Space interface
				if (!space.canAccept(asEntity(entity), position)) {
					return;
				}

				// Add the entity to the space
				const success = space.add(asEntity(entity), position);
				if (success) {
					draft.sequence += 1;
				}
			});
		}

		case "REMOVE_ENTITY_FROM_SPACE": {
			return produce(state, (draft) => {
				const { entityId, spaceId } = action.payload;

				const space = draft.spaces.get(spaceId);
				const entity = draft.entities.get(entityId);

				if (!space || !entity) {
					return;
				}

				// Remove the entity from the space
				const success = space.remove(asEntity(entity));
				if (success) {
					draft.sequence += 1;
				}
			});
		}

		case "MOVE_ENTITY_BETWEEN_SPACES": {
			return produce(state, (draft) => {
				const { entityId, fromSpaceId, toSpaceId, toPosition } = action.payload;

				const fromSpace = draft.spaces.get(fromSpaceId);
				const toSpace = draft.spaces.get(toSpaceId);
				const entity = draft.entities.get(entityId);

				if (!fromSpace || !toSpace || !entity) {
					return;
				}

				const e = asEntity(entity);

				// Check if the entity is in the source space
				if (!fromSpace.contains(e)) {
					return;
				}

				// Check if destination can accept the entity
				if (!toSpace.canAccept(e, toPosition)) {
					return;
				}

				// Remove from source and add to destination
				const removed = fromSpace.remove(e);
				if (!removed) {
					return;
				}

				const added = toSpace.add(e, toPosition);
				if (!added) {
					// Rollback: add back to source
					fromSpace.add(e);
					return;
				}

				draft.sequence += 1;
			});
		}

		case "UPDATE_ENTITY_POSITION": {
			return produce(state, (draft) => {
				const { entityId, spaceId, position } = action.payload;

				const space = draft.spaces.get(spaceId);
				const entity = draft.entities.get(entityId);

				if (!space || !entity) {
					return;
				}

				const e = asEntity(entity);

				// Check if the entity is in this space
				if (!space.contains(e)) {
					return;
				}

				// Update the position
				const success = space.setPosition(e, position);
				if (success) {
					draft.sequence += 1;
				}
			});
		}

		case "SWAP_ENTITIES": {
			return produce(state, (draft) => {
				const { entity1Id, space1Id, entity2Id, space2Id } = action.payload;

				const space1 = draft.spaces.get(space1Id);
				const space2 = draft.spaces.get(space2Id);
				const entity1 = draft.entities.get(entity1Id);
				const entity2 = draft.entities.get(entity2Id);

				if (!space1 || !space2 || !entity1 || !entity2) {
					return;
				}

				const e1 = asEntity(entity1);
				const e2 = asEntity(entity2);

				// Check if entities are in their respective spaces
				if (!space1.contains(e1) || !space2.contains(e2)) {
					return;
				}

				// Get positions
				const pos1 = space1.getPosition(e1);
				const pos2 = space2.getPosition(e2);

				if (space1Id === space2Id) {
					// Same space: just swap positions
					const success1 = space1.setPosition(e1, pos2 ?? {});
					const success2 = space1.setPosition(e2, pos1 ?? {});

					if (success1 && success2) {
						draft.sequence += 1;
					}
				} else {
					// Different spaces: transfer both entities
					const removed1 = space1.remove(e1);
					const removed2 = space2.remove(e2);

					if (!removed1 || !removed2) {
						// Rollback if either removal failed
						if (removed1) space1.add(e1, pos1 ?? undefined);
						if (removed2) space2.add(e2, pos2 ?? undefined);
						return;
					}

					const added1 = space2.add(e1, pos2 ?? undefined);
					const added2 = space1.add(e2, pos1 ?? undefined);

					if (!added1 || !added2) {
						// Rollback if either add failed
						if (added1) space2.remove(e1);
						if (added2) space1.remove(e2);
						space1.add(e1, pos1 ?? undefined);
						space2.add(e2, pos2 ?? undefined);
						return;
					}

					draft.sequence += 1;
				}
			});
		}

		// Legacy action handlers (for backward compatibility)
		// These translate old actions to new operations

		case "PLACE_ITEM": {
			// Map to ADD_ENTITY_TO_SPACE
			const { itemId, blockX, blockY, puzzleId } = action.payload;
			const spaceId = puzzleId ?? "puzzle";
			return spaceReducer(state, {
				type: "ADD_ENTITY_TO_SPACE",
				payload: {
					entityId: itemId,
					spaceId,
					position: { row: blockY, col: blockX },
				},
			});
		}

		case "REMOVE_ITEM": {
			// Map to REMOVE_ENTITY_FROM_SPACE
			// We need to find which entity is at this position
			const { blockX, blockY, puzzleId } = action.payload;
			const spaceId = puzzleId ?? "puzzle";

			return produce(state, (draft) => {
				const space = draft.spaces.get(spaceId);
				if (!space) {
					return;
				}

				// Find entity at this position
				const entity = space.findEntity((e) => {
					const pos = space.getPosition(asEntity(e));
					return Boolean(
						pos &&
							"row" in pos &&
							"col" in pos &&
							pos.row === blockY &&
							pos.col === blockX,
					);
				});

				if (entity) {
					space.remove(asEntity(entity));
					draft.sequence += 1;
				}
			});
		}

		case "REPOSITION_ITEM": {
			// Map to UPDATE_ENTITY_POSITION
			const { itemId, toBlockX, toBlockY, puzzleId } = action.payload;
			const spaceId = puzzleId ?? "puzzle";
			return spaceReducer(state, {
				type: "UPDATE_ENTITY_POSITION",
				payload: {
					entityId: itemId,
					spaceId,
					position: { row: toBlockY, col: toBlockX },
				},
			});
		}

		case "TRANSFER_ITEM": {
			// Map to MOVE_ENTITY_BETWEEN_SPACES
			const { itemId, fromPuzzle, toBlockX, toBlockY, toPuzzle } =
				action.payload;
			return spaceReducer(state, {
				type: "MOVE_ENTITY_BETWEEN_SPACES",
				payload: {
					entityId: itemId,
					fromSpaceId: fromPuzzle,
					toSpaceId: toPuzzle,
					toPosition: { row: toBlockY, col: toBlockX },
				},
			});
		}

		case "SWAP_ITEMS": {
			// Map to SWAP_ENTITIES
			// First find entities at the given positions
			const { from, to } = action.payload;
			const fromSpaceId = from.puzzleId ?? "puzzle";
			const toSpaceId = to.puzzleId ?? "puzzle";

			return produce(state, (draft) => {
				const fromSpace = draft.spaces.get(fromSpaceId);
				const toSpace = draft.spaces.get(toSpaceId);

				if (!fromSpace || !toSpace) {
					return;
				}

				// Find entities at positions
				const entity1 = fromSpace.findEntity((e) => {
					const pos = fromSpace.getPosition(asEntity(e));
					return Boolean(
						pos &&
							"row" in pos &&
							"col" in pos &&
							pos.row === from.blockY &&
							pos.col === from.blockX,
					);
				});

				const entity2 = toSpace.findEntity((e) => {
					const pos = toSpace.getPosition(asEntity(e));
					return Boolean(
						pos &&
							"row" in pos &&
							"col" in pos &&
							pos.row === to.blockY &&
							pos.col === to.blockX,
					);
				});

				if (!entity1 || !entity2) {
					return;
				}

				// Perform the swap using SWAP_ENTITIES logic
				const swapAction: SpaceAction = {
					type: "SWAP_ENTITIES",
					payload: {
						entity1Id: entity1.id,
						space1Id: fromSpaceId,
						entity2Id: entity2.id,
						space2Id: toSpaceId,
					},
				};

				const newState = spaceReducer(
					draft as unknown as GameState,
					swapAction,
				);
				Object.assign(draft, newState);
			});
		}

		default:
			return state;
	}
};
