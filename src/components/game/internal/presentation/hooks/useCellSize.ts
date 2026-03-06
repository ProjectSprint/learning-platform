import { useBreakpointValue } from "@chakra-ui/react";
import type {
	CellSize,
	GapSize,
	ResolvedCellSize,
	ResolvedGapSize,
	ResponsiveValue,
} from "@/components/game/types/space";

const DEFAULT_CELL_SIZE: CellSize = {
	cellWidth: { base: 64, sm: 76, md: 88, lg: 104, xl: 120 },
	cellHeight: { base: 28, sm: 34, md: 40, lg: 46, xl: 52 },
};

const DEFAULT_GAP_SIZE: GapSize = {
	gapX: { base: 4 },
	gapY: { base: 4 },
};

export function useResponsiveValue(
	value: ResponsiveValue<number> | undefined,
	fallback: number,
): number {
	const breakpointMap =
		typeof value === "number" || value === undefined ? undefined : value;
	const resolved = useBreakpointValue<number>(breakpointMap ?? {});

	if (typeof value === "number") {
		return value;
	}
	if (value === undefined) {
		return fallback;
	}
	return resolved ?? value.base;
}

export function useCellSize(cellSize?: CellSize): ResolvedCellSize {
	const cellWidth = useResponsiveValue(
		cellSize?.cellWidth ?? DEFAULT_CELL_SIZE.cellWidth,
		0,
	);
	const cellHeight = useResponsiveValue(
		cellSize?.cellHeight ?? DEFAULT_CELL_SIZE.cellHeight,
		0,
	);
	return { cellWidth, cellHeight };
}

export function useGapSize(gapSize?: GapSize): ResolvedGapSize {
	const gapX = useResponsiveValue(
		gapSize?.gapX ?? DEFAULT_GAP_SIZE.gapX,
		0,
	);
	const gapY = useResponsiveValue(
		gapSize?.gapY ?? DEFAULT_GAP_SIZE.gapY,
		0,
	);
	return { gapX, gapY };
}
