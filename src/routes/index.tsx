import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { type ModuleConfig, ModuleEngine } from "@/components/module";
import { NetworkingQuestion } from "./questions/networking/-page";

const NETWORKING_MODULE: ModuleConfig = {
	id: "networking-basics",
	title: "Networking Basics",
	questions: [{ id: "networking-1", component: NetworkingQuestion }],
};

const LandingPage = () => {
	const [activeModule, setActiveModule] = useState<ModuleConfig | null>(null);

	const handleStartModule = useCallback(() => {
		setActiveModule(NETWORKING_MODULE);
	}, []);

	const handleExit = useCallback(() => {
		setActiveModule(null);
	}, []);

	const handleComplete = useCallback(() => {
		setActiveModule(null);
	}, []);

	if (activeModule) {
		return (
			<ModuleEngine
				config={activeModule}
				onExit={handleExit}
				onComplete={handleComplete}
			/>
		);
	}

	return (
		<Box
			height="100vh"
			display="flex"
			flexDirection="column"
			bg="gray.950"
			color="gray.100"
		>
			<Flex
				as="header"
				align="center"
				justify="center"
				px={6}
				py={4}
				borderBottom="1px solid"
				borderColor="gray.800"
			>
				<Text fontSize="xl" fontWeight="bold">
					Learning Platform
				</Text>
			</Flex>

			<Flex flex="1" align="center" justify="center">
				<Box textAlign="center">
					<Text fontSize="3xl" fontWeight="bold" mb={4}>
						Networking Basics
					</Text>
					<Text fontSize="md" color="gray.400" mb={8}>
						Learn how to connect computers and configure networks.
					</Text>
					<Button colorPalette="green" size="lg" onClick={handleStartModule}>
						Start
					</Button>
				</Box>
			</Flex>
		</Box>
	);
};

export const Route = createFileRoute("/")({
	component: LandingPage,
});
