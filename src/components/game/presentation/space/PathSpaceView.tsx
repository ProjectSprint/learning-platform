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
	/** Optional rendered path override (e.g., responsive breakpoint path) */
	path?: string;
	entities: EntityData[];
	title?: string;
	speedMultiplier: number;
	showDropzone?: boolean;
	onDropEntity?: (entityId: string) => boolean;
	onEntityPathMidpoint?: (entityId: string) => void;
	onEntityPathComplete?: (entityId: string) => void;
};

export const PathSpaceView = ({
	space,
	path,
	entities,
	title,
	speedMultiplier,
	showDropzone = true,
	onDropEntity,
	onEntityPathMidpoint,
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
	const pausedAtMidpointRef = useRef<Set<string>>(new Set());
	const midpointNotifiedRef = useRef<Set<string>>(new Set());
	const resumeTokensRef = useRef<Map<string, number>>(new Map());
	const pendingTransitRef = useRef<Set<string>>(new Set());
	const [entitySizes, setEntitySizes] = useState<
		Record<string, EntityRenderSize>
	>({});
	const [entityOpacities, setEntityOpacities] = useState<
		Record<string, number>
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
	const defaultCardSize = useEntityCardSize();

	const viewBoxSize = useMemo(
		() => parseViewBox(space.viewBox),
		[space.viewBox],
	);
	const renderedPath = path ?? space.path;
	const getResumeToken = useCallback((entity: EntityData): number => {
		const raw = entity.data.pathResumeToken;
		return typeof raw === "number" ? raw : 0;
	}, []);

	useEffect(() => {
		void renderedPath;
		const pathElement = pathRef.current;
		if (!pathElement) {
			return;
		}
		const pathStart = pathElement.getPointAtLength(0);
		setPathStartPoint({ x: pathStart.x, y: pathStart.y });
	}, [renderedPath]);

	useEffect(() => {
		if (!showDropzone || !activeDrag || !dropzoneRef.current || !onDropEntity) {
			setIsDropzoneHovered(false);
			hoveredRef.current = false;
			targetSpaceIdRef.current = undefined;
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
			const placed = onDropEntity(entityId);
			setLastDropResult({
				source: activeDrag.source,
				placed,
			});

			const sourceRect =
				activeDrag.initialRect ??
				activeDrag.element?.getBoundingClientRect() ??
				null;
			const dropzoneRect = dropzone.getBoundingClientRect();
			const width = sourceRect?.width ?? defaultCardSize.width;
			const height = sourceRect?.height ?? defaultCardSize.height;
			const viewportX = dropzoneRect.left + (dropzoneRect.width - width) / 2;
			const viewportY = dropzoneRect.top + (dropzoneRect.height - height) / 2;

			setIsDropzoneHovered(false);
			hoveredRef.current = false;
			targetSpaceIdRef.current = undefined;

			if (placed) {
				pendingTransitRef.current.add(entityId);
				setEntitySizes((prev) => ({ ...prev, [entityId]: { width, height } }));
				setDropAnimationTarget({
					entityId,
					row: 0,
					col: 0,
					viewportX,
					viewportY,
					width,
					height,
				});
			}
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
		showDropzone,
		setDropAnimationTarget,
		setLastDropResult,
		space.id,
		targetSpaceIdRef,
	]);

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
				pausedAtMidpointRef.current.delete(entityId);
				midpointNotifiedRef.current.delete(entityId);
				resumeTokensRef.current.delete(entityId);
				setEntityPositions((prev) => {
					const { [entityId]: _ignored, ...next } = prev;
					return next;
				});
				setEntitySizes((prev) => {
					const { [entityId]: _ignored, ...next } = prev;
					return next;
				});
				setEntityOpacities((prev) => {
					const { [entityId]: _ignored, ...next } = prev;
					return next;
				});
			}
		}

		for (const entity of entities) {
			if (timelinesRef.current.has(entity.id)) {
				continue;
			}

			if (pendingTransitRef.current.has(entity.id)) {
				if (activeDrag || dropAnimationTarget) {
					continue;
				}
				pendingTransitRef.current.delete(entity.id);
			}

			const renderSize: EntityRenderSize = entitySizes[entity.id] ?? {
				width: defaultCardSize.width,
				height: defaultCardSize.height,
			};
			setEntitySizes((prev) => ({ ...prev, [entity.id]: renderSize }));
			setEntityOpacities((prev) => ({ ...prev, [entity.id]: 1 }));
			setEntityPositions((prev) => ({
				...prev,
				[entity.id]: { x: pathStart.x, y: pathStart.y },
			}));
			resumeTokensRef.current.set(entity.id, getResumeToken(entity));

			const state = { progress: 0, opacity: 1 };
			const timeline = gsap.timeline({
				onComplete: () => {
					timelinesRef.current.delete(entity.id);
					pausedAtMidpointRef.current.delete(entity.id);
					midpointNotifiedRef.current.delete(entity.id);
					resumeTokensRef.current.delete(entity.id);
					setEntityPositions((prev) => {
						const { [entity.id]: _ignored, ...next } = prev;
						return next;
					});
					setEntitySizes((prev) => {
						const { [entity.id]: _ignored, ...next } = prev;
						return next;
					});
					setEntityOpacities((prev) => {
						const { [entity.id]: _ignored, ...next } = prev;
						return next;
					});
					onEntityPathComplete?.(entity.id);
				},
			});

			const pauseAtMidpoint = entity.data.pathPauseAtMidpoint === true;
			timeline.to(state, {
				progress: 0.5,
				duration: space.duration / 2,
				ease: "power2.inOut",
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
			timeline.add(() => {
				if (!midpointNotifiedRef.current.has(entity.id)) {
					midpointNotifiedRef.current.add(entity.id);
					onEntityPathMidpoint?.(entity.id);
				}
				if (pauseAtMidpoint) {
					pausedAtMidpointRef.current.add(entity.id);
					timeline.pause();
				}
			});
			timeline.to(state, {
				progress: 1,
				duration: space.duration / 2,
				ease: "power2.inOut",
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
			timeline.to(state, {
				opacity: 0,
				duration: 0.18,
				ease: "power1.out",
				onUpdate: () => {
					setEntityOpacities((prev) => ({
						...prev,
						[entity.id]: state.opacity,
					}));
				},
			});

			timeline.timeScale(speedMultiplier);
			timelinesRef.current.set(entity.id, timeline);
			timeline.play();
		}
	}, [
		defaultCardSize.height,
		defaultCardSize.width,
		dropAnimationTarget,
		entitySizes,
		entities,
		onEntityPathMidpoint,
		onEntityPathComplete,
		space.duration,
		speedMultiplier,
		activeDrag,
		getResumeToken,
	]);

	useEffect(() => {
		if (entities.length === 0) {
			return;
		}
		for (const entity of entities) {
			if (!pausedAtMidpointRef.current.has(entity.id)) {
				continue;
			}
			const nextToken = getResumeToken(entity);
			const prevToken = resumeTokensRef.current.get(entity.id) ?? 0;
			if (nextToken === prevToken) {
				continue;
			}
			resumeTokensRef.current.set(entity.id, nextToken);
			const timeline = timelinesRef.current.get(entity.id);
			if (!timeline) {
				continue;
			}
			pausedAtMidpointRef.current.delete(entity.id);
			timeline.play();
		}
	}, [entities, getResumeToken]);

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
			pausedAtMidpointRef.current.clear();
			midpointNotifiedRef.current.clear();
			resumeTokensRef.current.clear();
			pendingTransitRef.current.clear();
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
							d={renderedPath}
							fill="none"
							stroke="#38bdf8"
							strokeWidth="4"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
					{showDropzone ? (
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
							bg={isDropzoneHovered ? "cyan.900" : "gray.900"}
							transition="border-color 0.15s ease, background-color 0.15s ease"
							display="flex"
							alignItems="center"
							justifyContent="center"
							pointerEvents="auto"
							zIndex={2}
							boxShadow="0 0 0 1px rgba(0, 0, 0, 0.25)"
						>
							<Text fontSize="xs" color="gray.300">
								Drop
							</Text>
						</Box>
					) : null}

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
								zIndex={3}
								opacity={entityOpacities[entity.id] ?? 1}
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
