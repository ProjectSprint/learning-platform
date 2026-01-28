export type { PuzzleAction } from "./puzzle";
export type { ConnectionAction } from "./connection";
export type { CoreAction } from "./core";
export type { InventoryAction } from "./inventory";
export type { ModalAction } from "./modal";
export type { TerminalAction } from "./terminal";

import type { PuzzleAction } from "./puzzle";
import type { ConnectionAction } from "./connection";
import type { CoreAction } from "./core";
import type { InventoryAction } from "./inventory";
import type { ModalAction } from "./modal";
import type { TerminalAction } from "./terminal";

export type GameAction =
	| PuzzleAction
	| ConnectionAction
	| CoreAction
	| InventoryAction
	| ModalAction
	| TerminalAction;
