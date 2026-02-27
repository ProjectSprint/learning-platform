import { Box, Flex, Text } from "@chakra-ui/react";
import { gsap } from "gsap";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EntityData } from "@/components/game/types/entity";
import type { PathSpaceData } from "@/components/game/types/space";
import { useDragContext } from "../interaction/drag/DragContext";
import { useEntityCardSize } from "../interaction/drag/DragOverlay";

type PathPoint = { x: number; y: number };
type PathViewBox = { width: number; height: number };
type EntityRenderSize = { width: number; height: number };
const DROPZONE_CELL_WIDTH = 64;
const DROPZONE_CELL_HEIGHT = 60;
const MIN_FLOW_SEGMENT_LENGTH = 24;
const MAX_FLOW_SEGMENT_LENGTH = 140;
const INITIAL_FLOW_GAP = 10000;
const FLOW_HEAD_TRAVEL_SECONDS = 2.4;
const BASE_PATH_STROKE = "#4B5563";
const BASE_PATH_STROKE_WIDTH = 4;
const FLOW_STROKE_WIDTH = 6;
const FLOW_LAYER_CONFIG = [
	{ opacity: 0.24, tailScale: 1.6 },
	{ opacity: 0.52, tailScale: 1.2 },
	{ opacity: 1, tailScale: 0.78 },
] as const;

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

