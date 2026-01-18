import { Box, Flex, Text } from "@chakra-ui/react";
import { Component, type ReactNode, useId } from "react";

import { DragProvider } from "./drag-context";
import { DragOverlay } from "./drag-overlay";
import type { PlacedItem } from "./game-provider";
import { InventoryPanel, type TooltipInfo } from "./inventory-panel";
import { OverlayLayer } from "./overlay-layer";
import { PlayCanvas } from "./play-canvas";
import { TerminalPanel } from "./terminal-panel";

type ItemLabelGetter = (itemType: string) => string;
type StatusMessageGetter = (placedItem: PlacedItem) => string | null;
type PlacedItemClickHandler = (placedItem: PlacedItem) => void;
type ItemClickableCheck = (placedItem: PlacedItem) => boolean;

type GameLayoutProps = {
	getItemLabel?: ItemLabelGetter;
	getStatusMessage?: StatusMessageGetter;
	onPlacedItemClick?: PlacedItemClickHandler;
	isItemClickable?: ItemClickableCheck;
	contextualHint?: string;
	inventoryTooltips?: Record<string, TooltipInfo>;
};

type SegmentErrorBoundaryProps = {
	name: string;
	children: ReactNode;
};

type SegmentErrorBoundaryState = {
	hasError: boolean;
};

class SegmentErrorBoundary extends Component<
	SegmentErrorBoundaryProps,
	SegmentErrorBoundaryState
> {
	state: SegmentErrorBoundaryState = { hasError: false };

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	render() {
		if (this.state.hasError) {
			return (
				<Flex
					align="center"
					justify="center"
					flex="1"
					bg="gray.900"
					color="gray.100"
					border="1px solid"
					borderColor="gray.700"
					borderRadius="md"
					p={4}
				>
					<Text fontSize="sm">Unable to load {this.props.name}.</Text>
				</Flex>
			);
		}

		return this.props.children;
	}
}

const SkipLink = ({
	href,
	children,
}: {
	href: string;
	children: ReactNode;
}) => (
	<Box
		asChild
		position="absolute"
		top="0"
		left="0"
		bg="gray.900"
		color="white"
		px={4}
		py={2}
		transform="translateY(-120%)"
		_focus={{ transform: "translateY(0)" }}
		zIndex={10}
	>
		<a href={href}>{children}</a>
	</Box>
);

export const GameLayout = ({
	getItemLabel,
	getStatusMessage,
	onPlacedItemClick,
	isItemClickable,
	contextualHint,
	inventoryTooltips,
}: GameLayoutProps = {}) => {
	const canvasId = useId();
	const terminalId = useId();

	return (
		<DragProvider>
			<Box
				as="main"
				role="main"
				height="100vh"
				display="flex"
				flexDirection="column"
				bg="gray.950"
				color="gray.100"
				position="relative"
			>
				<SkipLink href={`#${canvasId}`}>Skip to Game Canvas</SkipLink>
				<SkipLink href={`#${terminalId}`}>Skip to Terminal</SkipLink>

				<Flex
					flex="1"
					overflow="visible"
					direction="column"
					justify="center"
					gap={4}
					px={{ base: 4, md: 12, lg: 24 }}
					py={{ base: 4, md: 6 }}
				>
					{contextualHint && (
						<Box
							bg="gray.800"
							border="1px solid"
							borderColor="gray.700"
							borderRadius="md"
							px={4}
							py={3}
							textAlign="center"
						>
							<Text fontSize="sm" color="gray.100">
								{contextualHint}
							</Text>
						</Box>
					)}

					<Box
						as="section"
						id={canvasId}
						role="region"
						aria-label="Game Canvas"
						overflow="visible"
					>
						<SegmentErrorBoundary name="canvas">
							<PlayCanvas
								getItemLabel={getItemLabel}
								getStatusMessage={getStatusMessage}
								onPlacedItemClick={onPlacedItemClick}
								isItemClickable={isItemClickable}
							/>
						</SegmentErrorBoundary>
					</Box>

					<Box
						as="aside"
						role="complementary"
						aria-label="Inventory"
						alignSelf="center"
					>
						<SegmentErrorBoundary name="inventory">
							<InventoryPanel tooltips={inventoryTooltips} />
						</SegmentErrorBoundary>
					</Box>
				</Flex>

				<Box id={terminalId}>
					<SegmentErrorBoundary name="terminal">
						<TerminalPanel />
					</SegmentErrorBoundary>
				</Box>

				<OverlayLayer />
				<DragOverlay getItemLabel={getItemLabel} />
			</Box>
		</DragProvider>
	);
};
