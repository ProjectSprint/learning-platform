import { Box, Text } from "@chakra-ui/react";
import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";

import { useDragContext } from "./drag-context";

type DragOverlayProps = {
	getItemLabel?: (itemType: string) => string;
};

const defaultGetItemLabel = (itemType: string) =>
	itemType.charAt(0).toUpperCase() + itemType.slice(1);

export const DragOverlay = ({
	getItemLabel = defaultGetItemLabel,
}: DragOverlayProps) => {
	const { activeDrag, proxyRef } = useDragContext();
	const [isVisible, setIsVisible] = useState(false);
	const [size, setSize] = useState({ width: 0, height: 0 });
	const initializedRef = useRef(false);

	useEffect(() => {
		if (!activeDrag || activeDrag.source !== "inventory") {
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

		setSize({ width: initialRect.width, height: initialRect.height });
		setIsVisible(true);

		const initializePosition = () => {
			if (proxyRef.current && !initializedRef.current) {
				gsap.set(proxyRef.current, {
					x: initialRect.left,
					y: initialRect.top,
					width: initialRect.width,
					height: initialRect.height,
				});
				initializedRef.current = true;
			}
		};

		requestAnimationFrame(initializePosition);

		const handlePointerMove = (event: PointerEvent) => {
			if (proxyRef.current) {
				gsap.set(proxyRef.current, {
					x: event.clientX - initialRect.width / 2,
					y: event.clientY - initialRect.height / 2,
				});
			}
		};

		window.addEventListener("pointermove", handlePointerMove);
		return () => window.removeEventListener("pointermove", handlePointerMove);
	}, [activeDrag, proxyRef]);

	if (!isVisible || !activeDrag || activeDrag.source !== "inventory") {
		return null;
	}

	const label =
		activeDrag.data.itemName ?? getItemLabel(activeDrag.data.itemType);

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
		>
			<Text fontSize="sm" fontWeight="bold" color="gray.100">
				{label}
			</Text>
		</Box>
	);
};
