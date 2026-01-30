import { Box } from "@chakra-ui/react";
import { getBoxToBoxArrow } from "perfect-arrows";
import type { ArrowAnchor, ArrowStyle } from "@/components/game/game-provider";
import { useGameState } from "@/components/game/game-provider";
import { useBoardRegistry } from "./board-registry";

const defaultAnchor: ArrowAnchor = { x: 0.5, y: 0.5 };

const resolveAnchorPoint = (
	rect: DOMRect,
	containerRect: DOMRect,
	anchor?: ArrowAnchor,
) => {
	const safeAnchor = anchor ?? defaultAnchor;
	return {
		x:
			rect.left -
			containerRect.left +
			rect.width * safeAnchor.x +
			(safeAnchor.offsetX ?? 0),
		y:
			rect.top -
			containerRect.top +
			rect.height * safeAnchor.y +
			(safeAnchor.offsetY ?? 0),
	};
};

const resolveArrowOptions = (style?: ArrowStyle) => ({
	bow: style?.bow ?? 0.02,
	stretch: style?.stretch ?? 0.02,
	stretchMin: style?.stretchMin,
	stretchMax: style?.stretchMax,
	padStart: style?.padStart,
	padEnd: style?.padEnd,
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
			const fromAnchor = resolveAnchorPoint(
				fromRect,
				containerRect,
				arrow.from.anchor,
			);
			const toAnchor = resolveAnchorPoint(
				toRect,
				containerRect,
				arrow.to.anchor,
			);
			const anchorBoxSize = 4;
			const [startX, startY, controlX, controlY, endX, endY, endAngle] =
				getBoxToBoxArrow(
					fromAnchor.x - anchorBoxSize / 2,
					fromAnchor.y - anchorBoxSize / 2,
					anchorBoxSize,
					anchorBoxSize,
					toAnchor.x - anchorBoxSize / 2,
					toAnchor.y - anchorBoxSize / 2,
					anchorBoxSize,
					anchorBoxSize,
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
