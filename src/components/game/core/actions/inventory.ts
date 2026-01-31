import type { InventoryGroupConfig, Item } from "../types";

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
			type: "REMOVE_INVENTORY_GROUP";
			payload: { id: string };
	  }
	| {
			type: "PURGE_ITEMS";
			payload: { itemIds: string[] };
	  };
