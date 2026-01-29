import { Box, Flex, Text, useBreakpointValue } from "@chakra-ui/react";
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";

import { useGameState } from "@/components/game/game-provider";
import { useDragContext } from "../drag";
import { InventoryPanel, type InventoryPanelProps } from "./inventory-panel";

export type InventoryDrawerHandle = {
	expand: () => void;
	fold: () => void;
	toggle: () => void;
};

type InventoryDrawerProps = InventoryPanelProps & {
	drawerWidth?: string;
	hoverGutterWidth?: string;
	closeGutterWidth?: string;
	initialExpanded?: boolean;
	expandedHeight?: string;
	foldedHeights?: Partial<Record<"base" | "lg" | "xl" | "2xl", string>>;
	title?: string;
};

type OpenSource = "button" | "hover" | "auto" | "external" | "drag";

export const InventoryDrawer = forwardRef<
	InventoryDrawerHandle,
	InventoryDrawerProps
>(
	(
		{
			tooltips,
			drawerWidth,
			hoverGutterWidth = "10vw",
			closeGutterWidth,
			initialExpanded = false,
			expandedHeight = "30vh",
			foldedHeights,
			title = "Inventory",
		},
		ref,
	) => {
		const { inventory } = useGameState();
		const [isExpanded, setIsExpanded] = useState(initialExpanded);
		const [hoverLocked, setHoverLocked] = useState(false);
		const { activeDrag, lastDropResult, setLastDropResult } = useDragContext();
		const isXs = useBreakpointValue({ base: true, sm: false }) ?? true;
		const isMdOrBelow =
			useBreakpointValue({ base: true, md: true, lg: false }) ?? true;
		const responsiveDrawerWidth =
			useBreakpointValue({ base: "80vw", sm: "320px" }) ?? "320px";
		const resolvedDrawerWidth = drawerWidth ?? responsiveDrawerWidth;
		const resolvedCloseGutterWidth =
			closeGutterWidth ?? `calc(100vw - ${resolvedDrawerWidth})`;
		const resolvedFoldedHeight =
			useBreakpointValue({
				base: foldedHeights?.base ?? "20vh",
				lg: foldedHeights?.lg ?? "25vh",
				xl: foldedHeights?.xl ?? "22vh",
				"2xl": foldedHeights?.["2xl"] ?? "18vh",
			}) ?? "25vh";

		const itemCount = useMemo(
			() =>
				inventory.groups.reduce(
					(total, group) => total + group.items.length,
					0,
				),
			[inventory.groups],
		);
		const visibleGroupIds = useMemo(
			() =>
				inventory.groups
					.filter((group) => group.visible)
					.map((group) => group.id),
			[inventory.groups],
		);
		const prevItemCountRef = useRef<number | null>(null);
		const prevVisibleGroupsRef = useRef<Set<string> | null>(null);

		const expandDrawer = useCallback(
			(_source: OpenSource) => {
				setIsExpanded(true);
				setHoverLocked(false);
				setLastDropResult(null);
			},
			[setLastDropResult],
		);

		const foldDrawer = useCallback(
			(source: OpenSource) => {
				setIsExpanded(false);
				if (source === "button") {
					setHoverLocked(true);
				}
				setLastDropResult(null);
			},
			[setLastDropResult],
		);

		useImperativeHandle(
			ref,
			() => ({
				expand: () => expandDrawer("external"),
				fold: () => foldDrawer("external"),
				toggle: () => {
					if (isExpanded) {
						foldDrawer("button");
					} else {
						expandDrawer("button");
					}
				},
			}),
			[expandDrawer, foldDrawer, isExpanded],
		);

		useEffect(() => {
			if (!activeDrag) {
				if (isMdOrBelow) {
					expandDrawer("auto");
				}
				return;
			}

			if (activeDrag.source === "inventory") {
				foldDrawer("drag");
			}
		}, [activeDrag, expandDrawer, foldDrawer, isMdOrBelow]);

		useEffect(() => {
			if (!lastDropResult || activeDrag) {
				return;
			}

			if (lastDropResult.source === "inventory") {
				if (isMdOrBelow) {
					expandDrawer("auto");
				} else if (!lastDropResult.placed) {
					expandDrawer("auto");
				}
			}

			setLastDropResult(null);
		}, [
			activeDrag,
			expandDrawer,
			isMdOrBelow,
			lastDropResult,
			setLastDropResult,
		]);

		useEffect(() => {
			if (prevItemCountRef.current === null) {
				prevItemCountRef.current = itemCount;
				return;
			}
			if (itemCount > prevItemCountRef.current) {
				expandDrawer("auto");
			}
			prevItemCountRef.current = itemCount;
		}, [expandDrawer, itemCount]);

		useEffect(() => {
			const currentVisible = new Set(visibleGroupIds);
			if (prevVisibleGroupsRef.current) {
				const hasNewVisibleGroup = Array.from(currentVisible).some(
					(id) => !prevVisibleGroupsRef.current?.has(id),
				);
				if (hasNewVisibleGroup) {
					expandDrawer("auto");
				}
			}
			prevVisibleGroupsRef.current = currentVisible;
		}, [expandDrawer, visibleGroupIds]);

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
			if (!isXs || isExpanded || isMdOrBelow) {
				return null;
			}

			return (
				<Box
					position="fixed"
					top={0}
					right={0}
					height="100vh"
					width={hoverGutterWidth}
					zIndex={80}
					onMouseEnter={() => {
						if (!activeDrag && !hoverLocked) {
							expandDrawer("hover");
						}
					}}
				/>
			);
		}, [
			activeDrag,
			expandDrawer,
			hoverGutterWidth,
			hoverLocked,
			isExpanded,
			isMdOrBelow,
			isXs,
		]);

		const handlePointerEnter = useCallback(() => {
			if (activeDrag) {
				expandDrawer("drag");
			}
		}, [activeDrag, expandDrawer]);

		const handleBottomPointerEnter = useCallback(() => {
			if (isMdOrBelow) {
				return;
			}
			if (!isExpanded) {
				expandDrawer("hover");
			}
		}, [expandDrawer, isExpanded, isMdOrBelow]);

		const handleBottomPointerLeave = useCallback(() => {
			if (isMdOrBelow) {
				return;
			}
			if (isExpanded) {
				foldDrawer("hover");
			}
		}, [foldDrawer, isExpanded, isMdOrBelow]);

		if (!isXs) {
			return (
				<Box
					position="fixed"
					left={0}
					right={0}
					bottom={0}
					height={isExpanded ? expandedHeight : resolvedFoldedHeight}
					bg="gray.900"
					borderTop="1px solid"
					borderColor="gray.800"
					boxShadow="0 -8px 24px rgba(0, 0, 0, 0.35)"
					zIndex={isExpanded ? 90 : 80}
					transition="height 0.2s ease"
					overflow="hidden"
					onPointerEnter={handleBottomPointerEnter}
					onPointerLeave={handleBottomPointerLeave}
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
								{title}
							</Text>
							{(isExpanded || isMdOrBelow) && (
								<Box
									as="button"
									onClick={() =>
										isExpanded ? foldDrawer("button") : expandDrawer("button")
									}
									aria-label={
										isExpanded
											? "Fold inventory drawer"
											: "Expand inventory drawer"
									}
									color="gray.400"
									_hover={{ color: "gray.100" }}
								>
									{isExpanded ? "▼" : "▲"}
								</Box>
							)}
						</Flex>

						<Box
							flex="1"
							overflowY="auto"
							px={4}
							py={4}
							display="flex"
							justifyContent="center"
						>
							<InventoryPanel tooltips={tooltips} />
						</Box>
					</Flex>
				</Box>
			);
		}

		return (
			<>
				{hoverZone}

				{!isExpanded && (
					<Box
						position="fixed"
						top="40%"
						right={0}
						zIndex={90}
						bg="gray.900"
						border="1px solid"
						borderColor="gray.700"
						borderRight="none"
						borderRadius="md 0 0 md"
						px={2}
						py={3}
						cursor="pointer"
						onClick={() => expandDrawer("button")}
						onPointerEnter={handlePointerEnter}
						role="button"
						aria-label="Open inventory drawer"
						tabIndex={0}
						onKeyDown={(event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								expandDrawer("button");
							}
						}}
					>
						<Text
							fontSize="xs"
							fontWeight="bold"
							color="gray.100"
							transform="rotate(-90deg)"
							whiteSpace="nowrap"
						>
							{title}
						</Text>
					</Box>
				)}

				{isExpanded && (
					<Box
						position="fixed"
						top={0}
						right={resolvedDrawerWidth}
						height="100vh"
						width={resolvedCloseGutterWidth}
						zIndex={85}
						bg="transparent"
						onPointerDown={() => foldDrawer("button")}
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
					transform={isExpanded ? "translateX(0)" : "translateX(100%)"}
					transition="transform 0.2s ease"
					zIndex={90}
					pointerEvents={isExpanded ? "auto" : "none"}
					onPointerEnter={handlePointerEnter}
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
								{title}
							</Text>
							<Box
								as="button"
								onClick={() => foldDrawer("button")}
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
	},
);

InventoryDrawer.displayName = "InventoryDrawer";
