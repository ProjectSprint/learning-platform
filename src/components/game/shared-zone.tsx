import { Box, Flex, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

import { useSharedZone } from "./game-provider";

type SharedZoneProps = {
	title?: string;
	renderItem?: (key: string, value: unknown) => ReactNode;
};

const formatValue = (value: unknown) => {
	if (typeof value === "string") {
		return value;
	}
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
};

export const SharedZone = ({
	title = "Shared Data",
	renderItem,
}: SharedZoneProps) => {
	const sharedZone = useSharedZone();
	const items = Object.values(sharedZone.items);

	return (
		<Box
			bg="gray.900"
			border="1px solid"
			borderColor="gray.700"
			borderRadius="md"
			p={3}
		>
			{title && (
				<Text fontSize="sm" fontWeight="bold" color="gray.200" mb={2}>
					{title}
				</Text>
			)}
			{items.length === 0 ? (
				<Text fontSize="sm" color="gray.500">
					No shared data.
				</Text>
			) : (
				<Flex direction="column" gap={2}>
					{items.map((item) => (
						<Box
							key={item.id}
							bg="gray.800"
							border="1px solid"
							borderColor="gray.700"
							borderRadius="md"
							p={2}
						>
							{renderItem ? (
								renderItem(item.key, item.value)
							) : (
								<>
									<Text fontSize="xs" color="gray.400">
										{item.key}
									</Text>
									<Text fontSize="sm" color="gray.100">
										{formatValue(item.value)}
									</Text>
								</>
							)}
						</Box>
					))}
				</Flex>
			)}
		</Box>
	);
};
