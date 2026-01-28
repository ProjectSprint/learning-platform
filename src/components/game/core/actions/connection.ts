export type ConnectionAction =
	| {
			type: "MAKE_CONNECTION";
			payload: {
				from: { x: number; y: number };
				to: { x: number; y: number };
				cableId?: string;
				puzzleId?: string;
			};
	  }
	| {
			type: "REMOVE_CONNECTION";
			payload: { connectionId: string; puzzleId?: string };
	  }
	| {
			type: "MAKE_CROSS_CONNECTION";
			payload: {
				from: { canvasId: string; x: number; y: number };
				to: { canvasId: string; x: number; y: number };
				cableId?: string;
			};
	  }
	| {
			type: "REMOVE_CROSS_CONNECTION";
			payload: { connectionId: string };
	  };
