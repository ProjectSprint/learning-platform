export type { ArrowAction } from "./arrows";
export type { CoreAction } from "./core";
export type { HintAction } from "./hint";
export type { InventoryAction } from "./inventory";
export type { ModalAction } from "./modal";
export type { PuzzleAction } from "./puzzle";
export type { TerminalAction } from "./terminal";

import type { ArrowAction } from "./arrows";
import type { CoreAction } from "./core";
import type { HintAction } from "./hint";
import type { InventoryAction } from "./inventory";
import type { ModalAction } from "./modal";
import type { PuzzleAction } from "./puzzle";
import type { TerminalAction } from "./terminal";

export type GameAction =
	| PuzzleAction
	| ArrowAction
	| CoreAction
	| HintAction
	| InventoryAction
	| ModalAction
	| TerminalAction;
