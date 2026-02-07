import {
	Box,
	CloseButton,
	Flex,
	Text,
	useBreakpointValue,
} from "@chakra-ui/react";
import {
	type MutableRefObject,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import type { DrawerInstance } from "../../core/types";
import type { SpaceData } from "../../domain/space/space-data";
import { GridSpace, PoolSpace } from "../../engine";
import { useGameDispatch, useGameState } from "../../game-provider";
import { useDragContext } from "../interaction/drag/DragContext";
import { FloatingActionButton } from "./FloatingActionButton";

const TITLEBAR_HEIGHT = "48px";
const MOUSE_DEBOUNCE_MS = 200;

export type DrawerContainerProps = {
	drawer: DrawerInstance;
};

const getDrawerSpaceTitle = (drawer: DrawerInstance, space?: SpaceData) => {
	if (drawer.title) return drawer.title;
	if (space?.name) return space.name;
	return undefined;
};

export const DrawerContainer = ({ drawer }: DrawerContainerProps) => {
	const dispatch = useGameDispatch();
	const state = useGameState();
	const { activeDrag } = useDragContext();
	const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
	const drawerRef = useRef<HTMLDivElement | null>(null);
	const openTimeoutRef = useRef<number | null>(null);
	const closeTimeoutRef = useRef<number | null>(null);
	const lastDragIdRef = useRef<string | null>(null);
	const [isDragTarget, setIsDragTarget] = useState(false);
	const isExpanded = drawer.state === "expanded";
	const isBase = useBreakpointValue({ base: true, sm: false }) ?? false;
	const space = state.spaces[drawer.spaceId];

	const position = drawer.position ?? "bottom";
	const positionProps = useMemo(() => {
		switch (position) {
			case "top":
				return { top: 0, left: 0, right: 0 } as const;
			case "left":
				return { top: 0, bottom: 0, left: 0 } as const;
			case "right":
				return { top: 0, bottom: 0, right: 0 } as const;
			default:
				return { bottom: 0, left: 0, right: 0 } as const;
		}
	}, [position]);

	const isHorizontal = position === "left" || position === "right";

	const expandedSize = useBreakpointValue(drawer.expandedSize ?? {});
	const foldedSize = useBreakpointValue({
		base: TITLEBAR_HEIGHT,
		...(drawer.foldedSize ?? {}),
	});
	const sizeValue = isExpanded
		? (expandedSize ?? "auto")
		: isBase
			? TITLEBAR_HEIGHT
			: (foldedSize ?? TITLEBAR_HEIGHT);

	const sizeStyles = isHorizontal
		? { width: sizeValue, height: "100%" }
		: { height: sizeValue, width: "100%" };

	const shouldShowFab =
		isBase && drawer.showFloatingButton && drawer.state === "folded";
	const floatingLabel =
		drawer.floatingButtonLabel ?? drawer.title ?? "Inventory";

	useEffect(() => {
		if (typeof document === "undefined") {
			return;
		}

		let container = document.getElementById("drawer-portal");
		if (!container) {
			container = document.createElement("div");
			container.id = "drawer-portal";
			document.body.appendChild(container);
		}
		setPortalTarget(container);

		return () => {
			setPortalTarget(null);
		};
	}, []);

	useEffect(() => {
		if (!activeDrag) {
			lastDragIdRef.current = null;
			return;
		}

		if (activeDrag.sourceSpaceId !== drawer.spaceId) {
			return;
		}

		if (lastDragIdRef.current === activeDrag.data.entityId) {
			return;
		}

		lastDragIdRef.current = activeDrag.data.entityId;
		dispatch({ type: "CLOSE_DRAWER", payload: { drawerId: drawer.id } });
	}, [activeDrag, dispatch, drawer.id, drawer.spaceId]);

	useEffect(() => {
		if (!activeDrag) {
			setIsDragTarget(false);
			return;
		}

		const handlePointerMove = (event: PointerEvent) => {
			if (!drawerRef.current) return;
			const rect = drawerRef.current.getBoundingClientRect();
			const isInside =
				event.clientX >= rect.left &&
				event.clientX <= rect.right &&
				event.clientY >= rect.top &&
				event.clientY <= rect.bottom;

			setIsDragTarget(isInside);

			if (
				isInside &&
				activeDrag.sourceSpaceId !== drawer.spaceId &&
				drawer.state === "folded"
			) {
				dispatch({ type: "OPEN_DRAWER", payload: { drawerId: drawer.id } });
			}
		};

		const handlePointerUp = () => {
			setIsDragTarget(false);
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [activeDrag, dispatch, drawer.id, drawer.spaceId, drawer.state]);

	useEffect(() => {
		const mouseAwareEnabled =
			drawer.mouseAware !== false && !isBase && !activeDrag;
		if (!mouseAwareEnabled) {
			return;
		}

		const clearTimer = (ref: MutableRefObject<number | null>) => {
			if (ref.current) {
				window.clearTimeout(ref.current);
				ref.current = null;
			}
		};

		const scheduleOpen = () => {
			if (openTimeoutRef.current) return;
			openTimeoutRef.current = window.setTimeout(() => {
				dispatch({ type: "OPEN_DRAWER", payload: { drawerId: drawer.id } });
				openTimeoutRef.current = null;
			}, MOUSE_DEBOUNCE_MS);
		};

		const scheduleClose = () => {
			if (closeTimeoutRef.current) return;
			closeTimeoutRef.current = window.setTimeout(() => {
				dispatch({ type: "CLOSE_DRAWER", payload: { drawerId: drawer.id } });
				closeTimeoutRef.current = null;
			}, MOUSE_DEBOUNCE_MS);
		};

		const handlePointerMove = (event: PointerEvent) => {
			if (!drawerRef.current) return;
			const rect = drawerRef.current.getBoundingClientRect();
			const isInside =
				event.clientX >= rect.left &&
				event.clientX <= rect.right &&
				event.clientY >= rect.top &&
				event.clientY <= rect.bottom;

			if (drawer.state === "folded") {
				if (isInside) {
					scheduleOpen();
				} else {
					clearTimer(openTimeoutRef);
				}
				return;
			}

			if (!isInside) {
				scheduleClose();
			} else {
				clearTimer(closeTimeoutRef);
			}
		};

		window.addEventListener("pointermove", handlePointerMove);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			clearTimer(openTimeoutRef);
			clearTimer(closeTimeoutRef);
		};
	}, [
		activeDrag,
		dispatch,
		drawer.id,
		drawer.mouseAware,
		drawer.state,
		isBase,
	]);

	if (!portalTarget) {
		return null;
	}

	if (drawer.contentType !== "space") {
		return null;
	}

	if (!space) {
		return null;
	}

	const contentTitle = getDrawerSpaceTitle(drawer, space);
	const titlebarBorder = isDragTarget ? "cyan.400" : "gray.700";

	return createPortal(
		<>
			<Box
				ref={drawerRef}
				position="fixed"
				zIndex={9000}
				bg="gray.900"
				color="gray.100"
				borderTopWidth="1px"
				borderColor="gray.800"
				overflow="hidden"
				transition="height 0.25s ease, width 0.25s ease"
				{...positionProps}
				{...sizeStyles}
				data-drawer-id={drawer.id}
			>
				<Flex
					align="center"
					justify="space-between"
					px={4}
					py={2}
					minH={TITLEBAR_HEIGHT}
					borderBottomWidth="1px"
					borderColor={titlebarBorder}
					cursor="pointer"
					role="button"
					aria-expanded={isExpanded}
					onClick={() =>
						dispatch({
							type: "TOGGLE_DRAWER",
							payload: { drawerId: drawer.id },
						})
					}
				>
					<Text fontSize="sm" fontWeight="bold">
						{contentTitle ?? drawer.spaceId}
					</Text>
					<CloseButton
						aria-label="Close drawer"
						size="sm"
						onClick={(event) => {
							event.stopPropagation();
							dispatch({
								type: "CLOSE_DRAWER",
								payload: { drawerId: drawer.id },
							});
						}}
					/>
				</Flex>
				<Box
					flex="1"
					overflow="auto"
					opacity={isExpanded ? 1 : 0}
					pointerEvents={isExpanded ? "auto" : "none"}
					transition="opacity 0.2s ease"
				>
					{space.kind === "grid" ? (
						<GridSpace id={space.id} title={contentTitle} />
					) : (
						<PoolSpace id={space.id} title={contentTitle} />
					)}
				</Box>
			</Box>
			{shouldShowFab ? (
				<FloatingActionButton
					label={floatingLabel}
					onClick={() =>
						dispatch({
							type: "TOGGLE_DRAWER",
							payload: { drawerId: drawer.id },
						})
					}
				/>
			) : null}
		</>,
		portalTarget,
	);
};
