import type { ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";
import { useEngineEvents } from "../../application/hooks/useEvents";
import type { GameEvent } from "../../application/state/types";
import { useDragContext } from "../interaction/drag/DragContext";
import { DrawerPanel } from "./DrawerPanel";
import { useDrawerStore } from "./drawer-context";

export type DrawerLayoutProps = {
	drawerId: string;
	children?: ReactNode;
	onOpenEvents?: GameEvent["type"][];
	onCloseEvents?: GameEvent["type"][];
};

export const DrawerLayout = ({
	drawerId,
	children,
	onOpenEvents,
	onCloseEvents,
}: DrawerLayoutProps) => {
	const { drawers, openDrawer, closeDrawer } = useDrawerStore();
	const { activeDrag } = useDragContext();
	const drawer = drawers[drawerId];
	const { events, ack } = useEngineEvents(`drawer-layout:${drawerId}`);
	const openEventSet = useMemo(
		() => new Set(onOpenEvents ?? []),
		[onOpenEvents],
	);
	const closeEventSet = useMemo(
		() => new Set(onCloseEvents ?? []),
		[onCloseEvents],
	);
	const draggingRef = useRef(false);

	useEffect(() => {
		if (!drawer) return;
		const isDragging = Boolean(activeDrag);
		if (isDragging && !draggingRef.current && drawer.state === "expanded") {
			closeDrawer(drawerId);
		}
		draggingRef.current = isDragging;
	}, [activeDrag, closeDrawer, drawer, drawerId]);

	useEffect(() => {
		if (events.length === 0) {
			return;
		}

		for (const event of events) {
			if (openEventSet.has(event.type)) {
				if (drawer?.state === "folded") {
					openDrawer(drawerId);
				}
				continue;
			}

			if (closeEventSet.has(event.type)) {
				if (drawer?.state === "expanded") {
					closeDrawer(drawerId);
				}
			}
		}

		ack();
	}, [
		ack,
		closeEventSet,
		closeDrawer,
		drawer?.state,
		drawerId,
		events,
		openDrawer,
		openEventSet,
	]);

	if (!drawer) {
		return null;
	}

	return <DrawerPanel drawer={drawer}>{children}</DrawerPanel>;
};
