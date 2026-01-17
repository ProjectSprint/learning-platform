import { Box, Button, Flex, Text } from "@chakra-ui/react";

type SuccessModalProps = {
	title?: string;
	message?: string;
	actionLabel?: string;
	onAction: () => void;
};

export const SuccessModal = ({
	title = "Question complete",
	message = "You have completed the current objective.",
	actionLabel = "Next question",
	onAction,
}: SuccessModalProps) => {
	return (
		<Box display="flex" flexDirection="column" gap={4} textAlign="center">
			<Text fontSize="lg" fontWeight="bold">
				{title}
			</Text>
			<Text fontSize="sm" color="gray.300">
				{message}
			</Text>
			<Flex justify="center">
				<Button colorPalette="green" size="sm" onClick={onAction}>
					{actionLabel}
				</Button>
			</Flex>
		</Box>
	);
};
