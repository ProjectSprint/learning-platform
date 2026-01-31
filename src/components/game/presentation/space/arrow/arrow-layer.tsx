import { Box, useBreakpointValue } from "@chakra-ui/react";
import { getBoxToBoxArrow } from "perfect-arrows";
import type {
	ArrowAnchor,
	ArrowAnchorValue,
	ArrowBreakpoint,
	ArrowStyle,
} from "@/components/game/game-provider";
import { useGameState } from "@/components/game/game-provider";
import { useBoardRegistry } from "./board-registry";

const breakpointFallbacks: Record<ArrowBreakpoint, ArrowBreakpoint[]> = {
	base: ["base"],
	sm: ["sm", "base"],
	md: ["md", "sm", "base"],
	lg: ["lg", "md", "sm", "base"],
	xl: ["xl", "lg", "md", "sm", "base"],
	"2xl": ["2xl", "xl", "lg", "md", "sm", "base"],
};

const resolveAnchorValue = (
	anchor: ArrowAnchorValue,
	breakpoint: ArrowBreakpoint,
): ArrowAnchor => {
	if (typeof anchor === "string") {
		return anchor;
	}

	const fallbacks = breakpointFallbacks[breakpoint] ?? ["base"];
	for (const key of fallbacks) {
		const value = anchor[key];
		if (value) {
			return value;
		}
	}

	return "tl";
};

const resolveEndpointBox = (
	rect: DOMRect,
	containerRect: DOMRect,
	anchor: ArrowAnchor,
) => {
	const left = rect.left - containerRect.left;
	const top = rect.top - containerRect.top;
	const halfWidth = rect.width / 2;
	const halfHeight = rect.height / 2;
	const isRight = anchor === "tr" || anchor === "br";
	const isBottom = anchor === "bl" || anchor === "br";

	return {
		x: left + (isRight ? halfWidth : 0),
		y: top + (isBottom ? halfHeight : 0),
		width: halfWidth,
		height: halfHeight,
	};
};

const resolveArrowOptions = (style?: ArrowStyle) => ({
	bow: style?.bow ?? 0.02,
	stretch: style?.stretch ?? 0.02,
	stretchMin: style?.stretchMin,
	stretchMax: style?.stretchMax,
	padStart: style?.padStart,
	padEnd: style?.padEnd ?? 0,
	flip: style?.flip,
	straights: style?.straights,
});

const resolveStroke = (style?: ArrowStyle) => ({
	stroke: style?.stroke ?? "rgba(56, 189, 248, 0.85)",
	strokeWidth: style?.strokeWidth ?? 2,
	opacity: style?.opacity ?? 1,
	headSize: style?.headSize ?? 12,
	dashed: style?.dashed ?? false,
});

export const ArrowLayer = () => {
	const { arrows } = useGameState();
	const { containerRef, layoutVersion, getBoardElement } = useBoardRegistry();
	const container = containerRef.current;
	const activeBreakpoint =
		useBreakpointValue<ArrowBreakpoint>({
			base: "base",
			sm: "sm",
			md: "md",
			lg: "lg",
			xl: "xl",
			"2xl": "2xl",
		}) ?? "base";
	const paths = (() => {
		if (!container) {
			return [];
		}

		void layoutVersion;
		const containerRect = container.getBoundingClientRect();

		return arrows.flatMap((arrow) => {
			const fromElement = getBoardElement(arrow.from.puzzleId);
			const toElement = getBoardElement(arrow.to.puzzleId);

			if (!fromElement || !toElement) {
				return [];
			}

			const fromRect = fromElement.getBoundingClientRect();
			const toRect = toElement.getBoundingClientRect();
			const fromAnchor = resolveAnchorValue(
				arrow.from.anchor,
				activeBreakpoint,
			);
			const toAnchor = resolveAnchorValue(arrow.to.anchor, activeBreakpoint);
			const fromBox = resolveEndpointBox(fromRect, containerRect, fromAnchor);
			const toBox = resolveEndpointBox(toRect, containerRect, toAnchor);
			const [startX, startY, controlX, controlY, endX, endY, endAngle] =
				getBoxToBoxArrow(
					fromBox.x,
					fromBox.y,
					fromBox.width,
					fromBox.height,
					toBox.x,
					toBox.y,
					toBox.width,
					toBox.height,
					resolveArrowOptions(arrow.style),
				);
			const { stroke, strokeWidth, opacity, headSize, dashed } = resolveStroke(
				arrow.style,
			);
			const headAngle = Math.PI / 7;
			const headLeftX = endX - headSize * Math.cos(endAngle - headAngle);
			const headLeftY = endY - headSize * Math.sin(endAngle - headAngle);
			const headRightX = endX - headSize * Math.cos(endAngle + headAngle);
			const headRightY = endY - headSize * Math.sin(endAngle + headAngle);

			return [
				{
					id: `${arrow.id}-shaft`,
					d: `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`,
					stroke,
					strokeWidth,
					opacity,
					dashed,
				},
				{
					id: `${arrow.id}-head`,
					d: `M ${headLeftX} ${headLeftY} L ${endX} ${endY} L ${headRightX} ${headRightY}`,
					stroke,
					strokeWidth,
					opacity,
					dashed: false,
				},
			];
		});
	})();

	if (paths.length === 0) {
		return null;
	}

	return (
		<Box
			position="absolute"
			inset={0}
			zIndex={2}
			pointerEvents="none"
			overflow="hidden"
			aria-hidden="true"
		>
			<svg
				width="100%"
				height="100%"
				style={{ overflow: "visible" }}
				aria-hidden="true"
				role="presentation"
				focusable="false"
			>
				{paths.map((path) => (
					<path
						key={path.id}
						d={path.d}
						fill="none"
						stroke={path.stroke}
						strokeWidth={path.strokeWidth}
						strokeLinecap="round"
						strokeLinejoin="round"
						opacity={path.opacity}
						strokeDasharray={path.dashed ? "6 6" : undefined}
						vectorEffect="non-scaling-stroke"
					/>
				))}
			</svg>
		</Box>
	);
};
