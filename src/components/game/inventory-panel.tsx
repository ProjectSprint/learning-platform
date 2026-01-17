import { Box, Flex, Text } from "@chakra-ui/react";
import { useCallback, useMemo } from "react";

import { useDragContext } from "./drag-context";
import type { InventoryItem } from "./game-provider";
import { useGameState } from "./game-provider";

export const InventoryPanel = () => {
	const { inventory } = useGameState();
	const { activeDrag, setActiveDrag } = useDragContext();

	const availableItems = useMemo(
		() => inventory.items.filter((item) => !item.used),
		[inventory.items],
	);

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

	return (
		<Box
			className="inventory-panel"
			data-inventory-panel
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
				{availableItems.length === 0 ? (
					<Text fontSize="sm" color="gray.500">
						All items placed.
					</Text>
				) : (
					availableItems.map((item) => {
						const isDragging =
							activeDrag?.source === "inventory" &&
							activeDrag.data.itemId === item.id;
						return (
							<Box
								key={item.id}
								as="li"
								role="listitem"
								aria-grabbed={isDragging}
								px={3}
								py={2}
								bg="gray.800"
								border="1px solid"
								borderColor="gray.700"
								borderRadius="md"
								minWidth="80px"
								opacity={isDragging ? 0.3 : 1}
								cursor="grab"
								transition="opacity 0.1s ease"
								style={{ touchAction: "none" }}
								onPointerDown={(e) => handlePointerDown(item, e)}
							>
								<Text fontSize="sm" fontWeight="bold" color="gray.100">
									{item.name ?? item.type}
								</Text>
								{typeof item.quantity === "number" && item.quantity > 1 ? (
									<Text fontSize="xs" color="gray.400">
										x{item.quantity}
									</Text>
								) : null}
							</Box>
						);
					})
				)}
			</Flex>
		</Box>
	);
};
