import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import type { GridSnapConfig } from "../grid";
import { createGridSnap } from "../grid";

export type { GridMetrics, GridSnapConfig } from "../grid";

let pluginsRegistered = false;

export const ensureGsapPlugins = () => {
	if (pluginsRegistered) {
		return;
	}

	gsap.registerPlugin(Draggable, InertiaPlugin);
	pluginsRegistered = true;
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
