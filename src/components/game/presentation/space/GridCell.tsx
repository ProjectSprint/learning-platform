/**
 * GridCell component.
 * Renders a single cell in a grid space.
 * Space-agnostic cell rendering that works with any GridSpace.
 *
 * This is the presentation layer equivalent of puzzle/board/grid-cell.tsx,
 * but decoupled from the puzzle-specific implementation.
 */

import { Box } from "@chakra-ui/react";
import { memo } from "react";

/**
 * Props for the GridCell component.
 */
export type GridCellProps = {
	/** Border color for the cell */
	borderColor: string;
	/** Whether to show the border */
	showBorder: boolean;
	/** Whether the cell is occupied by an entity */
	isOccupied: boolean;
	/** Height of the cell in pixels */
	height: number;
};

/**
 * GridCell component.
 * Renders a single cell in a grid with customizable appearance.
 *
 * @example
 * ```tsx
 * <GridCell
 *   borderColor="cyan.400"
 *   showBorder={true}
 *   isOccupied={false}
 *   height={60}
 * />
 * ```
 */
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
		prev.isOccupied === next.isOccupied &&
		prev.height === next.height,
);

GridCell.displayName = "GridCell";
