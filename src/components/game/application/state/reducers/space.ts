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
					// Force new reference by deleting and re-inserting
					draft.spaces.delete(spaceId);
					draft.spaces.set(spaceId, space);
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
					// Force new reference by deleting and re-inserting
					draft.spaces.delete(spaceId);
					draft.spaces.set(spaceId, space);
					draft.sequence += 1;
				}
			});
		}

		case "MOVE_ENTITY_BETWEEN_SPACES": {
			const { entityId, fromSpaceId, toSpaceId, toPosition } = action.payload;
			const NEW_STATE = produce(state, (draft) => {
				// Get drafts first
				const fromSpaceDraft = draft.spaces.get(fromSpaceId);
				const toSpaceDraft = draft.spaces.get(toSpaceId);
				const entityDraft = draft.entities.get(entityId);

				if (!fromSpaceDraft || !toSpaceDraft || !entityDraft) {
					console.log(
						"[MOVE] FAIL: missing space or entity",
						"fromSpace:",
						!!fromSpaceDraft,
						"toSpace:",
						!!toSpaceDraft,
						"entity:",
						!!entityDraft,
					);
					return;
				}

				// NOTE: We Don't use original() here!
				// Immer proxies the Map container but NOT the values stored in it.
				// The Space and Entity class instances are already original objects,
				// not drafts. We can safely use them directly.
				const fromSpace = fromSpaceDraft;
				const toSpace = toSpaceDraft;
				const entity = entityDraft;

				const e = asEntity(entity);

				console.log(
					"[MOVE] entityId:",
					entityId,
					"from:",
					fromSpaceId,
					"to:",
					toSpaceId,
					"pos:",
					toPosition,
					"toSpace contains BEFORE:",
					toSpace.contains(e),
				);

				// Debug: Check if spaces already contain entity
				console.log(
					"[MOVE] BEFORE CHECK: fromSpace.contains:",
					fromSpace.contains(e),
					"toSpace.contains:",
					toSpace.contains(e),
				);

				// Check if the entity is in the source space
				if (!fromSpace.contains(e)) {
					// Entity may already be at destination (React StrictMode double-invocation
					// with non-draftable objects causes the first call to mutate in-place)
					if (toSpace.contains(e)) {
						console.log(
							"[MOVE] already moved (StrictMode), ensuring state signals change",
						);
						// Even though already moved, force new references to signal change
						draft.spaces.delete(fromSpaceId);
						draft.spaces.set(fromSpaceId, fromSpace);
						draft.spaces.delete(toSpaceId);
						draft.spaces.set(toSpaceId, toSpace);
						draft.sequence += 1;
						return;
					}
					console.log(
						"[MOVE] FAIL: entity not in source space. entity.id:",
						e.id,
					);
					return;
				}

				// Check if destination can accept the entity
				if (!toSpace.canAccept(e, toPosition)) {
					console.log(
						"[MOVE] FAIL: destination cannot accept. capacity:",
						toSpace.capacity(),
					);
					return;
				}

				// Capture original position BEFORE removal for rollback
				const originalPosition = fromSpace.getPosition(e);
				console.log("[MOVE] originalPosition:", originalPosition);

				// Remove from source and add to destination (mutate in-place)
				const removed = fromSpace.remove(e);
				if (!removed) {
					console.log("[MOVE] FAIL: could not remove from source");
					return;
				}
				console.log(
					"[MOVE] After remove: fromSpace.contains:",
					fromSpace.contains(e),
				);

				const added = toSpace.add(e, toPosition);
				if (!added) {
					console.log("[MOVE] FAIL: could not add to destination");
					// Rollback: add back to source at original position
					if (originalPosition) {
						const rollbackAdded = fromSpace.add(e, originalPosition);
						if (!rollbackAdded) {
							console.log(
								"[MOVE] ROLLBACK FAILED: could not restore entity to source",
							);
						} else {
							console.log("[MOVE] ROLLBACK SUCCESS: restored entity to source");
						}
					}
					return;
				}
				console.log(
					"[MOVE] After add: toSpace.contains:",
					toSpace.contains(e),
					"toSpace.getPosition:",
					toSpace.getPosition(e),
				);
				console.log(
					"[MOVE] toSpace entityPositions.size:",
					(toSpace as unknown as { entityPositions: Map<string, unknown> })
						.entityPositions?.size,
					"toSpace entityPositions keys:",
					(toSpace as unknown as { entityPositions: Map<string, unknown> })
						.entityPositions
						? Array.from(
								(
									toSpace as unknown as {
										entityPositions: Map<string, unknown>;
									}
								).entityPositions.keys(),
							)
						: [],
				);

				console.log("[MOVE] SUCCESS: moved entity", entityId);

				// CRITICAL: Force new references by deleting and re-inserting to signal the change to Immer
				// Immer proxies the Map but NOT the values stored in it. When we mutate
				// Space/Entity instances with method calls, the Map doesn't "see" the change.
				draft.spaces.delete(fromSpaceId);
				draft.spaces.set(fromSpaceId, fromSpace);
				draft.spaces.delete(toSpaceId);
				draft.spaces.set(toSpaceId, toSpace);
				draft.sequence += 1;
			});

			// Debug: Check state after produce returns
			// This is key - we need to see if the space in NEW_STATE has the entity
			const internetSpace = NEW_STATE.spaces.get(toSpaceId);
			const entityAfter = NEW_STATE.entities.get(entityId);
			console.log(
				"[MOVE] AFTER PRODUCE: internet space exists:",
				!!internetSpace,
				"entity exists:",
				!!entityAfter,
				"space contains entity:",
				internetSpace && entityAfter
					? internetSpace.contains(entityAfter)
					: "N/A",
				"space getPosition:",
				internetSpace && entityAfter
					? internetSpace.getPosition(entityAfter)
					: "N/A",
			);

			return NEW_STATE;
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
					// Force new reference by deleting and re-inserting
					draft.spaces.delete(spaceId);
					draft.spaces.set(spaceId, space);
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
						// Force new reference by deleting and re-inserting
						draft.spaces.delete(space1Id);
						draft.spaces.set(space1Id, space1);
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

					// Force new references by deleting and re-inserting
					draft.spaces.delete(space1Id);
					draft.spaces.set(space1Id, space1);
					draft.spaces.delete(space2Id);
					draft.spaces.set(space2Id, space2);
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
