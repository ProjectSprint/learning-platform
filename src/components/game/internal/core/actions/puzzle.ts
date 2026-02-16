export type SpaceAction =
	| {
			type: "PLACE_ITEM";
			payload: {
				itemId: string;
				blockX: number;
				blockY: number;
				spaceId?: string;
			};
	  }
	| {
			type: "REMOVE_ITEM";
			payload: { blockX: number; blockY: number; spaceId?: string };
	  }
	| {
			type: "REPOSITION_ITEM";
			payload: {
				itemId: string;
				fromBlockX: number;
				fromBlockY: number;
				toBlockX: number;
				toBlockY: number;
				spaceId?: string;
			};
	  }
	| {
			type: "CONFIGURE_DEVICE";
			payload: {
				deviceId: string;
				config: Record<string, unknown>;
				spaceId?: string;
			};
	  }
	| {
			type: "TRANSFER_ITEM";
			payload: {
				itemId: string;
				fromSpace: string;
				fromBlockX: number;
				fromBlockY: number;
				toSpace: string;
				toBlockX: number;
				toBlockY: number;
			};
	  }
	| {
			type: "SWAP_ITEMS";
			payload: {
				from: { spaceId?: string; blockX: number; blockY: number };
				to: { spaceId?: string; blockX: number; blockY: number };
			};
	  };
