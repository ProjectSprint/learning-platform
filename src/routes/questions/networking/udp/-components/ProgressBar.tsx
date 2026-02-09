import { Box, Flex, Text, useBreakpointValue } from "@chakra-ui/react";

export type FrameStatus = "pending" | "delivered" | "lost";

export type ProgressBarProps = {
	clientId: string;
	frameStatuses: FrameStatus[];
	percentage: number;
};

export function ProgressBar({
	clientId,
	frameStatuses,
	percentage,
}: ProgressBarProps) {
	const segmentSize = useBreakpointValue({ base: 4, sm: 5, md: 6 });
	const gapSize = useBreakpointValue({ base: 1, sm: 1.5, md: 2 });

	const getStatusColor = (status: FrameStatus) => {
		switch (status) {
			case "delivered":
				return "green.500";
			case "lost":
				return "red.500";
			case "pending":
				return "gray.700";
		}
	};

	const getStatusLabel = (status: FrameStatus) => {
		switch (status) {
			case "delivered":
				return "✓";
			case "lost":
				return "✗";
			case "pending":
				return "";
		}
	};

	return (
		<Box width="100%">
			<Flex align="center" justify="space-between" mb={2}>
				<Text fontSize="sm" fontWeight="bold" color="gray.200">
					Client {clientId.toUpperCase()}
				</Text>
				<Text fontSize="sm" color="gray.400">
					{percentage}% received
				</Text>
			</Flex>
			<Flex gap={gapSize}>
				{frameStatuses.map((status, index) => (
					<Box
						key={`frame-${index + 1}`}
						flex={1}
						height={segmentSize}
						bg={getStatusColor(status)}
						borderRadius="sm"
						display="flex"
						alignItems="center"
						justifyContent="center"
						transition="all 0.2s ease-in-out"
						role="progressbar"
						aria-label={`Frame ${index + 1} status: ${status}`}
						aria-valuenow={
							status === "delivered" ? 1 : status === "lost" ? 0 : -1
						}
						aria-valuemin={0}
						aria-valuemax={1}
					>
						<Text
							fontSize="xs"
							color="white"
							fontWeight="bold"
							opacity={status === "pending" ? 0 : 1}
						>
							{getStatusLabel(status)}
						</Text>
					</Box>
				))}
			</Flex>
			<Text fontSize="xs" color="gray.500" mt={1}>
				{percentage >= 80
					? "Good enough for streaming"
					: "Waiting for more frames..."}
			</Text>
		</Box>
	);
}
