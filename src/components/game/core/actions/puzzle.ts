export type PuzzleAction =
	| {
			type: "PLACE_ITEM";
			payload: {
				itemId: string;
				blockX: number;
				blockY: number;
				puzzleId?: string;
			};
	  }
	| {
			type: "REMOVE_ITEM";
			payload: { blockX: number; blockY: number; puzzleId?: string };
	  }
	| {
			type: "REPOSITION_ITEM";
			payload: {
				itemId: string;
				fromBlockX: number;
				fromBlockY: number;
				toBlockX: number;
				toBlockY: number;
				puzzleId?: string;
			};
	  }
	| {
			type: "CONFIGURE_DEVICE";
			payload: {
				deviceId: string;
				config: Record<string, unknown>;
				puzzleId?: string;
			};
	  }
	| {
			type: "TRANSFER_ITEM";
			payload: {
				itemId: string;
				fromPuzzle: string;
				fromBlockX: number;
				fromBlockY: number;
				toPuzzle: string;
				toBlockX: number;
				toBlockY: number;
			};
	  }
	| {
			type: "SWAP_ITEMS";
			payload: {
				from: { puzzleId?: string; blockX: number; blockY: number };
				to: { puzzleId?: string; blockX: number; blockY: number };
			};
	  };
