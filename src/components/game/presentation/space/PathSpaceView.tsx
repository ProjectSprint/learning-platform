import { Box, Flex, Text } from "@chakra-ui/react";
import { gsap } from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EntityData } from "../../domain/entity/entity-data";
import type { PathSpaceData } from "../../domain/space/space-data";
import { useDragContext } from "../interaction/drag/DragContext";

type PathPoint = { x: number; y: number };

const parseViewBox = (viewBox: string): PathPoint => {
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
		return { x: 320, y: 120 };
	}
	return { x: width, y: height };
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
	const { activeDrag, setActiveDrag, setLastDropResult, targetSpaceIdRef } =
		useDragContext();
	const containerRef = useRef<HTMLDivElement | null>(null);
	const dropzoneRef = useRef<HTMLDivElement | null>(null);
	const pathRef = useRef<SVGPathElement | null>(null);
	const timelinesRef = useRef<Map<string, gsap.core.Tween>>(new Map());
	const [isDropzoneHovered, setIsDropzoneHovered] = useState(false);
	const [entityPositions, setEntityPositions] = useState<
		Record<string, PathPoint>
	>({});
	const hoveredRef = useRef(false);

	const viewBoxSize = useMemo(
		() => parseViewBox(space.viewBox),
		[space.viewBox],
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

			const placed = onDropEntity(activeDrag.data.entityId);
			setLastDropResult({
				source: activeDrag.source,
				placed,
			});

			setIsDropzoneHovered(false);
			hoveredRef.current = false;
			targetSpaceIdRef.current = undefined;

			if (placed) {
				setActiveDrag(null);
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
		onDropEntity,
		setActiveDrag,
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

		for (const [entityId, tween] of timelinesRef.current.entries()) {
			if (!currentEntityIds.has(entityId)) {
				tween.kill();
				timelinesRef.current.delete(entityId);
				setEntityPositions((prev) => {
					const { [entityId]: _ignored, ...next } = prev;
					return next;
				});
			}
		}

		for (const entity of entities) {
			if (timelinesRef.current.has(entity.id)) {
				continue;
			}

			const state = { progress: 0 };
			const tween = gsap.to(state, {
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
				onComplete: () => {
					timelinesRef.current.delete(entity.id);
					setEntityPositions((prev) => {
						const { [entity.id]: _ignored, ...next } = prev;
						return next;
					});
					onEntityPathComplete?.(entity.id);
				},
			});
			tween.timeScale(speedMultiplier);
			timelinesRef.current.set(entity.id, tween);
		}
	}, [entities, onEntityPathComplete, space.duration, speedMultiplier]);

	useEffect(() => {
		for (const tween of timelinesRef.current.values()) {
			tween.timeScale(speedMultiplier);
		}
	}, [speedMultiplier]);

	useEffect(() => {
		return () => {
			for (const tween of timelinesRef.current.values()) {
				tween.kill();
			}
			timelinesRef.current.clear();
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
				<Box
					ref={dropzoneRef}
					role="button"
					tabIndex={0}
					aria-label={`Drop items into ${space.name ?? space.id}`}
					bg={isDropzoneHovered ? "cyan.800" : "gray.800"}
					border="1px dashed"
					borderColor={isDropzoneHovered ? "cyan.300" : "gray.600"}
					borderRadius="md"
					px={3}
					py={2}
				>
					<Text fontSize="xs" color="gray.100">
						Dropzone
					</Text>
				</Box>

				<Box position="relative" h="120px">
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

					{entities.map((entity) => {
						const point = entityPositions[entity.id];
						if (!point) {
							return null;
						}
						return (
							<Box
								key={entity.id}
								position="absolute"
								left={`${(point.x / viewBoxSize.x) * 100}%`}
								top={`${(point.y / viewBoxSize.y) * 100}%`}
								transform="translate(-50%, -50%)"
								bg="gray.700"
								color="gray.100"
								border="1px solid"
								borderColor="cyan.400"
								borderRadius="md"
								px={2}
								py={1}
								fontSize="xs"
								pointerEvents="none"
								whiteSpace="nowrap"
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
