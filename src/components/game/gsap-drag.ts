import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";

let pluginsRegistered = false;

export const ensureGsapPlugins = () => {
	if (pluginsRegistered) {
		return;
	}

	gsap.registerPlugin(Draggable, InertiaPlugin);
	pluginsRegistered = true;
};

export type GridSnapConfig = {
	blockWidth: number;
	blockHeight?: number;
	offsetX?: number;
	offsetY?: number;
};

const snapToGrid = (value: number, size: number, offset: number) => {
	if (!Number.isFinite(size) || size <= 0) {
		return value;
	}

	return Math.round((value - offset) / size) * size + offset;
};

export const createGridSnap = ({
	blockWidth,
	blockHeight = blockWidth,
	offsetX = 0,
	offsetY = 0,
}: GridSnapConfig) => ({
	x: (value: number) => snapToGrid(value, blockWidth, offsetX),
	y: (value: number) => snapToGrid(value, blockHeight, offsetY),
});

export type GridMetrics = {
	blockWidth: number;
	blockHeight: number;
	gapX?: number;
	gapY?: number;
};

export type DragTarget =
	| Element
	| string
	| Array<Element>
	| NodeListOf<Element>;

export type DragHandle = {
	instance: Draggable;
	cleanup: () => void;
};

export const createDraggable = (
	target: DragTarget,
	options: Draggable.Vars = {},
): DragHandle => {
	ensureGsapPlugins();

	const [instance] = Draggable.create(target, {
		type: "x,y",
		inertia: true,
		...options,
	});

	return {
		instance,
		cleanup: () => {
			instance.kill();
		},
	};
};

export type GridDraggableConfig = {
	target: DragTarget;
	bounds: Element;
	gridSnap: GridSnapConfig;
	onDragStart?: (instance: Draggable) => void;
	onDrag?: (instance: Draggable) => void;
	onDragEnd?: (instance: Draggable) => void;
	onClick?: (instance: Draggable) => void;
};

export const createGridDraggable = ({
	target,
	bounds,
	gridSnap,
	onDragStart,
	onDrag,
	onDragEnd,
	onClick,
}: GridDraggableConfig): DragHandle => {
	ensureGsapPlugins();

	const snap = createGridSnap(gridSnap);

	const [instance] = Draggable.create(target, {
		type: "x,y",
		bounds,
		inertia: true,
		liveSnap: true,
		edgeResistance: 0.65,
		minimumMovement: 4,
		snap,
		onDragStart: function (this: Draggable) {
			onDragStart?.(this);
		},
		onDrag: function (this: Draggable) {
			onDrag?.(this);
		},
		onDragEnd: function (this: Draggable) {
			onDragEnd?.(this);
		},
		onClick: function (this: Draggable) {
			onClick?.(this);
		},
	});

	return {
		instance,
		cleanup: () => {
			instance.kill();
		},
	};
};

export const convertPixelToBlock = (
	x: number,
	y: number,
	metrics: GridMetrics,
): { blockX: number; blockY: number } => {
	const { blockWidth, blockHeight, gapX = 0, gapY = 0 } = metrics;
	const cellWidth = blockWidth + gapX;
	const cellHeight = blockHeight + gapY;

	return {
		blockX: Math.floor(x / cellWidth),
		blockY: Math.floor(y / cellHeight),
	};
};

export const convertBlockToPixel = (
	blockX: number,
	blockY: number,
	metrics: GridMetrics,
): { x: number; y: number } => {
	const { blockWidth, blockHeight, gapX = 0, gapY = 0 } = metrics;
	const cellWidth = blockWidth + gapX;
	const cellHeight = blockHeight + gapY;

	return {
		x: blockX * cellWidth,
		y: blockY * cellHeight,
	};
};

export const hitTest = (
	element1: Element,
	element2: Element,
	threshold: number | string = "50%",
): boolean => {
	ensureGsapPlugins();
	return Draggable.hitTest(element1, element2, threshold);
};

export const hitTestAny = (
	element: Element,
	targets: Element[],
	threshold: number | string = "50%",
): Element | null => {
	ensureGsapPlugins();
	for (const target of targets) {
		if (Draggable.hitTest(element, target, threshold)) {
			return target;
		}
	}
	return null;
};
