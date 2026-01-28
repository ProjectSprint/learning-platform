import { Box, Text } from "@chakra-ui/react";
import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";
import { useInventorySlotSize } from "../inventory";
import { useDragContext } from "./context";

type DragOverlayProps = {
	getItemLabel?: (itemType: string) => string;
};

const defaultGetItemLabel = (itemType: string) =>
	itemType.charAt(0).toUpperCase() + itemType.slice(1);

export const DragOverlay = ({
	getItemLabel = defaultGetItemLabel,
}: DragOverlayProps) => {
	const { activeDrag, proxyRef } = useDragContext();
	const slotSize = useInventorySlotSize();
	const slotSizeRef = useRef({
		width: slotSize.width,
		height: slotSize.height,
	});
	const [isVisible, setIsVisible] = useState(false);
	const [size, setSize] = useState({ width: 0, height: 0 });
	const initializedRef = useRef(false);
	const pointerOffsetRef = useRef({ x: 0, y: 0 });

	// Initialize slot size ref once on mount
	useEffect(() => {
		slotSizeRef.current = { width: slotSize.width, height: slotSize.height };
	}, [slotSize.height, slotSize.width]);

	useEffect(() => {
		if (!activeDrag) {
			setIsVisible(false);
			initializedRef.current = false;
			if (proxyRef.current) {
				gsap.set(proxyRef.current, { clearProps: "all" });
			}
			return;
		}

		const initialRect = activeDrag.initialRect;
		if (!initialRect) {
			setIsVisible(false);
			return;
		}

		const targetWidth = slotSizeRef.current.width;
		const targetHeight = slotSizeRef.current.height;

		pointerOffsetRef.current = {
			x: targetWidth / 2,
			y: targetHeight / 2,
		};

		setSize({ width: targetWidth, height: targetHeight });
		setIsVisible(true);

		const initializePosition = () => {
			if (!proxyRef.current || initializedRef.current) {
				return;
			}

			const pointerX = activeDrag.pointerOffset?.x ?? initialRect.width / 2;
			const pointerY = activeDrag.pointerOffset?.y ?? initialRect.height / 2;

			gsap.set(proxyRef.current, {
				x: initialRect.left + pointerX - pointerOffsetRef.current.x,
				y: initialRect.top + pointerY - pointerOffsetRef.current.y,
				width: targetWidth,
				height: targetHeight,
			});
			initializedRef.current = true;
		};

		if (proxyRef.current) {
			initializePosition();
		} else {
			requestAnimationFrame(initializePosition);
		}

		const handlePointerMove = (event: PointerEvent) => {
			if (proxyRef.current) {
				gsap.set(proxyRef.current, {
					x: event.clientX - pointerOffsetRef.current.x,
					y: event.clientY - pointerOffsetRef.current.y,
				});
			}
		};

		window.addEventListener("pointermove", handlePointerMove);
		return () => window.removeEventListener("pointermove", handlePointerMove);
	}, [activeDrag, proxyRef]);

	if (!isVisible || !activeDrag) {
		return null;
	}

	const label =
		activeDrag.data.itemName ?? getItemLabel(activeDrag.data.itemType);
	const initialRect = activeDrag.initialRect;
	const pointerX =
		activeDrag.pointerOffset?.x ?? (initialRect ? initialRect.width / 2 : 0);
	const pointerY =
		activeDrag.pointerOffset?.y ?? (initialRect ? initialRect.height / 2 : 0);
	const initialX = initialRect
		? initialRect.left + pointerX - pointerOffsetRef.current.x
		: 0;
	const initialY = initialRect
		? initialRect.top + pointerY - pointerOffsetRef.current.y
		: 0;

	return (
		<Box
			ref={proxyRef}
			position="fixed"
			top={0}
			left={0}
			width={`${size.width}px`}
			height={`${size.height}px`}
			bg="gray.800"
			border="1px solid"
			borderColor="cyan.500"
			borderRadius="md"
			display="flex"
			alignItems="center"
			justifyContent="center"
			pointerEvents="none"
			zIndex={9999}
			boxShadow="0 4px 20px rgba(0, 0, 0, 0.3)"
			style={{ transform: `translate3d(${initialX}px, ${initialY}px, 0)` }}
		>
			<Text fontSize="sm" fontWeight="bold" color="gray.100">
				{label}
			</Text>
		</Box>
	);
};
