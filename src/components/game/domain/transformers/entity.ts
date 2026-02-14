import type { EntityData } from "../entity/entity-data";
import { isItemData } from "../entity/entity-data";
import type { SpaceData } from "../space/space-data";
import {
	type TransitionResult,
	transitionApplied,
	transitionNoop,
} from "./types";

type EntityState = {
	entities: Record<string, EntityData>;
	spaces: Record<string, SpaceData>;
};

export type EntityTransitionEvent = {
	type: "ENTITY_UPDATED";
	entityId: string;
	updates: {
		name?: EntityData["name"];
		draggable?: boolean;
		visual?: EntityData["visual"];
		data?: EntityData["data"];
		state?: EntityData["state"];
	};
};

export type EntityTransitionPayload = {
	events: EntityTransitionEvent[];
};

export type EntityPatchInput = {
	entityId: string;
	updates: {
		name?: EntityData["name"];
		draggable?: boolean;
		visual?: EntityData["visual"];
		data?: EntityData["data"];
		state?: EntityData["state"];
	};
};

const removeEntityFromSpace = (space: SpaceData, entityId: string): boolean => {
	if (space.kind === "grid") {
		if (!(entityId in space.entityPositions)) {
			return false;
		}
		delete space.entityPositions[entityId];
		return true;
	}
	if (
		space.kind === "pool" ||
		space.kind === "path" ||
		space.kind === "queue"
	) {
		const index = space.entityIds.indexOf(entityId);
		if (index < 0) {
			return false;
		}
		space.entityIds.splice(index, 1);
		return true;
	}
	return false;
};

export const tryCreateEntity = (
	state: EntityState,
	input: { entity: EntityData },
): TransitionResult<EntityTransitionPayload> => {
	if (state.entities[input.entity.id]) {
		return transitionNoop(`entity:${input.entity.id}:already_exists`);
	}
	state.entities[input.entity.id] = input.entity;
	return transitionApplied({ events: [] });
};

export const tryPatchEntity = (
	state: EntityState,
	input: EntityPatchInput,
): TransitionResult<EntityTransitionPayload> => {
	const entity = state.entities[input.entityId];
	if (!entity) {
		return transitionNoop(`entity:${input.entityId}:not_found`);
	}

	const eventUpdates: EntityTransitionEvent["updates"] = {};
	let hasChanges = false;

	if ("name" in input.updates && input.updates.name !== entity.name) {
		entity.name = input.updates.name;
		eventUpdates.name = input.updates.name;
		hasChanges = true;
	}

	if ("draggable" in input.updates && isItemData(entity)) {
		const nextDraggable = input.updates.draggable ?? entity.draggable;
		if (nextDraggable !== entity.draggable) {
			entity.draggable = nextDraggable;
			eventUpdates.draggable = nextDraggable;
			hasChanges = true;
		}
	}

	if (input.updates.visual) {
		const hasVisualChange = Object.entries(input.updates.visual).some(
			([key, value]) =>
				entity.visual[key as keyof EntityData["visual"]] !== value,
		);
		if (hasVisualChange) {
			Object.assign(entity.visual, input.updates.visual);
			eventUpdates.visual = input.updates.visual;
			hasChanges = true;
		}
	}

	if (input.updates.data) {
		const hasDataChange = Object.entries(input.updates.data).some(
			([key, value]) => entity.data[key as keyof EntityData["data"]] !== value,
		);
		if (hasDataChange) {
			Object.assign(entity.data, input.updates.data);
			eventUpdates.data = input.updates.data;
			hasChanges = true;
		}
	}

	if (input.updates.state) {
		const hasStateChange = Object.entries(input.updates.state).some(
			([key, value]) =>
				entity.state[key as keyof EntityData["state"]] !== value,
		);
		if (hasStateChange) {
			Object.assign(entity.state, input.updates.state);
			eventUpdates.state = input.updates.state;
			hasChanges = true;
		}
	}

	if (!hasChanges) {
		return transitionNoop(`entity:${input.entityId}:no_changes`);
	}

	return transitionApplied({
		events: [
			{
				type: "ENTITY_UPDATED",
				entityId: input.entityId,
				updates: eventUpdates,
			},
		],
	});
};

export const tryPatchEntityState = (
	state: EntityState,
	input: { entityId: string; state: Record<string, unknown> },
): TransitionResult<EntityTransitionPayload> => {
	const entity = state.entities[input.entityId];
	if (!entity) {
		return transitionNoop(`entity:${input.entityId}:not_found`);
	}

	const changed = Object.entries(input.state).some(
		([key, value]) => entity.state[key as keyof EntityData["state"]] !== value,
	);
	if (!changed) {
		return transitionNoop(`entity:${input.entityId}:state_unchanged`);
	}

	Object.assign(entity.state, input.state);
	return transitionApplied({
		events: [
			{
				type: "ENTITY_UPDATED",
				entityId: input.entityId,
				updates: {
					state: input.state,
				},
			},
		],
	});
};

export const applyDeleteEntities = (
	state: EntityState,
	input: { entityIds: string[] },
): TransitionResult<EntityTransitionPayload> => {
	if (input.entityIds.length === 0) {
		return transitionNoop("entity:delete:empty_payload");
	}

	for (const id of input.entityIds) {
		for (const space of Object.values(state.spaces)) {
			removeEntityFromSpace(space, id);
		}
		delete state.entities[id];
	}

	return transitionApplied({ events: [] });
};
