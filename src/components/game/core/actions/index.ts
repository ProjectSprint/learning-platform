export type { CanvasAction } from "./canvas";
export type { ConnectionAction } from "./connection";
export type { CoreAction } from "./core";
export type { InventoryAction } from "./inventory";
export type { ModalAction } from "./modal";
export type { TerminalAction } from "./terminal";

import type { CanvasAction } from "./canvas";
import type { ConnectionAction } from "./connection";
import type { CoreAction } from "./core";
import type { InventoryAction } from "./inventory";
import type { ModalAction } from "./modal";
import type { TerminalAction } from "./terminal";

export type GameAction =
	| CanvasAction
	| ConnectionAction
	| CoreAction
	| InventoryAction
	| ModalAction
	| TerminalAction;
