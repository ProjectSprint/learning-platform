import {
	Box,
	Container,
	Heading,
	Text,
	VStack,
	SimpleGrid,
	Button,
	List,
} from "@chakra-ui/react";
import { Link } from "@tanstack/react-router";

const pricingPlans = [
	{
		id: "monthly",
		name: "Monthly",
		price: "80,000",
		period: "/month",
		description: "Perfect for trying out the platform",
		features: [
			"Access to all learning modules",
			"Interactive puzzle games",
			"Progress tracking",
			"Community access",
		],
		highlighted: false,
		cta: "Get Started",
	},
	{
		id: "quarterly",
		name: "3 Months",
		price: "200,000",
		period: "/3 months",
		description: "Best value for committed learners",
		features: [
			"Everything in Monthly",
			"Save IDR 40,000",
			"Priority support",
			"Exclusive workshops",
		],
		highlighted: true,
		cta: "Best Value",
	},
	{
		id: "biannual",
		name: "6 Months",
		price: "380,000",
		period: "/6 months",
		description: "Maximum savings for the dedicated",
		features: [
			"Everything in 3 Months",
			"Save IDR 100,000",
			"1-on-1 mentoring session",
			"Certificate of completion",
		],
		highlighted: false,
		cta: "Go Long Term",
	},
];

function PricingCard({
	name,
	price,
	period,
	description,
	features,
	highlighted,
	cta,
}: {
	name: string;
	price: string;
	period: string;
	description: string;
	features: string[];
	highlighted: boolean;
	cta: string;
}) {
	return (
		<Box
			bg={highlighted ? "#0F172A" : "white"}
			borderRadius="24px"
			p={8}
			border="1px solid"
			borderColor={highlighted ? "#0F172A" : "gray.200"}
			position="relative"
			transform={highlighted ? "scale(1.05)" : "none"}
			boxShadow={
				highlighted
					? "0 25px 50px -12px rgba(15, 23, 42, 0.4)"
					: "0 4px 20px -4px rgba(0, 0, 0, 0.08)"
			}
			transition="all 0.3s ease"
			_hover={{
				transform: highlighted ? "scale(1.07)" : "translateY(-4px)",
			}}
		>
			{highlighted && (
				<Box
					position="absolute"
					top="-12px"
					left="50%"
					transform="translateX(-50%)"
					bg="#DC2626"
					color="white"
					px={4}
					py={1}
					borderRadius="full"
					fontSize="12px"
					fontWeight="bold"
					letterSpacing="0.05em"
				>
					BEST VALUE
				</Box>
			)}

			<VStack gap={6} align="stretch">
				<Box>
					<Text
						fontSize="14px"
						fontWeight="semibold"
						color={highlighted ? "gray.400" : "#525252"}
						letterSpacing="0.05em"
						textTransform="uppercase"
						mb={2}
					>
						{name}
					</Text>
					<Box display="flex" alignItems="baseline" gap={1}>
						<Text
							fontSize="14px"
							fontWeight="medium"
							color={highlighted ? "gray.400" : "#525252"}
						>
							IDR
						</Text>
						<Text
							fontSize={{ base: "36px", md: "48px" }}
							fontWeight="bold"
							color={highlighted ? "white" : "#0A0A0A"}
							lineHeight="1"
						>
							{price}
						</Text>
					</Box>
					<Text
						fontSize="14px"
						color={highlighted ? "gray.400" : "#525252"}
						mt={1}
					>
						{period}
					</Text>
				</Box>

				<Text
					fontSize="14px"
					color={highlighted ? "gray.300" : "#525252"}
				>
					{description}
				</Text>

				<List.Root gap={3}>
					{features.map((feature, index) => (
						<List.Item
							key={index}
							display="flex"
							alignItems="center"
							gap={3}
							fontSize="14px"
							color={highlighted ? "gray.200" : "#525252"}
						>
							<Box
								w="6px"
								h="6px"
								borderRadius="full"
								bg={highlighted ? "#38BDF8" : "#0F172A"}
								flexShrink={0}
							/>
							{feature}
						</List.Item>
					))}
				</List.Root>

				<Link to="/">
					<Button
						w="100%"
						h="48px"
						bg={highlighted ? "white" : "#0F172A"}
						color={highlighted ? "#0F172A" : "white"}
						borderRadius="12px"
						fontSize="14px"
						fontWeight="semibold"
						_hover={{
							bg: highlighted ? "gray.100" : "#1E293B",
						}}
						transition="all 0.2s"
					>
						{cta}
					</Button>
				</Link>
			</VStack>
		</Box>
	);
}

export function PricingSection() {
	return (
		<Box
			as="section"
			minH="100vh"
			bg="#F5F5F5"
			display="flex"
			alignItems="center"
			py={{ base: 16, md: 24 }}
		>
			<Container maxW="container.xl">
				<VStack gap={{ base: 10, md: 16 }} align="stretch">
					<VStack gap={6} textAlign="center" maxW="700px" mx="auto">
						<Text
							as="span"
							fontSize="12px"
							fontWeight="semibold"
							letterSpacing="0.15em"
							textTransform="uppercase"
							color="#525252"
						>
							Simple pricing
						</Text>
						<Heading
							as="h2"
							fontSize={{ base: "40px", md: "56px" }}
							fontWeight="bold"
							letterSpacing="-0.02em"
							lineHeight="1.1"
							color="#0A0A0A"
						>
							As cheap as it gets!
						</Heading>
						<Text fontSize="20px" color="#525252">
							Quality education shouldn't break the bank. Our pricing is designed
							to be accessible to everyone serious about learning.
						</Text>
					</VStack>

					<SimpleGrid
						columns={{ base: 1, md: 2, lg: 3 }}
						gap={{ base: 6, lg: 8 }}
						px={{ base: 4, md: 0 }}
					>
						{pricingPlans.map((plan) => (
							<PricingCard
								key={plan.id}
								name={plan.name}
								price={plan.price}
								period={plan.period}
								description={plan.description}
								features={plan.features}
								highlighted={plan.highlighted}
								cta={plan.cta}
							/>
						))}
					</SimpleGrid>

					<Box textAlign="center">
						<Text fontSize="14px" color="#525252">
							All plans include a 7-day free trial.{" "}
							<Text
								as="span"
								fontWeight="semibold"
								color="#0F172A"
								cursor="pointer"
								_hover={{ textDecoration: "underline" }}
							>
								Contact us
							</Text>{" "}
							for enterprise pricing.
						</Text>
					</Box>
				</VStack>
			</Container>
		</Box>
	);
}
