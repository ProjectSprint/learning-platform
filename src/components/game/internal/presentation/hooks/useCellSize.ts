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
	const defaults = cellSize ?? DEFAULT_CELL_SIZE;
	const cellWidth = useResponsiveValue(defaults.cellWidth, 120);
	const cellHeight = useResponsiveValue(defaults.cellHeight, 52);
	return { cellWidth, cellHeight };
}

export function useGapSize(gapSize?: GapSize): ResolvedGapSize {
	const defaults = gapSize ?? DEFAULT_GAP_SIZE;
	const gapX = useResponsiveValue(defaults.gapX, 4);
	const gapY = useResponsiveValue(defaults.gapY, 4);
	return { gapX, gapY };
}
