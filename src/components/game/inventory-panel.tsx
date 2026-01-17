import { Box, Flex, Text } from "@chakra-ui/react";
import { useCallback, useMemo, useRef } from "react";

import { useDragContext } from "./drag-context";
import type { InventoryItem } from "./game-provider";
import { useGameState } from "./game-provider";

const SLOT_WIDTH = 100;
const SLOT_HEIGHT = 48;

type InventorySlotProps = {
	item: InventoryItem;
	isEmpty: boolean;
	isDragging: boolean;
	onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
	slotRef?: React.RefCallback<HTMLDivElement>;
};

const InventorySlot = ({
	item,
	isEmpty,
	isDragging,
	onPointerDown,
	slotRef,
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
			alignItems="center"
			justifyContent="center"
			opacity={isDragging ? 0.3 : 1}
			cursor={isEmpty ? "default" : "grab"}
			transition="opacity 0.1s ease"
			style={{ touchAction: "none" }}
			onPointerDown={isEmpty ? undefined : onPointerDown}
		>
			{!isEmpty && (
				<Text fontSize="sm" fontWeight="bold" color="gray.100">
					{item.name ?? item.type}
				</Text>
			)}
		</Box>
	);
};

export const InventoryPanel = () => {
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
			height="100%"
			bg="gray.900"
			borderRight={{ base: "none", md: "1px solid" }}
			borderBottom={{ base: "1px solid", md: "none" }}
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
				direction={{ base: "row", md: "column" }}
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
						return (
							<InventorySlot
								key={item.id}
								item={item}
								isEmpty={isEmpty}
								isDragging={isDragging}
								onPointerDown={(e) => handlePointerDown(item, e)}
								slotRef={setSlotRef(item.id)}
							/>
						);
					})
				)}
			</Flex>
		</Box>
	);
};

export { SLOT_WIDTH, SLOT_HEIGHT };
