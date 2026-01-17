import { Box, Flex, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { useDragContext } from "./drag-context";
import { useGameState } from "./game-provider";
import {
	createDraggable,
	type DragHandle,
	ensureGsapPlugins,
} from "./gsap-drag";

export const InventoryPanel = () => {
	const { inventory } = useGameState();
	const { activeDrag, setActiveDrag } = useDragContext();
	const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
	const draggablesRef = useRef<Map<string, DragHandle>>(new Map());

	const availableItems = useMemo(
		() => inventory.items.filter((item) => !item.used),
		[inventory.items],
	);

	useEffect(() => {
		ensureGsapPlugins();
	}, []);

	useEffect(() => {
		for (const [id, handle] of draggablesRef.current) {
			if (!availableItems.find((item) => item.id === id)) {
				handle.cleanup();
				draggablesRef.current.delete(id);
			}
		}

		for (const item of availableItems) {
			if (draggablesRef.current.has(item.id)) {
				continue;
			}

			const el = itemRefs.current.get(item.id);
			if (!el) {
				continue;
			}

			const handle = createDraggable(el, {
				type: "x,y",
				zIndexBoost: true,
				onDragStart: () => {
					setActiveDrag({
						source: "inventory",
						data: {
							itemId: item.id,
							itemType: item.type,
						},
						element: el,
					});
				},
				onDragEnd: function () {
					setActiveDrag(null);
					this.target.style.transform = "";
					this.target.style.zIndex = "";
				},
			});

			draggablesRef.current.set(item.id, handle);
		}

		return () => {
			for (const handle of draggablesRef.current.values()) {
				handle.cleanup();
			}
			draggablesRef.current.clear();
		};
	}, [availableItems, setActiveDrag]);

	const setItemRef = useCallback(
		(itemId: string) => (el: HTMLDivElement | null) => {
			if (el) {
				itemRefs.current.set(itemId, el);
			} else {
				itemRefs.current.delete(itemId);
			}
		},
		[],
	);

	return (
		<Box
			className="inventory-panel"
			height="100%"
			bg="gray.900"
			borderRight={{ base: "none", md: "1px solid" }}
			borderBottom={{ base: "1px solid", md: "none" }}
			borderColor="gray.800"
			p={3}
			overflowY="auto"
			contain="layout"
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
								ref={setItemRef(item.id)}
								as="li"
								role="listitem"
								aria-grabbed={isDragging}
								px={3}
								py={2}
								bg="gray.800"
								border="1px solid"
								borderColor={isDragging ? "gray.500" : "gray.700"}
								borderRadius="md"
								minWidth="80px"
								opacity={isDragging ? 0.5 : 1}
								cursor="grab"
								transition="opacity 0.15s ease"
								style={{ touchAction: "none" }}
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
