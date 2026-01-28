// Main exports for backward compatibility
// New code should import from specific modules: ./core, ./drag, ./canvas, etc.

// Canvas
export { PlayCanvas, type PlayCanvasProps } from "./canvas";
// Connection utilities
export * from "./connections";
export * from "./core/types";

// Drag system
export {
	type ActiveDrag,
	convertBlockToPixel,
	convertPixelToBlock,
	createDraggable,
	type DragData,
	type DragDropResult,
	type DragHandle,
	DragOverlay,
	DragProvider,
	type DragSource,
	ensureGsapPlugins,
	type GridMetrics,
	hitTestAny,
	useDragContext,
} from "./drag";
// Engines
export * from "./engines";
// Core state and types
export * from "./game-provider";
// Grid utilities
export * from "./grid";
// Help
export { HelpLink, InfoTooltip } from "./help";
// Icons
export * from "./icons";
// Inventory
export {
	InventoryDrawer,
	InventoryPanel,
	type InventoryPanelProps,
	useInventorySlotSize,
} from "./inventory";
// Modal
export * from "./modal";
// Question
export * from "./question";
// Shell
export { GameShell, SharedZone } from "./shell";
// Terminal
export {
	TerminalInput,
	type TerminalInputProps,
	TerminalLayout,
	TerminalView,
	useTerminalInput,
} from "./terminal";
// Validation utilities
export * from "./validation";
