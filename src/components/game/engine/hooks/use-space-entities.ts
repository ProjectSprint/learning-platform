import { useMemo } from "react";
import { useGameState } from "@/components/game/internal/game-provider";
import type { EntityData } from "@/components/game/types/entity";
import type { SpaceData } from "@/components/game/types/space";

type SpaceEntitiesResult = {
	/** Whether the space has any entities */
	hasEntities: boolean;
	/** Whether the space is empty */
	isEmpty: boolean;
	/** Number of entities in the space */
	count: number;
	/** The entity objects in the space */
	entities: EntityData[];
};

const getEntityIdsFromSpace = (space: SpaceData): string[] => {
	switch (space.kind) {
		case "grid":
			return Object.keys(space.entityPositions);
		case "pool":
		case "path":
		case "queue":
			return space.entityIds;
		case "custom":
		case "meter":
			return [];
	}
};

/**
 * Hook to query entity information for a given space.
 *
 * Returns entity count, emptiness check, and the entity list for the space.
 * Useful for conditionally rendering spaces or UI based on space contents.
 *
 * @example
 * ```tsx
 * const inventory = useSpaceEntities("inventory");
 *
 * {inventory.hasEntities && (
 *   <PoolSpace config={INVENTORY_POOL_CONFIG} />
 * )}
 * ```
 */
export const useSpaceEntities = (spaceId: string): SpaceEntitiesResult => {
	const state = useGameState();

	return useMemo(() => {
		const space = state.spaces[spaceId];
		if (!space) {
			return { hasEntities: false, isEmpty: true, count: 0, entities: [] };
		}

		const entityIds = getEntityIdsFromSpace(space);
		const entities = entityIds
			.map((id) => state.entities[id])
			.filter((e): e is EntityData => e !== undefined);

		return {
			hasEntities: entities.length > 0,
			isEmpty: entities.length === 0,
			count: entities.length,
			entities,
		};
	}, [state.spaces, state.entities, spaceId]);
};
