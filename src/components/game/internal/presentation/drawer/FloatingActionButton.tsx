import { Button, Flex, Text } from "@chakra-ui/react";
import { Package } from "lucide-react";

export type FloatingActionButtonProps = {
	label: string;
	onClick: () => void;
};

export const FloatingActionButton = ({
	label,
	onClick,
}: FloatingActionButtonProps) => {
	return (
		<Button
			aria-label={label}
			position="fixed"
			bottom="16px"
			left="50%"
			transform="translateX(-50%)"
			zIndex={9500}
			borderRadius="full"
			px={5}
			py={3}
			minH="44px"
			bg="gray.900"
			color="gray.100"
			boxShadow="0 8px 20px rgba(0, 0, 0, 0.35)"
			_hover={{ bg: "gray.800" }}
			_active={{ bg: "gray.700" }}
			onClick={onClick}
		>
			<Flex align="center" gap={2}>
				<Package size={18} />
				<Text fontSize="sm" fontWeight="bold">
					{label}
				</Text>
			</Flex>
		</Button>
	);
};
