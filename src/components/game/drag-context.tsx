import { createContext, useContext, useRef, useState } from "react";
import type { ActiveDrag } from "./drag-types";

type DragContextValue = {
	activeDrag: ActiveDrag | null;
	setActiveDrag: React.Dispatch<React.SetStateAction<ActiveDrag | null>>;
	proxyRef: React.RefObject<HTMLDivElement | null>;
};

const DragContext = createContext<DragContextValue | null>(null);

export function DragProvider({ children }: { children: React.ReactNode }) {
	const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
	const proxyRef = useRef<HTMLDivElement | null>(null);

	return (
		<DragContext.Provider value={{ activeDrag, setActiveDrag, proxyRef }}>
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
