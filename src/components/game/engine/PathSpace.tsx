import { memo, useEffect } from "react";
import type { EntityData } from "../domain/entity/entity-data";
import type {
	PathSpaceConfig,
	PathSpaceData,
} from "../domain/space/space-data";
import { canEntityBePlaced, findEntitySpace } from "../domain/space/validation";
import type { GameContextValue } from "../game-provider";
import { useGameDispatch, useGameState } from "../game-provider";
import { PathSpaceView } from "../presentation/space/PathSpaceView";

type PathSpacePropsBase = {
	id?: string;
	ctx?: GameContextValue;
	config?: PathSpaceConfig;
	title?: string;
	speedMultiplier?: number;
};

export type PathSpaceProps =
	| (PathSpacePropsBase & { id: string; config?: PathSpaceConfig })
	| (PathSpacePropsBase & { id?: string; config: PathSpaceConfig });

export const PathSpace = memo(
	({ id, ctx, config, title, speedMultiplier }: PathSpaceProps) => {
		const contextState = useGameState();
		const contextDispatch = useGameDispatch();
		const state = ctx?.state ?? contextState;
		const dispatch = ctx?.dispatch ?? contextDispatch;
		const resolvedId = config?.id ?? id;

		useEffect(() => {
			if (!resolvedId) return;
			if (process.env.NODE_ENV === "development" && !state.spaces[resolvedId]) {
				console.warn(
					`[PathSpace] Space "${resolvedId}" not found in state. Did you forget to define it in QuestionDefinition?`,
				);
			}
		}, [resolvedId, state.spaces]);

		const space = resolvedId
			? (state.spaces[resolvedId] as PathSpaceData | undefined)
			: undefined;

		if (!space || space.kind !== "path") {
			return null;
		}

		const entities: EntityData[] = space.entityIds
			.map((entityId) => state.entities[entityId])
			.filter((entity): entity is EntityData => entity !== undefined);

		const resolvedTitle = title ?? space.name ?? space.id;
		const resolvedSpeedMultiplier = Math.max(
			0.01,
			speedMultiplier ?? space.speedMultiplier ?? 1,
		);

		const onDropEntity = (entityId: string): boolean => {
			if (!canEntityBePlaced(state, entityId, space.id)) {
				return false;
			}

			const fromSpaceId = findEntitySpace(state, entityId);

			if (fromSpaceId && fromSpaceId === space.id) {
				return false;
			}

			if (fromSpaceId) {
				dispatch({
					type: "ENTITY_MOVED",
					payload: {
						entityId,
						fromSpaceId,
						toSpaceId: space.id,
					},
				});
				return true;
			}

			dispatch({
				type: "ENTITY_ADDED",
				payload: {
					entityId,
					spaceId: space.id,
				},
			});
			return true;
		};

		const onEntityPathComplete = (entityId: string) => {
			dispatch({
				type: "ENTITY_REMOVED",
				payload: {
					entityId,
					spaceId: space.id,
				},
			});
		};

		return (
			<PathSpaceView
				space={space}
				entities={entities}
				title={resolvedTitle}
				speedMultiplier={resolvedSpeedMultiplier}
				onDropEntity={onDropEntity}
				onEntityPathComplete={onEntityPathComplete}
			/>
		);
	},
);

PathSpace.displayName = "PathSpace";
