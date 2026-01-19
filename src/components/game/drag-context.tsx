import { createContext, useContext, useRef, useState } from "react";
import type { ActiveDrag } from "./drag-types";

type DragContextValue = {
	activeDrag: ActiveDrag | null;
	setActiveDrag: React.Dispatch<React.SetStateAction<ActiveDrag | null>>;
	proxyRef: React.RefObject<HTMLDivElement | null>;
	targetCanvasKeyRef: React.RefObject<string | undefined>;
};

const DragContext = createContext<DragContextValue | null>(null);

export function DragProvider({ children }: { children: React.ReactNode }) {
	const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
	const proxyRef = useRef<HTMLDivElement | null>(null);
	const targetCanvasKeyRef = useRef<string | undefined>(undefined);

	return (
		<DragContext.Provider
			value={{ activeDrag, setActiveDrag, proxyRef, targetCanvasKeyRef }}
		>
			{children}
		</DragContext.Provider>
	);
}

export function useDragContext() {
	const context = useContext(DragContext);
	if (!context) {
		throw new Error("useDragContext must be used within a DragProvider");
	}
	return context;
}
