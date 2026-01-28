import type {
	PuzzleConfig,
	GamePhase,
	InventoryGroupConfig,
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
	| {
			type: "SET_SHARED_DATA";
			payload: {
				key: string;
				value: unknown;
				sourcePuzzleId?: string;
			};
	  }
	| {
			type: "REMOVE_SHARED_DATA";
			payload: { key: string };
	  }
	| { type: "SET_PHASE"; payload: { phase: GamePhase } }
	| { type: "COMPLETE_QUESTION" };
