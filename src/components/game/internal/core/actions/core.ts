import type {
	GamePhase,
	InventoryGroupConfig,
	QuestionStatus,
	SpaceConfig,
} from "../types";

export type CoreAction =
	| {
			type: "INIT_MULTI_SPACE";
			payload: {
				questionId: string;
				spaces: Record<string, SpaceConfig>;
				inventoryGroups?: InventoryGroupConfig[];
				phase?: GamePhase;
				questionStatus?: QuestionStatus;
			};
	  }
	| { type: "SET_PHASE"; payload: { phase: GamePhase } }
	| { type: "COMPLETE_QUESTION" };
