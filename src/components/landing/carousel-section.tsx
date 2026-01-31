import { Box, Container, Heading, Text, VStack } from "@chakra-ui/react";
import { Link } from "@tanstack/react-router";
import { gsap } from "gsap";
import { useEffect, useRef } from "react";

const topics = [
	{
		id: "networking",
		title: "Networking",
		description: "TCP/IP, DNS, HTTP, and more",
		color: "#3B82F6",
		route: "/questions/networking",
	},
	{
		id: "os",
		title: "Operating Systems",
		description: "Processes, memory, file systems",
		color: "#8B5CF6",
		route: "/questions/networking",
	},
	{
		id: "database",
		title: "Database",
		description: "SQL, indexing, transactions",
		color: "#10B981",
		route: "/questions/networking",
	},
	{
		id: "security",
		title: "Security",
		description: "Encryption, auth, vulnerabilities",
		color: "#EF4444",
		route: "/questions/networking",
	},
	{
		id: "algorithms",
		title: "Algorithms",
		description: "Sorting, searching, graphs",
		color: "#F59E0B",
		route: "/questions/networking",
	},
	{
		id: "web",
		title: "Web Development",
		description: "HTML, CSS, JavaScript, APIs",
		color: "#EC4899",
		route: "/questions/networking",
	},
	{
		id: "cloud",
		title: "Cloud Computing",
		description: "AWS, containers, serverless",
		color: "#06B6D4",
		route: "/questions/networking",
	},
	{
		id: "devops",
		title: "DevOps",
		description: "CI/CD, monitoring, automation",
		color: "#84CC16",
		route: "/questions/networking",
	},
];

function TopicCard({
	title,
	description,
	color,
	route,
}: {
	title: string;
	description: string;
	color: string;
	route: string;
}) {
	return (
		<Link to={route}>
			<Box
				bg="white"
				borderRadius="16px"
				p={6}
				minW={{ base: "200px", md: "240px", lg: "260px" }}
				h="160px"
				display="flex"
				flexDirection="column"
				justifyContent="space-between"
				boxShadow="0 4px 20px -4px rgba(0, 0, 0, 0.08)"
				border="1px solid"
				borderColor="gray.100"
				cursor="pointer"
				transition="all 0.3s ease"
				_hover={{
					transform: "translateY(-4px)",
					boxShadow: "0 12px 32px -8px rgba(0, 0, 0, 0.15)",
				}}
			>
				<Box>
					<Box w="12px" h="12px" borderRadius="full" bg={color} mb={4} />
					<Text fontSize="18px" fontWeight="bold" color="#0A0A0A" mb={1}>
						{title}
					</Text>
					<Text fontSize="14px" color="#525252">
						{description}
					</Text>
				</Box>
				<Text
					fontSize="12px"
					fontWeight="semibold"
					color={color}
					letterSpacing="0.05em"
				>
					EXPLORE
				</Text>
			</Box>
		</Link>
	);
}

export function CarouselSection() {
	const carouselRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!innerRef.current || !carouselRef.current) return;

		const inner = innerRef.current;
		const cardWidth = 280;
		const gap = 24;
		const totalWidth = (cardWidth + gap) * topics.length;

		// Clone cards for seamless loop
		const originalHTML = inner.innerHTML;
		inner.innerHTML = originalHTML + originalHTML;

		const animation = gsap.to(inner, {
			x: -totalWidth,
			duration: topics.length * 4,
			ease: "linear",
			repeat: -1,
			modifiers: {
				x: gsap.utils.unitize((x) => {
					const value = parseFloat(x);
					return value % totalWidth;
				}),
			},
		});

		// Pause on hover
		const handleMouseEnter = () => animation.pause();
		const handleMouseLeave = () => animation.play();

		carouselRef.current.addEventListener("mouseenter", handleMouseEnter);
		carouselRef.current.addEventListener("mouseleave", handleMouseLeave);

		return () => {
			animation.kill();
			if (carouselRef.current) {
				carouselRef.current.removeEventListener("mouseenter", handleMouseEnter);
				carouselRef.current.removeEventListener("mouseleave", handleMouseLeave);
			}
		};
	}, []);

	return (
		<Box
			as="section"
			minH="100vh"
			bg="white"
			display="flex"
			alignItems="center"
			py={{ base: 16, md: 24 }}
			overflow="hidden"
		>
			<Container maxW="container.xl" px={0}>
				<VStack gap={{ base: 10, md: 16 }} align="stretch">
					<Box px={{ base: 4, md: 8 }}>
						<VStack gap={6} align="flex-start" maxW="700px">
							<Text
								as="span"
								fontSize="12px"
								fontWeight="semibold"
								letterSpacing="0.15em"
								textTransform="uppercase"
								color="#525252"
							>
								Comprehensive curriculum
							</Text>
							<Heading
								as="h2"
								fontSize={{ base: "40px", md: "56px" }}
								fontWeight="bold"
								letterSpacing="-0.02em"
								lineHeight="1.1"
								color="#0A0A0A"
							>
								With many fundamentals as the service
							</Heading>
							<Text fontSize="20px" color="#525252">
								From networking to algorithms, from databases to DevOps. We
								cover everything you need to build a solid engineering
								foundation.
							</Text>
						</VStack>
					</Box>

					<Box
						ref={carouselRef}
						overflow="hidden"
						py={4}
						cursor="grab"
						_active={{ cursor: "grabbing" }}
					>
						<Box
							ref={innerRef}
							display="flex"
							gap="24px"
							pl={{ base: 4, md: 8 }}
						>
							{topics.map((topic) => (
								<TopicCard
									key={topic.id}
									title={topic.title}
									description={topic.description}
									color={topic.color}
									route={topic.route}
								/>
							))}
						</Box>
					</Box>

					<Box textAlign="center">
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
							How much does it cost?
						</Text>
					</Box>
				</VStack>
			</Container>
		</Box>
	);
}
