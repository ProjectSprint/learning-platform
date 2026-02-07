/**
 * Drawer UI types.
 * Represents a responsive, mouse-aware container for Space content.
 */

/** Chakra breakpoint keys supported by the drawer system. */
export type DrawerBreakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl";

/** Drawer open/closed state. */
export type DrawerState = "expanded" | "folded";

/** Drawer position on screen. */
export type DrawerPosition = "bottom" | "top" | "left" | "right";

/** Responsive size mapping: breakpoint -> CSS size value (e.g., "320px", "40vh"). */
export type DrawerSizeMap = Partial<Record<DrawerBreakpoint, string>>;

/**
 * Drawer configuration provided by the caller when registering.
 *
 * @example
 * ```ts
 * const inventoryDrawer: DrawerConfig = {
 *   id: "inventory-drawer",
 *   contentType: "space",
 *   spaceId: "inventory",
 *   title: "Inventory",
 *   position: "bottom",
 *   initialState: "expanded",
 *   expandedSize: { base: "65vh", md: "40vh" },
 *   foldedSize: { md: "72px", lg: "80px" },
 *   mouseAware: true,
 *   showFloatingButton: true,
 *   floatingButtonLabel: "Inventory",
 * };
 * ```
 */
export type DrawerConfig = {
	/** Unique drawer identifier */
	id: string;
	/** Content type for this drawer (space only for now). */
	contentType: "space";
	/** Space ID to render inside the drawer. */
	spaceId: string;
	/** Optional title for the drawer titlebar. */
	title?: string;
	/** Drawer position (defaults to bottom). */
	position?: DrawerPosition;
	/** Initial drawer state (expanded or folded). */
	initialState?: DrawerState;
	/** Folded size per breakpoint. */
	foldedSize?: DrawerSizeMap;
	/** Expanded size per breakpoint. */
	expandedSize?: DrawerSizeMap;
	/** Enable mouse-aware auto expand/fold. */
	mouseAware?: boolean;
	/** Show floating button at base breakpoint when folded. */
	showFloatingButton?: boolean;
	/** Floating button label (base breakpoint). */
	floatingButtonLabel?: string;
};

/**
 * Drawer instance stored in overlay state.
 */
export type DrawerInstance = DrawerConfig & {
	/** Current drawer state. */
	state: DrawerState;
};
