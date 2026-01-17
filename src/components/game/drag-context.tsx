import { createContext, useContext, useState } from "react";
import type { ActiveDrag } from "./drag-types";

type DragContextValue = {
	activeDrag: ActiveDrag | null;
	setActiveDrag: (drag: ActiveDrag | null) => void;
};

const DragContext = createContext<DragContextValue | null>(null);

export function DragProvider({ children }: { children: React.ReactNode }) {
	const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);

	return (
		<DragContext.Provider value={{ activeDrag, setActiveDrag }}>
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
