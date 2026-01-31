import { useBreakpointValue } from "@chakra-ui/react";
import type {
	PuzzleBreakpoint,
	PuzzleSize,
	PuzzleSizeValue,
} from "../../core/types";

const breakpointFallbacks: Record<PuzzleBreakpoint, PuzzleBreakpoint[]> = {
	base: ["base"],
	sm: ["sm", "base"],
	md: ["md", "sm", "base"],
	lg: ["lg", "md", "sm", "base"],
	xl: ["xl", "lg", "md", "sm", "base"],
	"2xl": ["2xl", "xl", "lg", "md", "sm", "base"],
};

export const resolvePuzzleSizeValue = (
	size: PuzzleSizeValue,
	breakpoint: PuzzleBreakpoint,
): PuzzleSize => {
	if (Array.isArray(size)) {
		return size;
	}

	const fallbacks = breakpointFallbacks[breakpoint] ?? ["base"];
	for (const key of fallbacks) {
		const value = size[key];
		if (value) {
			return value;
		}
	}

	return [1, 1];
};

export const getMaxPuzzleSize = (size: PuzzleSizeValue): PuzzleSize => {
	if (Array.isArray(size)) {
		return size;
	}

	const values = Object.values(size).filter(Boolean) as PuzzleSize[];
	if (values.length === 0) {
		return [1, 1];
	}

	let maxColumns = 1;
	let maxRows = 1;
	for (const [columns, rows] of values) {
		if (columns > maxColumns) {
			maxColumns = columns;
		}
		if (rows > maxRows) {
			maxRows = rows;
		}
	}

	return [maxColumns, maxRows];
};

export const usePuzzleBreakpoint = (): PuzzleBreakpoint =>
	useBreakpointValue<PuzzleBreakpoint>({
		base: "base",
		sm: "sm",
		md: "md",
		lg: "lg",
		xl: "xl",
		"2xl": "2xl",
	}) ?? "base";

export const useResolvedPuzzleSize = (size: PuzzleSizeValue): PuzzleSize =>
	resolvePuzzleSizeValue(size, usePuzzleBreakpoint());
