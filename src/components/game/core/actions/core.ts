import type {
	GamePhase,
	InventoryGroupConfig,
	PuzzleConfig,
	QuestionStatus,
	TerminalState,
} from "../types";

export type CoreAction =
	| {
			type: "INIT_MULTI_CANVAS";
			payload: {
				questionId: string;
				canvases: Record<string, PuzzleConfig>;
				inventoryGroups?: InventoryGroupConfig[];
				terminal?: Partial<TerminalState>;
				phase?: GamePhase;
				questionStatus?: QuestionStatus;
			};
	  }
	| { type: "SET_PHASE"; payload: { phase: GamePhase } }
	| { type: "COMPLETE_QUESTION" };
