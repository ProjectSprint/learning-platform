import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

const LandingPage = () => {
	const navigate = useNavigate();

	const handlePlay = () => {
		void navigate({ to: "/questions/networking" });
	};

	return (
		<Box
			height="100vh"
			display="flex"
			flexDirection="column"
			bg="gray.950"
			color="gray.100"
		>
			<Flex flex="1" align="center" justify="center">
				<Box textAlign="center">
					<Text fontSize="4xl" fontWeight="bold" mb={4}>
						Learning Platform
					</Text>
					<Text fontSize="lg" color="gray.400" mb={8}>
						Master networking concepts through interactive challenges.
					</Text>
					<Button colorPalette="green" size="lg" onClick={handlePlay}>
						Play
					</Button>
				</Box>
			</Flex>
		</Box>
	);
};

export const Route = createFileRoute("/")({
	component: LandingPage,
});
