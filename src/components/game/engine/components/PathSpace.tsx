import { useBreakpointValue } from "@chakra-ui/react";
import { memo, useEffect } from "react";
import type { EntityData } from "@/components/game/types/entity";
import type {
	PathSpaceConfig,
	PathSpaceData,
} from "@/components/game/types/space";
import { isPathSpace } from "@/components/game/types/space";
import {
	getEntitySpaceId,
	isEntityPlacementAllowed,
} from "../../internal/domain/read";
import type { GameContextValue } from "../../internal/game-provider";
import { useGameDispatch, useGameState } from "../../internal/game-provider";
import { PathSpaceView } from "../../internal/presentation/space/PathSpaceView";

type PathSpacePropsBase = {
	/** Responsive SVG path mapping (Chakra breakpoint -> path d) */
	responsivePath?: Record<string, string>;
	/** Whether to show the default interactive dropzone */
	showDropzone?: boolean;
	/** Optional callback when an entity reaches path midpoint (progress 0.5) */
	onEntityMidpoint?: (entityId: string) => void;
	id?: string;
	ctx?: GameContextValue;
	config?: PathSpaceConfig;
	title?: string;
	speedMultiplier?: number;
};

type PathSpaceProps =
	| (PathSpacePropsBase & { id: string; config?: PathSpaceConfig })
	| (PathSpacePropsBase & { id?: string; config: PathSpaceConfig });

const EMPTY_BREAKPOINTS: Record<string, string> = {};

export const PathSpace = memo(
	({
		id,
		ctx,
		config,
		title,
		speedMultiplier,
		responsivePath,
		showDropzone,
		onEntityMidpoint,
	}: PathSpaceProps) => {
		const contextState = useGameState();
		const contextDispatch = useGameDispatch();
		const state = ctx?.state ?? contextState;
		const dispatch = ctx?.dispatch ?? contextDispatch;
		const resolvedId = config?.id ?? id;

		const resolvedPath = useBreakpointValue<string>(
			responsivePath ?? EMPTY_BREAKPOINTS,
		);

		useEffect(() => {
			if (!resolvedId) return;
			if (process.env.NODE_ENV === "development" && !state.spaces[resolvedId]) {
				console.warn(
					`[PathSpace] Space "${resolvedId}" not found in state. Did you forget to define it in QuestionDefinition?`,
				);
			}
		}, [resolvedId, state.spaces]);

		const candidateSpace = resolvedId ? state.spaces[resolvedId] : undefined;
		const space: PathSpaceData | undefined =
			candidateSpace && isPathSpace(candidateSpace)
				? candidateSpace
				: undefined;

		if (!space) {
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
		const path = resolvedPath ?? space.path;
		const resolvedShowDropzone = showDropzone ?? space.showDropzone ?? true;

		const onDropEntity = (entityId: string): boolean => {
			if (!isEntityPlacementAllowed(state, entityId, space.id)) {
				return false;
			}

			const fromSpaceId = getEntitySpaceId(state, entityId);

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

		const onEntityPathMidpoint = (entityId: string) => {
			dispatch({
				type: "ENTITY_UPDATED",
				payload: {
					entityId,
					updates: {
						data: {
							pathMidpointTick: Date.now(),
						},
					},
				},
			});
			onEntityMidpoint?.(entityId);
		};

		return (
			<PathSpaceView
				space={space}
				path={path}
				entities={entities}
				title={resolvedTitle}
				speedMultiplier={resolvedSpeedMultiplier}
				showDropzone={resolvedShowDropzone}
				onDropEntity={resolvedShowDropzone ? onDropEntity : undefined}
				onEntityPathMidpoint={onEntityPathMidpoint}
				onEntityPathComplete={onEntityPathComplete}
			/>
		);
	},
);

PathSpace.displayName = "PathSpace";
