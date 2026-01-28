import { Box, Flex, Text, useBreakpointValue } from "@chakra-ui/react";
import { Icon } from "@iconify/react";
import { useCallback, useMemo, useRef } from "react";

import { useDragContext } from "../drag";
import type { InventoryItem } from "../../game-provider";
import { useGameState } from "../../game-provider";
import { InfoTooltip } from "../../help";
import type { IconInfo } from "../../icons";

export const useInventorySlotSize = () => {
	const width = useBreakpointValue({ base: 120, sm: 132, md: 150 }) ?? 150;
	const height = useBreakpointValue({ base: 52, sm: 58, md: 64 }) ?? 64;
	return { width, height };
};

export type TooltipInfo = {
	content: string;
	seeMoreHref: string;
};

type InventorySlotProps = {
	item: InventoryItem;
	isEmpty: boolean;
	isDragging: boolean;
	slotWidth: number;
	slotHeight: number;
	onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
	slotRef?: React.RefCallback<HTMLDivElement>;
	tooltip?: TooltipInfo;
	iconInfo?: IconInfo;
};

const InventorySlot = ({
	item,
	isEmpty,
	isDragging,
	slotWidth,
	slotHeight,
	onPointerDown,
	slotRef,
	tooltip,
	iconInfo,
}: InventorySlotProps) => {
	const isNonDraggable = item.draggable === false;

	return (
		<Box
			ref={slotRef}
			as="li"
			role="listitem"
			data-inventory-slot={item.id}
			aria-grabbed={isDragging}
			width={`${slotWidth}px`}
			height={`${slotHeight}px`}
			bg={isEmpty ? "transparent" : "gray.800"}
			border="1px"
			borderStyle={isEmpty ? "dashed" : "solid"}
			borderColor={
				isEmpty ? "gray.700" : isNonDraggable ? "gray.600" : "cyan.500"
			}
			borderRadius="md"
			display="flex"
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			gap={1}
			opacity={isDragging ? 0.3 : isNonDraggable ? 0.6 : 1}
			cursor={isEmpty ? "default" : isNonDraggable ? "not-allowed" : "grab"}
			transition="opacity 0.1s ease"
			style={{ touchAction: "none" }}
			onPointerDown={isEmpty ? undefined : onPointerDown}
		>
			{!isEmpty && (
				<>
					{iconInfo && (
						<Icon
							icon={iconInfo.icon}
							width={20}
							height={20}
							color={iconInfo.color}
						/>
					)}
					<Flex align="center" gap={1}>
						<Text fontSize="xs" fontWeight="bold" color="gray.100">
							{item.name ?? item.type}
						</Text>
						{tooltip && (
							<InfoTooltip
								content={tooltip.content}
								seeMoreHref={tooltip.seeMoreHref}
							/>
						)}
					</Flex>
				</>
			)}
		</Box>
	);
};

export type InventoryPanelProps = {
	tooltips?: Record<string, TooltipInfo>;
};

export const InventoryPanel = ({ tooltips }: InventoryPanelProps) => {
	const { inventory, puzzles, puzzle } = useGameState();
	const { activeDrag, setActiveDrag, setLastDropResult } = useDragContext();
	const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map());
	const slotSize = useInventorySlotSize();
	const visibleGroups = useMemo(
		() => inventory.groups.filter((group) => group.visible),
		[inventory.groups],
	);

	// Check if an item is currently on any puzzle
	const isItemOnPuzzle = useCallback(
		(itemId: string): boolean => {
			const allPuzzles = puzzles ? Object.values(puzzles) : [];
			if (puzzle) {
				allPuzzles.push(puzzle);
			}
			return allPuzzles.some((p) =>
				p.placedItems.some((placed) => placed.itemId === itemId),
			);
		},
		[puzzles, puzzle],
	);

	const handlePointerDown = useCallback(
		(item: InventoryItem, event: React.PointerEvent<HTMLDivElement>) => {
			// Check if item is draggable (default true if not specified)
			if (item.draggable === false) {
				return;
			}

			event.preventDefault();
			const target = event.currentTarget;
			const rect = target.getBoundingClientRect();

			setLastDropResult(null);
			setActiveDrag({
				source: "inventory",
				data: {
					itemId: item.id,
					itemType: item.type,
					itemName: item.name,
				},
				element: target,
				initialRect: rect,
			});
		},
		[setActiveDrag, setLastDropResult],
	);

	const setSlotRef = useCallback(
		(itemId: string) => (el: HTMLDivElement | null) => {
			if (el) {
				slotRefs.current.set(itemId, el);
			} else {
				slotRefs.current.delete(itemId);
			}
		},
		[],
	);

	if (visibleGroups.length === 0) {
		return null;
	}

	return (
		<Flex
			className="inventory-panel"
			data-inventory-panel
			direction="column"
			gap={{ base: 2, md: 3 }}
			width="fit-content"
			overflow="visible"
		>
			{visibleGroups.map((group) => {
				const items = group.items;
				const firstEmptySlot =
					items.find((item) => !isItemOnPuzzle(item.id))?.id ?? null;

				return (
					<Box
						key={group.id}
						data-first-empty-slot={firstEmptySlot}
						bg="gray.900"
						borderTop="1px solid"
						borderColor="gray.800"
						p={{ base: 2, md: 3 }}
						overflow="visible"
					>
						<Text fontSize="sm" fontWeight="bold" mb={3} color="gray.200">
							{group.title}
						</Text>

						<Flex
							as="ul"
							role="list"
							direction="row"
							gap={2}
							wrap="wrap"
							listStyleType="none"
							p={0}
							m={0}
						>
							{items.length === 0 ? (
								<Text fontSize="sm" color="gray.500">
									No items.
								</Text>
							) : (
								items.map((item) => {
									const isInInventory = !isItemOnPuzzle(item.id);
									const isDragging =
										activeDrag?.source === "inventory" &&
										activeDrag.data.itemId === item.id;
									const tooltip = tooltips?.[item.type];
									const iconInfo = item.icon;
									return (
										<InventorySlot
											key={item.id}
											item={item}
											isEmpty={!isInInventory}
											isDragging={isDragging}
											slotWidth={slotSize.width}
											slotHeight={slotSize.height}
											onPointerDown={(e) => handlePointerDown(item, e)}
											slotRef={setSlotRef(item.id)}
											tooltip={tooltip}
											iconInfo={iconInfo}
										/>
									);
								})
							)}
						</Flex>
					</Box>
				);
			})}
		</Flex>
	);
};
