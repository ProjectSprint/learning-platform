import { Box, Button, Flex, Text } from "@chakra-ui/react";

type ConfirmModalProps = {
	title?: string;
	message?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm: () => void;
	onCancel: () => void;
};

export const ConfirmModal = ({
	title = "Confirm",
	message = "Are you sure you want to continue?",
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	onConfirm,
	onCancel,
}: ConfirmModalProps) => {
	return (
		<Box display="flex" flexDirection="column" gap={4}>
			<Text fontSize="lg" fontWeight="bold">
				{title}
			</Text>
			<Text fontSize="sm" color="gray.300">
				{message}
			</Text>
			<Flex justify="flex-end" gap={2}>
				<Button variant="ghost" size="sm" onClick={onCancel}>
					{cancelLabel}
				</Button>
				<Button colorPalette="blue" size="sm" onClick={onConfirm}>
					{confirmLabel}
				</Button>
			</Flex>
		</Box>
	);
};
