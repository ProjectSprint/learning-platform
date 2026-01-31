import type { InventoryGroupConfig, Item, ItemTooltip } from "../types";

export type InventoryAction =
	| {
			type: "ADD_INVENTORY_GROUP";
			payload: { group: InventoryGroupConfig };
	  }
	| {
			type: "UPDATE_INVENTORY_GROUP";
			payload: {
				id: string;
				title?: string;
				visible?: boolean;
				items?: Item[];
			};
	  }
	| {
			type: "UPDATE_ITEM_TOOLTIP";
			payload: {
				itemId: string;
				tooltip?: ItemTooltip | null;
			};
	  }
	| {
			type: "REMOVE_INVENTORY_GROUP";
			payload: { id: string };
	  }
	| {
			type: "PURGE_ITEMS";
			payload: { itemIds: string[] };
	  };
