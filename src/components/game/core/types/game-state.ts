import type { Arrow } from "./arrow";
import type { HintState } from "./hint";
import type { InventoryGroup } from "./inventory";
import type { OverlayState } from "./modal";
import type { SpaceState } from "./puzzle";
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
	space: SpaceState;
	spaces?: Record<string, SpaceState>;
	arrows: Arrow[];
	terminal: TerminalState;
	hint: HintState;
	overlay: OverlayState;
	question: { id: string; status: QuestionStatus };
	sequence: number;
};
