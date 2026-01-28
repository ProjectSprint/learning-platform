import { type RefObject, useEffect, useMemo, useState } from "react";

import type { GridMetrics } from "./types";

type GridMetricsState = {
	width: number;
	height: number;
	gapX: number;
	gapY: number;
};

type UseGridMetricsOptions = {
	elementRef: RefObject<HTMLElement>;
	columns: number;
	blockHeight: number;
};

export const useGridMetrics = ({
	elementRef,
	columns,
	blockHeight,
}: UseGridMetricsOptions) => {
	const [size, setSize] = useState<GridMetricsState>({
		width: 0,
		height: 0,
		gapX: 0,
		gapY: 0,
	});

	useEffect(() => {
		const element = elementRef.current;
		if (!element) {
			return;
		}

		const updateSize = () => {
			const rect = element.getBoundingClientRect();
			const styles = window.getComputedStyle(element);
			const gapX = Number.parseFloat(styles.columnGap || styles.gap || "0");
			const gapY = Number.parseFloat(styles.rowGap || styles.gap || "0");
			setSize({ width: rect.width, height: rect.height, gapX, gapY });
		};

		updateSize();

		if (typeof ResizeObserver === "undefined") {
			window.addEventListener("resize", updateSize);
			return () => window.removeEventListener("resize", updateSize);
		}

		const observer = new ResizeObserver(updateSize);
		observer.observe(element);
		return () => observer.disconnect();
	}, [elementRef]);

	const blockWidth =
		columns > 0 ? (size.width - size.gapX * (columns - 1)) / columns : 0;

	const gridMetrics: GridMetrics = useMemo(
		() => ({
			blockWidth: blockWidth || 0,
			blockHeight,
			gapX: size.gapX,
			gapY: size.gapY,
		}),
		[blockWidth, blockHeight, size.gapX, size.gapY],
	);

	return {
		gridMetrics,
		blockWidth,
		blockHeight,
		gapX: size.gapX,
		gapY: size.gapY,
		width: size.width,
		height: size.height,
	};
};
