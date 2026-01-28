import type { CrossCanvasConnection } from "./connection";
import type { InventoryGroup } from "./inventory";
import type { OverlayState } from "./modal";
import type { PuzzleState } from "./puzzle";
import type { SharedZoneState } from "./shared-zone";
import type { TerminalState } from "./terminal";

export type GamePhase =
	| "setup"
	| "configuring"
	| "playing"
	| "terminal"
	| "completed";

export type QuestionStatus = "in_progress" | "completed";

export type GameState = {
	phase: GamePhase;
	inventory: { groups: InventoryGroup[] };
	puzzle: PuzzleState;
	puzzles?: Record<string, PuzzleState>;
	crossConnections: CrossCanvasConnection[];
	sharedZone: SharedZoneState;
	terminal: TerminalState;
	overlay: OverlayState;
	question: { id: string; status: QuestionStatus };
	sequence: number;
};
