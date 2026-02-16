import type { Action as __Action } from "../../internal/application/state/actions";
import type { GameState as __GameState } from "../../internal/application/state/types";
import type {
	EntityEnteredSpaceEvent as __EntityEnteredSpaceEvent,
	EntityLeftSpaceEvent as __EntityLeftSpaceEvent,
	EntityMovedEvent as __EntityMovedEvent,
	EntityUpdatedEvent as __EntityUpdatedEvent,
	TerminalInputEvent as __TerminalInputEvent,
} from "../../internal/application/state/types/events";

type _Action = __Action;
type _GameState = __GameState;
type _EntityEnteredSpaceEvent = __EntityEnteredSpaceEvent;
type _EntityLeftSpaceEvent = __EntityLeftSpaceEvent;
type _EntityMovedEvent = __EntityMovedEvent;
type _EntityUpdatedEvent = __EntityUpdatedEvent;
type _TerminalInputEvent = __TerminalInputEvent;

export type Action = _Action;
export type GameState = _GameState;
export type EntityEnteredSpaceEvent = _EntityEnteredSpaceEvent;
export type EntityLeftSpaceEvent = _EntityLeftSpaceEvent;
export type EntityMovedEvent = _EntityMovedEvent;
export type EntityUpdatedEvent = _EntityUpdatedEvent;
export type TerminalInputEvent = _TerminalInputEvent;
