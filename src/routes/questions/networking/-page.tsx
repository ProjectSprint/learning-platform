import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { type ModuleConfig, ModuleEngine } from "@/components/module";
import { DnsQuestion } from "./dns/-page";

const NETWORKING_MODULE: ModuleConfig = {
	id: "networking-basics",
	title: "Networking Basics",
	questions: [
		{ id: "dns-1", component: DnsQuestion },
		{ id: "dns-2", component: DnsQuestion },
		{ id: "dns-3", component: DnsQuestion },
	],
};

export const NetworkingModulePage = () => {
	const navigate = useNavigate();
	const [started, setStarted] = useState(false);

	const handlePlay = useCallback(() => {
		setStarted(true);
	}, []);

	const handleExit = useCallback(() => {
		void navigate({ to: "/" });
	}, [navigate]);

	const handleComplete = useCallback(() => {
		void navigate({ to: "/" });
	}, [navigate]);

	if (started) {
		return (
			<ModuleEngine
				config={NETWORKING_MODULE}
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
			<Flex flex="1" align="center" justify="center">
				<Box textAlign="center" maxWidth="480px" px={4}>
					<Text fontSize="3xl" fontWeight="bold" mb={4}>
						Welcome to Networking Basics
					</Text>
					<Text fontSize="md" color="gray.400" mb={2}>
						In this module, you will learn how to:
					</Text>
					<Box as="ul" textAlign="left" color="gray.300" mb={8} pl={6}>
						<Text as="li" mb={1}>
							Connect computers using routers and cables
						</Text>
						<Text as="li" mb={1}>
							Configure DHCP to assign IP addresses automatically
						</Text>
						<Text as="li">
							Verify network connectivity using the ping command
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
