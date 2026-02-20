import {
	Box,
	CloseButton,
	Flex,
	Text,
	useBreakpointValue,
} from "@chakra-ui/react";
import {
	type MutableRefObject,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { DrawerInstance } from "@/components/game/types/drawer";
import { useDragContext } from "../interaction/drag/DragContext";
import { useDrawerStore } from "./drawer-context";
import { FloatingActionButton } from "./FloatingActionButton";

const TITLEBAR_HEIGHT = "48px";
const MOUSE_DEBOUNCE_MS = 0;

export interface DrawerPanelProps {
	drawer: DrawerInstance;
	children?: ReactNode;
}
export const DrawerPanel = ({ drawer, children }: DrawerPanelProps) => {
	const { openDrawer, closeDrawer, toggleDrawer } = useDrawerStore();
	const { activeDrag } = useDragContext();
	const drawerRef = useRef<HTMLDivElement | null>(null);
	const openTimeoutRef = useRef<number | null>(null);
	const closeTimeoutRef = useRef<number | null>(null);
	const [isDragTarget, setIsDragTarget] = useState(false);
	const isExpanded = drawer.state === "expanded";
	const isBase = useBreakpointValue({ base: true, sm: false }) ?? false;
	const spaceIds = useMemo(
		() => (drawer.spaceIds?.length ? drawer.spaceIds : [drawer.spaceId]),
		[drawer.spaceId, drawer.spaceIds],
	);

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
				activeDrag.sourceSpaceId &&
				!spaceIds.includes(activeDrag.sourceSpaceId) &&
				drawer.state === "folded"
			) {
				openDrawer(drawer.id);
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
	}, [activeDrag, drawer.id, drawer.state, openDrawer, spaceIds]);

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
				openDrawer(drawer.id);
				openTimeoutRef.current = null;
			}, MOUSE_DEBOUNCE_MS);
		};

		const scheduleClose = () => {
			if (closeTimeoutRef.current) return;
			closeTimeoutRef.current = window.setTimeout(() => {
				closeDrawer(drawer.id);
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
		drawer.id,
		drawer.mouseAware,
		drawer.state,
		closeDrawer,
		isBase,
		openDrawer,
	]);

	const contentTitle = drawer.title ?? drawer.spaceId ?? drawer.id;
	const titlebarBorder = isDragTarget ? "cyan.400" : "gray.700";
	const contentVisible =
		isExpanded ||
		!isBase ||
		(activeDrag?.sourceSpaceId
			? spaceIds.includes(activeDrag.sourceSpaceId)
			: false);

	return (
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
					onClick={() => toggleDrawer(drawer.id)}
				>
					<Text fontSize="sm" fontWeight="bold">
						{contentTitle ?? drawer.spaceId}
					</Text>
					<CloseButton
						aria-label="Close drawer"
						size="sm"
						onClick={(event) => {
							event.stopPropagation();
							closeDrawer(drawer.id);
						}}
					/>
				</Flex>
				<Box
					flex="1"
					overflow="auto"
					opacity={contentVisible ? 1 : 0}
					pointerEvents={contentVisible ? "auto" : "none"}
					transition="opacity 0.2s ease"
				>
					{children}
				</Box>
			</Box>
			{shouldShowFab ? (
				<FloatingActionButton
					label={floatingLabel}
					onClick={() => toggleDrawer(drawer.id)}
				/>
			) : null}
		</>
	);
};
