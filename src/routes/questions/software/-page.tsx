import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import { getFirstQuestionPath } from "./-utils/module-progress";

export const SoftwareModulePage = () => {
	const navigate = useNavigate();

	const handlePlay = useCallback(() => {
		void navigate({ to: getFirstQuestionPath() });
	}, [navigate]);

	return (
		<Box
			height="100vh"
			display="flex"
			flexDirection="column"
			bg="gray.950"
			color="gray.100"
		>
			<Flex flex="1" align="center" justify="center">
				<Box textAlign="center" maxWidth="480px" px={4}>
					<Text fontSize="3xl" fontWeight="bold" mb={4}>
						Welcome to Software Fundamentals
					</Text>
					<Text fontSize="md" color="gray.400" mb={2}>
						In this module, you will learn how to:
					</Text>
					<Box as="ul" textAlign="left" color="gray.300" mb={8} pl={6}>
						<Text as="li" mb={1}>
							Why one core executes work sequentially
						</Text>
						<Text as="li" mb={1}>
							What dual-core scheduling can and cannot accelerate
						</Text>
						<Text as="li" mb={1}>
							How parallel subtasks unlock real speedups
						</Text>
						<Text as="li" mb={1}>
							Why shared resources require locking to stay correct
						</Text>
					</Box>
					<Button colorPalette="green" size="lg" onClick={handlePlay}>
						Play
					</Button>
				</Box>
			</Flex>
		</Box>
	);
};
