/**
 * Game engine layer exports.
 * Provides declarative components, hooks, and types for building game questions.
 */

/**
 * Presentation facade.
 * Keep route-level UI imports on the engine root entrypoint.
 */
export {
	DrawerLayout,
	type DrawerLayoutProps,
} from "../internal/presentation/drawer/DrawerLayout";
export {
	DrawerPanel,
	type DrawerPanelProps,
} from "../internal/presentation/drawer/DrawerPanel";
export {
	DrawerProvider,
	useDrawerEvents,
	useDrawerStore,
} from "../internal/presentation/drawer/drawer-context";
export {
	PlacedEntity,
	type PlacedEntityProps,
} from "../internal/presentation/entity/PlacedEntity";
export * from "../internal/presentation/hint";
export { DragOverlay } from "../internal/presentation/interaction/drag/DragOverlay";
export * from "../internal/presentation/modal";
export * from "../internal/presentation/space/arrow";
export {
	TerminalInput,
	type TerminalInputProps,
} from "../internal/presentation/terminal/input";
export { TerminalLayout } from "../internal/presentation/terminal/layout";
export {
	TerminalProvider,
	useTerminalStore,
} from "../internal/presentation/terminal/terminal-context";
export { useTerminalInput } from "../internal/presentation/terminal/use-terminal-input";
export { TerminalView } from "../internal/presentation/terminal/view";
export * from "./components";
export * from "./hooks";