export interface PathSpaceViewProps {
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
}
export const PathSpaceView = ({
	space,
	path,
	entities,
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
	const flowLayerRefs = useRef<Array<SVGPathElement | null>>([]);
	const flowAnimationRef = useRef<gsap.core.Timeline | null>(null);
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

	const [svgContainerWidth, setSvgContainerWidth] = useState(0);
	const [svgContainerHeight, setSvgContainerHeight] = useState(0);

	// Compute the actual SVG scale and centering offset produced by
	// preserveAspectRatio="xMidYMid meet" so entity cards stay aligned
	// with the visible path regardless of the container's aspect ratio.
	const svgTransform = useMemo(() => {
		if (svgContainerWidth <= 0 || svgContainerHeight <= 0) {
			return { scale: 1, offsetX: 0, offsetY: 0 };
		}
		const scale = Math.min(
			svgContainerWidth / viewBoxSize.width,
			svgContainerHeight / viewBoxSize.height,
		);
		return {
			scale,
			offsetX: (svgContainerWidth - viewBoxSize.width * scale) / 2,
			offsetY: (svgContainerHeight - viewBoxSize.height * scale) / 2,
		};
	}, [svgContainerWidth, svgContainerHeight, viewBoxSize]);

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
		const element = trackRef.current;
		if (!element) return;
		const update = () => {
			setSvgContainerWidth(element.clientWidth);
			setSvgContainerHeight(element.clientHeight);
		};
		update();
		const observer = new ResizeObserver(update);
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		void renderedPath;
		const flowLayerElements: SVGPathElement[] = [];
		for (let i = 0; i < FLOW_LAYER_CONFIG.length; i += 1) {
			const flowLayerElement = flowLayerRefs.current[i];
			if (!flowLayerElement) {
				return;
			}
			flowLayerElements.push(flowLayerElement);
		}

		flowAnimationRef.current?.kill();

		const pathLength = flowLayerElements[0].getTotalLength();
		const baseSegmentLength = Math.max(
			MIN_FLOW_SEGMENT_LENGTH,
			Math.min(MAX_FLOW_SEGMENT_LENGTH, pathLength * 0.2),
		);
		const layerSegmentLengths = FLOW_LAYER_CONFIG.map((layer) =>
			Math.max(
				MIN_FLOW_SEGMENT_LENGTH,
				Math.min(MAX_FLOW_SEGMENT_LENGTH, baseSegmentLength * layer.tailScale),
			),
		);
		const longestSegmentLength = Math.max(...layerSegmentLengths);
		const travelLength = pathLength + longestSegmentLength;
		const cycleDurationSeconds =
			FLOW_HEAD_TRAVEL_SECONDS * (travelLength / pathLength);
		const flowState = { progress: 0 };

		const applyFlowSegment = () => {
			const progress = Math.max(0, Math.min(1, flowState.progress));
			const distance = progress * travelLength;
			const head = Math.min(distance, pathLength);
			for (const [index, flowLayerElement] of flowLayerElements.entries()) {
				const layerSegmentLength = layerSegmentLengths[index];
				const layerOpacity = FLOW_LAYER_CONFIG[index].opacity;
				const tail = Math.max(0, distance - layerSegmentLength);
				const visibleLength = Math.max(0, head - tail);

				if (visibleLength <= 0.0001) {
					flowLayerElement.setAttribute("stroke-dasharray", `0 ${pathLength}`);
					flowLayerElement.setAttribute("stroke-dashoffset", "0");
					flowLayerElement.setAttribute("stroke-linecap", "butt");
					flowLayerElement.setAttribute("stroke-opacity", "0");
					continue;
				}

				flowLayerElement.setAttribute(
					"stroke-dasharray",
					`${visibleLength} ${pathLength}`,
				);
				flowLayerElement.setAttribute("stroke-dashoffset", `${-tail}`);
				flowLayerElement.setAttribute("stroke-linecap", "round");
				flowLayerElement.setAttribute("stroke-opacity", `${layerOpacity}`);
			}
		};

		applyFlowSegment();

		const flowTimeline = gsap.timeline({
			repeat: -1,
			onRepeat: () => {
				flowState.progress = 0;
				applyFlowSegment();
			},
		});
		flowTimeline.to(
			flowState,
			{
				progress: 1,
				duration: cycleDurationSeconds,
				ease: "none",
				onUpdate: applyFlowSegment,
			},
			0,
		);

		flowAnimationRef.current = flowTimeline;

		return () => {
			flowTimeline.kill();
			if (flowAnimationRef.current === flowTimeline) {
				flowAnimationRef.current = null;
			}
		};
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

			const startProgress =
				typeof entity.data.pathStartProgress === "number"
					? Math.max(0, Math.min(1, entity.data.pathStartProgress))
					: 0;
			const initialPoint =
				startProgress > 0
					? pathElement.getPointAtLength(pathLength * startProgress)
					: pathStart;

			setEntityPositions((prev) => ({
				...prev,
				[entity.id]: { x: initialPoint.x, y: initialPoint.y },
			}));
			resumeTokensRef.current.set(entity.id, getResumeToken(entity));

			const state = { progress: startProgress, opacity: 1 };
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
			const startsAtOrPastMidpoint = startProgress >= 0.5;

			if (pauseAtMidpoint) {
				if (!startsAtOrPastMidpoint) {
					// First half: animate from startProgress to midpoint
					const firstHalfDuration =
						(space.duration / 2) * (1 - startProgress * 2);
					timeline.to(state, {
						progress: 0.5,
						duration: firstHalfDuration,
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
				}
				// Fire midpoint notification, pause, then play second half on resume
				timeline.add(() => {
					if (!midpointNotifiedRef.current.has(entity.id)) {
						midpointNotifiedRef.current.add(entity.id);
						onEntityPathMidpoint?.(entity.id);
					}
					pausedAtMidpointRef.current.add(entity.id);
					timeline.pause();
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
			} else {
				const remainingDuration = space.duration * (1 - startProgress);
				timeline.to(state, {
					progress: 1,
					duration: remainingDuration,
					ease: "power2.inOut",
					onUpdate: () => {
						const point = pathElement.getPointAtLength(
							pathLength * state.progress,
						);
						setEntityPositions((prev) => ({
							...prev,
							[entity.id]: { x: point.x, y: point.y },
						}));
						if (
							state.progress >= 0.5 &&
							!midpointNotifiedRef.current.has(entity.id)
						) {
							midpointNotifiedRef.current.add(entity.id);
							onEntityPathMidpoint?.(entity.id);
						}
					},
				});
			}
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
		const clampedSpeed = Math.max(0.25, Math.min(speedMultiplier, 3));
		flowAnimationRef.current?.timeScale(clampedSpeed);
	}, [speedMultiplier]);

	useEffect(() => {
		for (const animation of timelinesRef.current.values()) {
			animation.timeScale(speedMultiplier);
		}
	}, [speedMultiplier]);

	useEffect(() => {
		return () => {
			flowAnimationRef.current?.kill();
			flowAnimationRef.current = null;
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
			position="relative"
		>
			<Flex direction="column">
				<Box ref={trackRef} position="relative" h="120px" overflow="visible">
					<svg viewBox={space.viewBox} width="100%" height="100%">
						<title>{`Path for ${space.name ?? space.id}`}</title>
						<path
							d={renderedPath}
							fill="none"
							stroke={BASE_PATH_STROKE}
							strokeWidth={BASE_PATH_STROKE_WIDTH}
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						{FLOW_LAYER_CONFIG.map((layer, index) => (
							<path
								key={`flow-layer-${layer.opacity}-${layer.tailScale}`}
								ref={(node) => {
									flowLayerRefs.current[index] = node;
								}}
								d={renderedPath}
								fill="none"
								stroke="#CBD5E1"
								strokeOpacity={layer.opacity}
								strokeWidth={FLOW_STROKE_WIDTH}
								strokeLinecap="butt"
								strokeLinejoin="round"
								strokeDasharray={`0 ${INITIAL_FLOW_GAP}`}
								strokeDashoffset="0"
							/>
						))}
						<path
							ref={pathRef}
							d={renderedPath}
							fill="none"
							stroke="transparent"
							strokeWidth="1"
							pointerEvents="none"
						/>
					</svg>
					{showDropzone ? (
						<Box
							ref={dropzoneRef}
							role="button"
							tabIndex={0}
							aria-label={`Drop items into ${space.name ?? space.id}`}
							position="absolute"
							left={`${svgTransform.offsetX + pathStartPoint.x * svgTransform.scale}px`}
							top={`${svgTransform.offsetY + pathStartPoint.y * svgTransform.scale}px`}
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
								left={`${svgTransform.offsetX + point.x * svgTransform.scale}px`}
								top={`${svgTransform.offsetY + point.y * svgTransform.scale}px`}
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
