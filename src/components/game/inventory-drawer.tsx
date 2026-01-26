import { Box, Flex, Text, useBreakpointValue } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useDragContext } from "./drag-context";
import { InventoryPanel, type InventoryPanelProps } from "./inventory-panel";

type InventoryDrawerProps = InventoryPanelProps & {
	drawerWidth?: string;
	hoverGutterWidth?: string;
	closeGutterWidth?: string;
};

export const InventoryDrawer = ({
	tooltips,
	drawerWidth,
	hoverGutterWidth = "10vw",
	closeGutterWidth,
}: InventoryDrawerProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const [openSource, setOpenSource] = useState<"button" | "hover" | "auto">(
		"button",
	);
	const [hoverLocked, setHoverLocked] = useState(false);
	const { activeDrag, lastDropResult, setLastDropResult } = useDragContext();
	const isMdOrBelow = useBreakpointValue({ base: true, md: true, lg: false }) ?? true;
	const resolvedDrawerWidth =
		drawerWidth ??
		(useBreakpointValue({ base: "80vw", md: "320px" }) ?? "320px");
	const resolvedCloseGutterWidth =
		closeGutterWidth ?? `calc(100vw - ${resolvedDrawerWidth})`;

	useEffect(() => {
		if (!activeDrag) {
			return;
		}
		setIsOpen(false);
		setLastDropResult(null);
	}, [activeDrag, setLastDropResult]);

	useEffect(() => {
		if (!lastDropResult || activeDrag) {
			return;
		}

		if (lastDropResult.source === "inventory" && !lastDropResult.placed) {
			setIsOpen(true);
			setOpenSource("auto");
			setHoverLocked(false);
		}

		setLastDropResult(null);
	}, [activeDrag, lastDropResult, setLastDropResult]);

	const handleToggle = useCallback(() => {
		setIsOpen((prev) => {
			const next = !prev;
			if (next) {
				setOpenSource("button");
				setHoverLocked(false);
			} else {
				setHoverLocked(true);
			}
			return next;
		});
		setLastDropResult(null);
	}, [setLastDropResult]);

	const handleClose = useCallback(
		(reason: "x" | "gutter" | "drag") => {
			setIsOpen(false);
			if (reason === "x" && openSource === "button") {
				setHoverLocked(true);
			}
			setLastDropResult(null);
		},
		[openSource, setLastDropResult],
	);

	useEffect(() => {
		if (!hoverLocked || !isMdOrBelow) {
			return;
		}

		const resolveWidth = (value: string) => {
			if (value.endsWith("vw")) {
				const ratio = Number.parseFloat(value);
				if (Number.isNaN(ratio)) return 0;
				return (window.innerWidth * ratio) / 100;
			}
			if (value.endsWith("px")) {
				const px = Number.parseFloat(value);
				return Number.isNaN(px) ? 0 : px;
			}
			return 0;
		};

		const gutterWidthPx = resolveWidth(hoverGutterWidth);
		const handlePointerMove = (event: PointerEvent) => {
			if (event.clientX < window.innerWidth - gutterWidthPx) {
				setHoverLocked(false);
			}
		};

		window.addEventListener("pointermove", handlePointerMove);
		return () => window.removeEventListener("pointermove", handlePointerMove);
	}, [hoverGutterWidth, hoverLocked, isMdOrBelow]);

	const hoverZone = useMemo(() => {
		if (!isMdOrBelow || isOpen) {
			return null;
		}

		return (
			<Box
				position="fixed"
				top={0}
				right={0}
				height="100vh"
				width={hoverGutterWidth}
				zIndex={90}
				onMouseEnter={() => {
					if (!activeDrag && !hoverLocked) {
						setIsOpen(true);
						setOpenSource("hover");
					}
				}}
			/>
		);
	}, [activeDrag, hoverGutterWidth, hoverLocked, isMdOrBelow, isOpen]);

	if (!isMdOrBelow) {
		return (
			<Box alignSelf="center" my={4}>
				<InventoryPanel tooltips={tooltips} />
			</Box>
		);
	}

	return (
		<>
			{hoverZone}

			<Box
				as="button"
				position="fixed"
				top={3}
				right={3}
				zIndex={1200}
				bg="gray.900"
				border="1px solid"
				borderColor="gray.700"
				color="gray.100"
				borderRadius="md"
				width="36px"
				height="36px"
				display="flex"
				alignItems="center"
				justifyContent="center"
				fontSize="lg"
				onClick={handleToggle}
				aria-label={isOpen ? "Close inventory drawer" : "Open inventory drawer"}
			>
				{isOpen ? "✕" : "☰"}
			</Box>

			{isOpen && isMdOrBelow && (
				<Box
					position="fixed"
					top={0}
					right={resolvedDrawerWidth}
					height="100vh"
					width={resolvedCloseGutterWidth}
					zIndex={950}
					bg="transparent"
					onPointerDown={() => handleClose("gutter")}
					aria-hidden
				/>
			)}

			<Box
				position="fixed"
				top={0}
				right={0}
				height="100vh"
				width={resolvedDrawerWidth}
				bg="gray.900"
				borderLeft="1px solid"
				borderColor="gray.800"
				transform={isOpen ? "translateX(0)" : "translateX(100%)"}
				transition="transform 0.2s ease"
				zIndex={1000}
				pointerEvents={isOpen ? "auto" : "none"}
				onMouseLeave={() => {
					if (!activeDrag) {
						handleClose("gutter");
					}
				}}
			>
				<Flex direction="column" height="100%">
					<Flex
						align="center"
						justify="space-between"
						px={4}
						py={3}
						borderBottom="1px solid"
						borderColor="gray.800"
					>
						<Text fontSize="sm" fontWeight="bold" color="gray.100">
							Inventory
						</Text>
						<Box
							as="button"
							onClick={() => handleClose("x")}
							aria-label="Close inventory drawer"
							color="gray.400"
							_hover={{ color: "gray.100" }}
						>
							✕
						</Box>
					</Flex>

					<Box flex="1" overflowY="auto" px={4} py={4}>
						<InventoryPanel tooltips={tooltips} />
					</Box>
				</Flex>
			</Box>
		</>
	);
};
