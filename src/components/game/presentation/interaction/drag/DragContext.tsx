/**
 * DragContext for the presentation layer.
 * Manages drag and drop state for entities across spaces.
 *
 * Migrated from puzzle/drag/context.tsx but works with the Space/Entity model.
 * Maintains the same drag & drop behavior while being space-agnostic.
 */

import { createContext, useContext, useRef, useState } from "react";

/**
 * Data about the entity being dragged.
 */
export type DragData = {
	/** ID of the entity being dragged */
	entityId: string;
	/** Type of the entity */
	entityType: string;
	/** Optional display name */
	entityName?: string;
	/** Whether this is a reposition within the same space */
	isReposition?: boolean;
	/** Source position (for grid spaces) */
	fromPosition?: {
		row: number;
		col: number;
	};
};

/**
 * Source of the drag operation.
 */
export type DragSource = "pool" | "grid" | "queue" | "path";

/**
 * Active drag state.
 */
export type ActiveDrag = {
	/** Source type of the drag */
	source: DragSource;
	/** Data about what's being dragged */
	data: DragData;
	/** Source space ID */
	sourceSpaceId?: string;
	/** DOM element being dragged */
	element?: HTMLElement | null;
	/** Initial bounding rect of the dragged element */
	initialRect?: DOMRect;
	/** Pointer offset within the element */
	pointerOffset?: { x: number; y: number };
};

/**
 * Result of a drag and drop operation.
 */
export type DragDropResult = {
	/** Source of the drag */
	source: DragSource;
	/** Whether the entity was successfully placed */
	placed: boolean;
};

/**
 * Drag context value.
 */
type DragContextValue = {
	/** Current active drag state */
	activeDrag: ActiveDrag | null;
	/** Set the active drag state */
	setActiveDrag: React.Dispatch<React.SetStateAction<ActiveDrag | null>>;
	/** Ref to the drag proxy element (visual representation during drag) */
	proxyRef: React.RefObject<HTMLDivElement | null>;
	/** Ref to the target space ID during drag */
	targetSpaceIdRef: React.RefObject<string | undefined>;
	/** Result of the last drop operation */
	lastDropResult: DragDropResult | null;
	/** Set the last drop result */
	setLastDropResult: React.Dispatch<
		React.SetStateAction<DragDropResult | null>
	>;
};

const DragContext = createContext<DragContextValue | null>(null);

/**
 * DragProvider component.
 * Provides drag and drop context to child components.
 *
 * @example
 * ```tsx
 * <DragProvider>
 *   <GridSpaceView spaceId="puzzle" />
 *   <PoolSpaceView spaceId="inventory" />
 * </DragProvider>
 * ```
 */
export function DragProvider({ children }: { children: React.ReactNode }) {
	const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
	const [lastDropResult, setLastDropResult] = useState<DragDropResult | null>(
		null,
	);
	const proxyRef = useRef<HTMLDivElement | null>(null);
	const targetSpaceIdRef = useRef<string | undefined>(undefined);

	return (
		<DragContext.Provider
			value={{
				activeDrag,
				setActiveDrag,
				proxyRef,
				targetSpaceIdRef,
				lastDropResult,
				setLastDropResult,
			}}
		>
			{children}
		</DragContext.Provider>
	);
}

/**
 * Hook to access the drag context.
 * Must be used within a DragProvider.
 *
 * @throws Error if used outside of DragProvider
 *
 * @example
 * ```tsx
 * const { activeDrag, setActiveDrag } = useDragContext();
 * ```
 */
export function useDragContext() {
	const context = useContext(DragContext);
	if (!context) {
		throw new Error("useDragContext must be used within a DragProvider");
	}
	return context;
}

/**
 * Type for drag handle refs (used for cleanup).
 */
export type DragHandle = {
	/** Cleanup function */
	cleanup: () => void;
};
