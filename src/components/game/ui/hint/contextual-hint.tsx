import { Box, type BoxProps, Text } from "@chakra-ui/react";
import { useGameState } from "@/components/game/game-provider";

type ContextualHintProps = {
	containerProps?: BoxProps;
};

export const ContextualHint = ({ containerProps }: ContextualHintProps) => {
	const { hint } = useGameState();

	if (!hint.visible || !hint.content) {
		return null;
	}

	return (
		<Box
			role="status"
			aria-live="polite"
			bg="gray.800"
			border="1px solid"
			borderColor="gray.700"
			borderRadius="md"
			px={4}
			py={2}
			textAlign="center"
			mb={4}
			{...containerProps}
		>
			<Text fontSize="sm" color="gray.100">
				{hint.content}
			</Text>
		</Box>
	);
};
