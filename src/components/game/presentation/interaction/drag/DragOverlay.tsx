/**
 * DragOverlay component.
 * Provides visual feedback during drag operations.
 * Shows a floating preview of the entity being dragged.
 *
 * Migrated from puzzle/drag/overlay.tsx but works with the Space/Entity model.
 * Maintains identical visual design and animation behavior.
 */

import { Box, Text, useBreakpointValue } from "@chakra-ui/react";
import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";
import { useDragContext } from "./DragContext";

/**
 * Props for the DragOverlay component.
 */
export type DragOverlayProps = {
	/** Function to get display label for an entity type */
	getEntityLabel?: (entityType: string) => string;
};

/**
 * Default label formatter.
 */
const defaultGetEntityLabel = (entityType: string) =>
	entityType.charAt(0).toUpperCase() + entityType.slice(1);

/**
 * Hook to get the size of entity cards.
 * Uses responsive breakpoints for consistent sizing.
 */
export const useEntityCardSize = () => {
	const width = useBreakpointValue({ base: 120, sm: 132, md: 150 }) ?? 150;
	const height = useBreakpointValue({ base: 52, sm: 58, md: 64 }) ?? 64;
	return { width, height };
};

/**
 * DragOverlay component.
 * Renders a floating visual proxy of the entity being dragged.
 * Follows the pointer during drag operations.
 *
 * @example
 * ```tsx
 * <DragOverlay getEntityLabel={(type) => type.toUpperCase()} />
 * ```
 */
export const DragOverlay = ({
	getEntityLabel = defaultGetEntityLabel,
}: DragOverlayProps) => {
	const { activeDrag, proxyRef } = useDragContext();
	const cardSize = useEntityCardSize();
	const cardSizeRef = useRef({
		width: cardSize.width,
		height: cardSize.height,
	});
	const [isVisible, setIsVisible] = useState(false);
	const [size, setSize] = useState({ width: 0, height: 0 });
	const initializedRef = useRef(false);
	const pointerOffsetRef = useRef({ x: 0, y: 0 });

	// Initialize card size ref once on mount
	useEffect(() => {
		cardSizeRef.current = { width: cardSize.width, height: cardSize.height };
	}, [cardSize.height, cardSize.width]);

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

		const targetWidth = cardSizeRef.current.width;
		const targetHeight = cardSizeRef.current.height;

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
		activeDrag.data.entityName ?? getEntityLabel(activeDrag.data.entityType);
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
