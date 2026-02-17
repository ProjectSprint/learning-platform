/**
 * Factory: createCommands(ctx) → Commands
 *
 * Produces a plain Commands object whose methods dispatch fact-style
 * actions through the game reducer. This is the ONLY gateway for
 * world mutations from question pages.
 *
 * Design: plain object factory (not a class, not a React context)
 * so it is testable without React.
 */

import type { ItemDataConfig } from "@/components/game/types/entity";
import type { CommandContext, Commands } from "@/components/game/types/runtime";
import { isGridSpace } from "@/components/game/types/space";
import { createItemData } from "../../domain/adt";
import { getEntitySpaceId, selectGridEmptyPositions } from "../../domain/read";

/**
 * Create a Commands object backed by dispatch + getState.
 */
export function createCommands(ctx: CommandContext): Commands {
	const { dispatch, getState } = ctx;

	const moveEntityInternal = (
		entityId: string,
		toSpaceId: string,
		position?: Record<string, unknown>,
	) => {
		const state = getState();
		const fromSpaceId = getEntitySpaceId(state, entityId);

		if (fromSpaceId) {
			dispatch({
				type: "ENTITY_MOVED",
				payload: {
					entityId,
					fromSpaceId,
					toSpaceId,
					toPosition: position,
				},
			});
			return;
		}

		// Entity not in any space yet — just add it
		dispatch({
			type: "ENTITY_ADDED",
			payload: {
				entityId,
				spaceId: toSpaceId,
				position,
			},
		});
	};

	return {
		// ── Entity ────────────────────────────────────────────────────────
		createEntity(config: ItemDataConfig) {
			const entity = createItemData(config);
			dispatch({ type: "ENTITY_CREATED", payload: { entity } });
			return entity;
		},

		updateEntity(entityId, updates) {
			dispatch({
				type: "ENTITY_UPDATED",
				payload: { entityId, updates },
			});
		},

		updateEntityState(entityId, state) {
			dispatch({
				type: "ENTITY_STATE_UPDATED",
				payload: { entityId, state },
			});
		},

		deleteEntities(entityIds) {
			dispatch({
				type: "ENTITIES_DELETED",
				payload: { entityIds },
			});
		},

		// ── Space-entity ─────────────────────────────────────────────────
		addToSpace(entityId, spaceId, position) {
			dispatch({
				type: "ENTITY_ADDED",
				payload: {
					entityId,
					spaceId,
					position: position as Record<string, unknown> | undefined,
				},
			});
		},

		removeFromSpace(entityId, spaceId) {
			dispatch({
				type: "ENTITY_REMOVED",
				payload: { entityId, spaceId },
			});
		},

		moveEntity(entityId, toSpaceId, position) {
			moveEntityInternal(
				entityId,
				toSpaceId,
				position as Record<string, unknown> | undefined,
			);
		},

		moveEntityToGrid(entityId, spaceId) {
			const state = getState();
			const space = state.spaces[spaceId];
			if (!space || !isGridSpace(space)) {
				return false;
			}

			const emptyPositions = selectGridEmptyPositions(state, spaceId);
			if (emptyPositions.length === 0) {
				return false;
			}

			const position = emptyPositions[0];
			moveEntityInternal(entityId, spaceId, position);
			return true;
		},

		completeQuestion() {
			dispatch({ type: "COMPLETE_QUESTION" });
		},

		// ── Modal ─────────────────────────────────────────────────────────
		openModal(modal) {
			dispatch({
				type: "OPEN_MODAL",
				payload: modal,
			});
		},

		closeModal(modalId) {
			dispatch({
				type: "CLOSE_MODAL",
				payload: modalId ? { modalId } : undefined,
			});
		},
	};
}
