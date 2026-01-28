import type { InventoryGroupConfig, InventoryItem } from "../types";

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
				items?: InventoryItem[];
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
