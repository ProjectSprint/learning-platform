import type { ItemDataConfig } from "../../domain/entity/entity-data";
import type { GridPosition } from "../../domain/space/space-data";

export type WorldIntent =
	| {
			type: "world.create_entity";
			payload: { config: ItemDataConfig };
	  }
	| {
			type: "world.update_entity";
			payload: {
				entityId: string;
				updates: {
					name?: string;
					data?: Record<string, unknown>;
					visual?: Record<string, unknown>;
				};
			};
	  }
	| {
			type: "world.update_entity_state";
			payload: { entityId: string; state: Record<string, unknown> };
	  }
	| {
			type: "world.delete_entities";
			payload: { entityIds: string[] };
	  }
	| {
			type: "world.add_to_space";
			payload: { entityId: string; spaceId: string; position?: GridPosition };
	  }
	| {
			type: "world.remove_from_space";
			payload: { entityId: string; spaceId: string };
	  }
	| {
			type: "world.move_entity";
			payload: { entityId: string; toSpaceId: string; position?: GridPosition };
	  }
	| {
			type: "world.move_entity_to_grid";
			payload: { entityId: string; spaceId: string };
	  };
