import { Box, Flex, Text } from "@chakra-ui/react";
import { gsap } from "gsap";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EntityData } from "../../domain/entity/entity-data";
import type { PathSpaceData } from "../../domain/space/space-data";
import { useDragContext } from "../interaction/drag/DragContext";
import { useEntityCardSize } from "../interaction/drag/DragOverlay";

type PathPoint = { x: number; y: number };
type PathViewBox = { width: number; height: number };
type EntityRenderSize = { width: number; height: number };
const DROPZONE_CELL_WIDTH = 64;
const DROPZONE_CELL_HEIGHT = 60;

const parseViewBox = (viewBox: string): PathViewBox => {
	const [minX, minY, width, height] = viewBox
		.split(/\s+/)
		.map((value) => Number.parseFloat(value));
	if (
		Number.isNaN(minX) ||
		Number.isNaN(minY) ||
		Number.isNaN(width) ||
		Number.isNaN(height) ||
		width <= 0 ||
		height <= 0
	) {
		return { width: 320, height: 120 };
	}
	return { width, height };
};

export type PathSpaceViewProps = {
	space: PathSpaceData;
	entities: EntityData[];
	title?: string;
	speedMultiplier: number;
	onDropEntity?: (entityId: string) => boolean;
	onEntityPathComplete?: (entityId: string) => void;
};

