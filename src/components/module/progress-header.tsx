import { Box, Flex, IconButton } from "@chakra-ui/react";
import { X } from "lucide-react";
import type { ModuleProgress } from "./module-types";

type ProgressHeaderProps = {
	progress: ModuleProgress;
	onExit: () => void;
};

export const ProgressHeader = ({ progress, onExit }: ProgressHeaderProps) => {
	const completedPercent =
		progress.totalQuestions > 0
			? (progress.currentIndex / progress.totalQuestions) * 100
			: 0;

	return (
		<Flex
			as="header"
			align="center"
			gap={3}
			px={4}
			py={3}
			bg="gray.950"
			borderBottom="1px solid"
			borderColor="gray.800"
		>
			<IconButton
				aria-label="Exit module"
				variant="ghost"
				size="sm"
				color="gray.400"
				_hover={{ color: "gray.100", bg: "gray.800" }}
				onClick={onExit}
			>
				<X size={20} />
			</IconButton>

			<Box flex="1" position="relative" height="8px" borderRadius="full">
				<Box position="absolute" inset={0} bg="gray.700" borderRadius="full" />
				<Box
					position="absolute"
					top={0}
					left={0}
					bottom={0}
					width={`${completedPercent}%`}
					bg="orange.400"
					borderRadius="full"
					transition="width 0.3s ease-out"
				/>
			</Box>
		</Flex>
	);
};
