import { Box } from "@chakra-ui/react";
import { CarouselSection } from "./carousel-section";
import { HeroSection } from "./hero-section";
import { PricingSection } from "./pricing-section";
import { TetrisSection } from "./tetris-section";

export function LandingPage() {
	return (
		<Box bg="white" color="gray.900">
			<HeroSection />
			<TetrisSection />
			<CarouselSection />
			<PricingSection />
		</Box>
	);
}