export const PathSpaceView = ({
	space,
	entities,
	title,
	speedMultiplier,
	onDropEntity,
	onEntityPathComplete,
}: PathSpaceViewProps) => {
	const {
		activeDrag,
		dropAnimationTarget,
		setDropAnimationTarget,
		setLastDropResult,
		targetSpaceIdRef,
	} = useDragContext();
	const containerRef = useRef<HTMLDivElement | null>(null);
	const dropzoneRef = useRef<HTMLDivElement | null>(null);
	const trackRef = useRef<HTMLDivElement | null>(null);
	const pathRef = useRef<SVGPathElement | null>(null);
	const timelinesRef = useRef<Map<string, gsap.core.Animation>>(new Map());
	const pendingEntryRef = useRef<
		Map<
			string,
			{ viewportX: number; viewportY: number; size: EntityRenderSize }
		>
	>(new Map());
	const [entitySizes, setEntitySizes] = useState<
		Record<string, EntityRenderSize>
	>({});
	const [isDropzoneHovered, setIsDropzoneHovered] = useState(false);
	const [entityPositions, setEntityPositions] = useState<
		Record<string, PathPoint>
	>({});
	const [pathStartPoint, setPathStartPoint] = useState<PathPoint>({
		x: DROPZONE_CELL_WIDTH / 2,
		y: DROPZONE_CELL_HEIGHT / 2,
	});
	const hoveredRef = useRef(false);
	const pendingDropEntityIdRef = useRef<string | null>(null);
	const defaultCardSize = useEntityCardSize();

	const viewBoxSize = useMemo(
		() => parseViewBox(space.viewBox),
		[space.viewBox],
	);

	const toPathCoordinates = useCallback(
		(viewportX: number, viewportY: number): PathPoint | null => {
			const track = trackRef.current;
			if (!track) {
				return null;
			}
			const rect = track.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) {
				return null;
			}

			const relX = viewportX - rect.left;
			const relY = viewportY - rect.top;
			return {
				x: (relX / rect.width) * viewBoxSize.width,
				y: (relY / rect.height) * viewBoxSize.height,
			};
		},
		[viewBoxSize.height, viewBoxSize.width],
	);

	useEffect(() => {
		if (!activeDrag || !dropzoneRef.current || !onDropEntity) {
			setIsDropzoneHovered(false);
			hoveredRef.current = false;
			return;
		}

		const dropzone = dropzoneRef.current;

		const onPointerMove = (event: PointerEvent) => {
			const rect = dropzone.getBoundingClientRect();
			const isInside =
				event.clientX >= rect.left &&
				event.clientX <= rect.right &&
				event.clientY >= rect.top &&
				event.clientY <= rect.bottom;

			hoveredRef.current = isInside;
			setIsDropzoneHovered(isInside);
			targetSpaceIdRef.current = isInside ? space.id : undefined;
		};

		const onPointerUp = () => {
			if (!hoveredRef.current) {
				return;
			}

			const entityId = activeDrag.data.entityId;
			const sourceRect =
				activeDrag.initialRect ??
				activeDrag.element?.getBoundingClientRect() ??
				null;
			const dropzoneRect = dropzone.getBoundingClientRect();
			const width = sourceRect?.width ?? defaultCardSize.width;
			const height = sourceRect?.height ?? defaultCardSize.height;
			const viewportX = dropzoneRect.left + (dropzoneRect.width - width) / 2;
			const viewportY = dropzoneRect.top + (dropzoneRect.height - height) / 2;

			pendingDropEntityIdRef.current = entityId;
			if (sourceRect) {
				pendingEntryRef.current.set(entityId, {
					viewportX: sourceRect.left + sourceRect.width / 2,
					viewportY: sourceRect.top + sourceRect.height / 2,
					size: { width: sourceRect.width, height: sourceRect.height },
				});
			}

			setLastDropResult({
				source: activeDrag.source,
				placed: true,
			});

			setIsDropzoneHovered(false);
			hoveredRef.current = false;
			targetSpaceIdRef.current = undefined;
			setDropAnimationTarget({
				entityId,
				row: 0,
				col: 0,
				viewportX,
				viewportY,
				width,
				height,
			});
		};

		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp);

		return () => {
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);
		};
	}, [
		activeDrag,
		defaultCardSize.height,
		defaultCardSize.width,
		onDropEntity,
		setDropAnimationTarget,
		setLastDropResult,
		space.id,
		targetSpaceIdRef,
	]);

	useEffect(() => {
		const pendingEntityId = pendingDropEntityIdRef.current;
		if (!pendingEntityId) {
			return;
		}

		// Wait until DragOverlay finishes its drop animation and clears drag state.
		if (activeDrag || dropAnimationTarget) {
			return;
		}

		pendingDropEntityIdRef.current = null;
		const placed = onDropEntity?.(pendingEntityId) ?? false;
		if (!placed) {
			pendingEntryRef.current.delete(pendingEntityId);
			setLastDropResult((previous) =>
				previous ? { ...previous, placed: false } : previous,
			);
		}
	}, [activeDrag, dropAnimationTarget, onDropEntity, setLastDropResult]);

	useEffect(() => {
		const pathElement = pathRef.current;
		if (!pathElement) {
			return;
		}

		const currentEntityIds = new Set(entities.map((entity) => entity.id));
		const pathLength = pathElement.getTotalLength();
		const pathStart = pathElement.getPointAtLength(0);
		setPathStartPoint({ x: pathStart.x, y: pathStart.y });

		for (const [entityId, animation] of timelinesRef.current.entries()) {
			if (!currentEntityIds.has(entityId)) {
				animation.kill();
				timelinesRef.current.delete(entityId);
				setEntityPositions((prev) => {
					const { [entityId]: _ignored, ...next } = prev;
					return next;
				});
				setEntitySizes((prev) => {
					const { [entityId]: _ignored, ...next } = prev;
					return next;
				});
			}
		}

		for (const entity of entities) {
			if (timelinesRef.current.has(entity.id)) {
				continue;
			}

			const pendingEntry = pendingEntryRef.current.get(entity.id);
			const entryPoint = pendingEntry
				? toPathCoordinates(pendingEntry.viewportX, pendingEntry.viewportY)
				: null;
			const initialPoint = entryPoint ?? pathStart;

			const renderSize: EntityRenderSize = pendingEntry?.size ?? {
				width: defaultCardSize.width,
				height: defaultCardSize.height,
			};
			setEntitySizes((prev) => ({ ...prev, [entity.id]: renderSize }));
			setEntityPositions((prev) => ({
				...prev,
				[entity.id]: { x: initialPoint.x, y: initialPoint.y },
			}));

			const state = { progress: 0, x: initialPoint.x, y: initialPoint.y };
			const timeline = gsap.timeline({
				onComplete: () => {
					timelinesRef.current.delete(entity.id);
					pendingEntryRef.current.delete(entity.id);
					setEntityPositions((prev) => {
						const { [entity.id]: _ignored, ...next } = prev;
						return next;
					});
					setEntitySizes((prev) => {
						const { [entity.id]: _ignored, ...next } = prev;
						return next;
					});
					onEntityPathComplete?.(entity.id);
				},
			});

			if (entryPoint) {
				timeline.to(state, {
					x: pathStart.x,
					y: pathStart.y,
					duration: 0.22,
					ease: "power2.out",
					onUpdate: () => {
						setEntityPositions((prev) => ({
							...prev,
							[entity.id]: { x: state.x, y: state.y },
						}));
					},
				});
			}

			timeline.to(state, {
				progress: 1,
				duration: space.duration,
				ease: "none",
				onUpdate: () => {
					const point = pathElement.getPointAtLength(
						pathLength * state.progress,
					);
					setEntityPositions((prev) => ({
						...prev,
						[entity.id]: { x: point.x, y: point.y },
					}));
				},
			});

			timeline.timeScale(speedMultiplier);
			timelinesRef.current.set(entity.id, timeline);
		}
	}, [
		defaultCardSize.height,
		defaultCardSize.width,
		entities,
		onEntityPathComplete,
		space.duration,
		speedMultiplier,
		toPathCoordinates,
	]);

	useEffect(() => {
		for (const animation of timelinesRef.current.values()) {
			animation.timeScale(speedMultiplier);
		}
	}, [speedMultiplier]);

	useEffect(() => {
		return () => {
			for (const animation of timelinesRef.current.values()) {
				animation.kill();
			}
			timelinesRef.current.clear();
			pendingEntryRef.current.clear();
		};
	}, []);

	return (
		<Box
			ref={containerRef}
			className="path-space-view"
			data-space-id={space.id}
			bg="gray.950"
			borderRadius="md"
			border="1px solid"
			borderColor="gray.800"
			p={{ base: 2, md: 3 }}
		>
			{title && (
				<Text fontSize="sm" fontWeight="bold" mb={3} color="gray.200">
					{title}
				</Text>
			)}

			<Flex direction="column" gap={3}>
				<Box ref={trackRef} position="relative" h="120px">
					<svg
						viewBox={space.viewBox}
						width="100%"
						height="100%"
						preserveAspectRatio="none"
					>
						<title>{`Path for ${space.name ?? space.id}`}</title>
						<path
							ref={pathRef}
							d={space.path}
							fill="none"
							stroke="#38bdf8"
							strokeWidth="4"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
					<Box
						ref={dropzoneRef}
						role="button"
						tabIndex={0}
						aria-label={`Drop items into ${space.name ?? space.id}`}
						position="absolute"
						left={`${(pathStartPoint.x / viewBoxSize.width) * 100}%`}
						top={`${(pathStartPoint.y / viewBoxSize.height) * 100}%`}
						transform="translate(-50%, -50%)"
						w={`${DROPZONE_CELL_WIDTH}px`}
						h={`${DROPZONE_CELL_HEIGHT}px`}
						border="1px dashed"
						borderColor={isDropzoneHovered ? "cyan.400" : "gray.700"}
						borderRadius="md"
						bg={isDropzoneHovered ? "cyan.900" : "transparent"}
						transition="border-color 0.15s ease, background-color 0.15s ease"
						display="flex"
						alignItems="center"
						justifyContent="center"
						pointerEvents="auto"
					>
						<Text fontSize="xs" color="gray.400">
							Drop
						</Text>
					</Box>

					{entities.map((entity) => {
						const point = entityPositions[entity.id];
						if (!point) {
							return null;
						}
						return (
							<Box
								key={entity.id}
								position="absolute"
								left={`${(point.x / viewBoxSize.width) * 100}%`}
								top={`${(point.y / viewBoxSize.height) * 100}%`}
								transform="translate(-50%, -50%)"
								bg="gray.700"
								color="gray.100"
								border="1px solid"
								borderColor="cyan.400"
								borderRadius="md"
								width={`${(entitySizes[entity.id] ?? defaultCardSize).width}px`}
								height={`${(entitySizes[entity.id] ?? defaultCardSize).height}px`}
								display="flex"
								alignItems="center"
								justifyContent="center"
								px={2}
								fontSize="sm"
								fontWeight="semibold"
								pointerEvents="none"
								whiteSpace="normal"
								textAlign="center"
							>
								{entity.name ?? entity.type}
							</Box>
						);
					})}
				</Box>
			</Flex>
		</Box>
	);
};
