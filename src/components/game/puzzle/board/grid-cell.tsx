import { Box } from "@chakra-ui/react";
import { memo } from "react";

type GridCellProps = {
	borderColor: string;
	showBorder: boolean;
	isOccupied: boolean;
	height: number;
};

export const GridCell = memo(
	({ borderColor, showBorder, isOccupied, height }: GridCellProps) => {
		const borderStyle = showBorder ? "dashed" : "solid";
		const resolvedBorderColor = showBorder ? borderColor : "transparent";

		return (
			<Box
				border={`1px ${borderStyle}`}
				borderColor={resolvedBorderColor}
				borderRadius="md"
				bg="transparent"
				height={`${height}px`}
				transition="border-color 0.15s ease"
				data-occupied={isOccupied}
			/>
		);
	},
	(prev, next) =>
		prev.borderColor === next.borderColor &&
		prev.showBorder === next.showBorder &&
		prev.isOccupied === next.isOccupied,
);
