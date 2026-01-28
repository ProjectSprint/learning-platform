import { Box, Text } from "@chakra-ui/react";
import { Icon } from "@iconify/react";
import { memo, type RefCallback } from "react";

import type { PlacedItem } from "../../core/types";
import type { ItemLabelGetter, StatusMessageGetter } from "./types";

type PlacedItemCardProps = {
	item: PlacedItem;
	puzzleId?: string;
	x: number;
	y: number;
	width: number;
	height: number;
	isDragging: boolean;
	getItemLabel: ItemLabelGetter;
	getStatusMessage: StatusMessageGetter;
	itemRef: RefCallback<HTMLDivElement>;
};

export const PlacedItemCard = memo(
	({
		item,
		puzzleId,
		x,
		y,
		width,
		height,
		isDragging,
		getItemLabel,
		getStatusMessage,
		itemRef,
	}: PlacedItemCardProps) => {
		const label = getItemLabel(item.type);
		const statusMessage = getStatusMessage(item, puzzleId);
		const iconInfo = item.icon;

		const getStatusBadgeColor = () => {
			if (item.status === "error") return "red.600";
			if (item.status === "warning") return "yellow.600";
			if (item.status === "success") return "green.600";
			return "gray.600";
		};

		const getBorderColor = () => {
			const isConnectable = item.behavior === "connectable";

			if (isConnectable) {
				if (item.status === "success") return "cyan.500";
				if (item.status === "warning") return "yellow.500";
				if (item.status === "error") return "red.500";
				return "gray.500";
			}
			return "cyan.500";
		};

		return (
			<Box
				ref={itemRef}
				position="absolute"
				top={`${y}px`}
				left={`${x}px`}
				width={`${width}px`}
				height={`${height}px`}
				bg="gray.800"
				border="1px solid"
				borderColor={getBorderColor()}
				borderRadius="md"
				display="flex"
				flexDirection="row"
				alignItems="center"
				justifyContent="center"
				gap={2}
				px={3}
				cursor="grab"
				zIndex={isDragging ? 9999 : 1}
				style={{ touchAction: "none" }}
				aria-label={`${label}${statusMessage ? `: ${statusMessage}` : ""}`}
			>
				{iconInfo && (
					<Icon
						icon={iconInfo.icon}
						width={20}
						height={20}
						color={iconInfo.color}
					/>
				)}
				<Text fontSize="xs" fontWeight="bold" color="gray.100">
					{label}
				</Text>

				{statusMessage && (
					<Box
						position="absolute"
						top="-8px"
						right="-8px"
						fontSize="11px"
						px={1.5}
						py={0.5}
						borderRadius="full"
						bg={getStatusBadgeColor()}
						color="white"
						fontWeight="medium"
						boxShadow="sm"
						whiteSpace="nowrap"
					>
						{statusMessage}
					</Box>
				)}
			</Box>
		);
	},
	(prev, next) =>
		prev.item.id === next.item.id &&
		prev.item.status === next.item.status &&
		prev.item.data?.ip === next.item.data?.ip &&
		prev.item.data?.tcpState === next.item.data?.tcpState &&
		prev.item.data?.seqEnabled === next.item.data?.seqEnabled &&
		prev.item.data?.ack === next.item.data?.ack &&
		prev.x === next.x &&
		prev.y === next.y &&
		prev.width === next.width &&
		prev.height === next.height &&
		prev.isDragging === next.isDragging,
);
