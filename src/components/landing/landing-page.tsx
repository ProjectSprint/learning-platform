import { Box } from "@chakra-ui/react";
import { HeroSection } from "./hero-section";
import { TetrisSection } from "./tetris-section";
import { CarouselSection } from "./carousel-section";
import { PricingSection } from "./pricing-section";

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
