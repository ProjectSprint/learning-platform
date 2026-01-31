import { Box, Container, Flex, Heading, Text, VStack } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import Tetris, { type TetrisHandle } from "@/components/tetris";
import { ensureScrollTrigger, ScrollTrigger } from "@/lib/gsap-plugins";

export function TetrisSection() {
	const sectionRef = useRef<HTMLDivElement>(null);
	const tetrisRef = useRef<TetrisHandle>(null);
	const hasPlayed = useRef(false);

	useEffect(() => {
		ensureScrollTrigger();

		if (!sectionRef.current) return;

		const trigger = ScrollTrigger.create({
			trigger: sectionRef.current,
			start: "top 50%",
			end: "bottom 50%",
			onEnter: () => {
				if (!hasPlayed.current && tetrisRef.current) {
					tetrisRef.current.play();
					hasPlayed.current = true;
				}
			},
			onLeaveBack: () => {
				hasPlayed.current = false;
			},
		});

		return () => {
			trigger.kill();
		};
	}, []);

	return (
		<Box
			as="section"
			ref={sectionRef}
			minH="100vh"
			bg="#F5F5F5"
			display="flex"
			alignItems="center"
			py={{ base: 16, md: 24 }}
		>
			<Container maxW="container.xl">
				<Flex
					direction={{ base: "column", lg: "row" }}
					align="center"
					justify="space-between"
					gap={{ base: 12, lg: 16 }}
				>
					<VStack gap={6} align="flex-start" flex="1" maxW={{ lg: "500px" }}>
						<Text
							as="span"
							fontSize="12px"
							fontWeight="semibold"
							letterSpacing="0.15em"
							textTransform="uppercase"
							color="#525252"
						>
							Learning reimagined
						</Text>
						<Heading
							as="h2"
							fontSize={{ base: "40px", md: "56px" }}
							fontWeight="bold"
							letterSpacing="-0.02em"
							lineHeight="1.1"
							color="#0A0A0A"
						>
							We squeeze fundamentals into fun puzzle games!
						</Heading>
						<Text fontSize="20px" color="#525252">
							No more boring lectures or endless documentation. Learn
							networking, databases, and system design through interactive
							puzzles that make complex concepts click.
						</Text>
						<Box pt={4}>
							<Text
								as="span"
								fontSize="14px"
								fontWeight="semibold"
								color="#0F172A"
								borderBottom="2px solid #0F172A"
								pb={1}
								cursor="pointer"
								_hover={{ opacity: 0.7 }}
								transition="opacity 0.2s"
							>
								See available materials
							</Text>
						</Box>
					</VStack>

					<Box
						flex="1"
						display="flex"
						justifyContent="center"
						maxW={{ base: "320px", lg: "400px" }}
						w="100%"
					>
						<Box
							bg="white"
							borderRadius="24px"
							p={6}
							boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.1)"
						>
							<Tetris ref={tetrisRef} theme="light" showControls={false} />
						</Box>
					</Box>
				</Flex>
			</Container>
		</Box>
	);
}
