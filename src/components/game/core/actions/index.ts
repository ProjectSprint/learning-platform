export type { ArrowAction } from "./arrows";
export type { CoreAction } from "./core";
export type { HintAction } from "./hint";
export type { ModalAction } from "./modal";
export type { PoolAction } from "./pool";
export type { SpaceAction } from "./puzzle";
export type { TerminalAction } from "./terminal";

import type { ArrowAction } from "./arrows";
import type { CoreAction } from "./core";
import type { HintAction } from "./hint";
import type { ModalAction } from "./modal";
import type { PoolAction } from "./pool";
import type { SpaceAction } from "./puzzle";
import type { TerminalAction } from "./terminal";

export type GameAction =
	| SpaceAction
	| ArrowAction
	| CoreAction
	| HintAction
	| PoolAction
	| ModalAction
	| TerminalAction;
