import type { InventoryGroupConfig, Item, ItemTooltip } from "../types";

export type PoolAction =
	| {
			type: "ADD_POOL_GROUP";
			payload: { group: InventoryGroupConfig };
	  }
	| {
			type: "UPDATE_POOL_GROUP";
			payload: {
				id: string;
				title?: string;
				visible?: boolean;
				items?: Item[];
			};
	  }
	| {
			type: "UPDATE_POOL_ITEM_TOOLTIP";
			payload: {
				itemId: string;
				tooltip?: ItemTooltip | null;
			};
	  }
	| {
			type: "REMOVE_POOL_GROUP";
			payload: { id: string };
	  }
	| {
			type: "PURGE_POOL_ITEMS";
			payload: { itemIds: string[] };
	  };
