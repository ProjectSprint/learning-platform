import { Box, Flex, Text } from "@chakra-ui/react";
import { Icon } from "@iconify/react";
import { useCallback, useMemo, useRef } from "react";

import { useDragContext } from "./drag-context";
import type { InventoryItem } from "./game-provider";
import { useGameState } from "./game-provider";
import { InfoTooltip } from "./help-components";
import type { IconInfo } from "./item-icons";

const SLOT_WIDTH = 150;
const SLOT_HEIGHT = 64;

export type TooltipInfo = {
	content: string;
	seeMoreHref: string;
};

type InventorySlotProps = {
	item: InventoryItem;
	isEmpty: boolean;
	isDragging: boolean;
	onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
	slotRef?: React.RefCallback<HTMLDivElement>;
	tooltip?: TooltipInfo;
	iconInfo?: IconInfo;
};

const InventorySlot = ({
	item,
	isEmpty,
	isDragging,
	onPointerDown,
	slotRef,
	tooltip,
	iconInfo,
}: InventorySlotProps) => {
	return (
		<Box
			ref={slotRef}
			as="li"
			role="listitem"
			data-inventory-slot={item.id}
			aria-grabbed={isDragging}
			width={`${SLOT_WIDTH}px`}
			height={`${SLOT_HEIGHT}px`}
			bg={isEmpty ? "transparent" : "gray.800"}
			border="1px"
			borderStyle={isEmpty ? "dashed" : "solid"}
			borderColor={isEmpty ? "gray.700" : "cyan.500"}
			borderRadius="md"
			display="flex"
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			gap={1}
			opacity={isDragging ? 0.3 : 1}
			cursor={isEmpty ? "default" : "grab"}
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
	const { inventory } = useGameState();
	const { activeDrag, setActiveDrag } = useDragContext();
	const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map());

	const items = inventory.items;

	const firstEmptySlot = useMemo(() => {
		const emptyItem = items.find((item) => item.used);
		return emptyItem?.id ?? null;
	}, [items]);

	const handlePointerDown = useCallback(
		(item: InventoryItem, event: React.PointerEvent<HTMLDivElement>) => {
			event.preventDefault();
			const target = event.currentTarget;
			const rect = target.getBoundingClientRect();

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
		[setActiveDrag],
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

	return (
		<Box
			className="inventory-panel"
			data-inventory-panel
			data-first-empty-slot={firstEmptySlot}
			width="fit-content"
			bg="gray.900"
			borderTop="1px solid"
			borderColor="gray.800"
			p={3}
			overflow="visible"
		>
			<Text fontSize="sm" fontWeight="bold" mb={3} color="gray.200">
				Inventory
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
						const isEmpty = item.used;
						const isDragging =
							activeDrag?.source === "inventory" &&
							activeDrag.data.itemId === item.id;
						const tooltip = tooltips?.[item.type];
						const iconInfo = item.icon;
						return (
							<InventorySlot
								key={item.id}
								item={item}
								isEmpty={isEmpty}
								isDragging={isDragging}
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
};

export { SLOT_WIDTH, SLOT_HEIGHT };
