export type CanvasAction =
	| {
			type: "PLACE_ITEM";
			payload: {
				itemId: string;
				blockX: number;
				blockY: number;
				canvasId?: string;
			};
	  }
	| {
			type: "REMOVE_ITEM";
			payload: { blockX: number; blockY: number; canvasId?: string };
	  }
	| {
			type: "REPOSITION_ITEM";
			payload: {
				itemId: string;
				fromBlockX: number;
				fromBlockY: number;
				toBlockX: number;
				toBlockY: number;
				canvasId?: string;
			};
	  }
	| {
			type: "CONFIGURE_DEVICE";
			payload: {
				deviceId: string;
				config: Record<string, unknown>;
				canvasId?: string;
			};
	  }
	| {
			type: "TRANSFER_ITEM";
			payload: {
				itemId: string;
				fromCanvas: string;
				fromBlockX: number;
				fromBlockY: number;
				toCanvas: string;
				toBlockX: number;
				toBlockY: number;
			};
	  }
	| {
			type: "SWAP_ITEMS";
			payload: {
				from: { canvasId?: string; blockX: number; blockY: number };
				to: { canvasId?: string; blockX: number; blockY: number };
			};
	  };
