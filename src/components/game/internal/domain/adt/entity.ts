import type {
	EntityData,
	EntityDataConfig,
	ItemData,
	ItemDataConfig,
} from "@/components/game/types/entity";

export const createEntityData = (config: EntityDataConfig): EntityData => {
	return {
		id: config.id,
		type: config.type,
		name: config.name,
		visual: config.visual ?? {},
		data: config.data ?? {},
		state: config.state ?? {},
		behaviorIds: config.behaviorIds ?? [],
	};
};

export const createItemData = (config: ItemDataConfig): ItemData => {
	const rawType = config.data?.type;
	const entityType = typeof rawType === "string" ? rawType : "item";
	return {
		id: config.id,
		type: entityType,
		name: config.name,
		visual: config.visual ?? {},
		data: config.data ?? {},
		state: config.state ?? {},
		behaviorIds: config.behaviorIds ?? [],
		allowedPlaces: config.allowedPlaces,
		icon: config.icon,
		tooltip: config.tooltip,
		draggable: config.draggable ?? true,
		category: config.category,
	};
};

export const cloneEntityData = (
	entity: EntityData,
	newId: string,
): EntityData => {
	return {
		...entity,
		id: newId,
		visual: { ...entity.visual },
		data: { ...entity.data },
		state: { ...entity.state },
		behaviorIds: [...entity.behaviorIds],
	};
};

export const cloneItemData = (item: ItemData, newId: string): ItemData => {
	return {
		...item,
		id: newId,
		visual: { ...item.visual },
		data: { ...item.data },
		state: { ...item.state },
		behaviorIds: [...item.behaviorIds],
		allowedPlaces: [...item.allowedPlaces],
		icon: item.icon ? { ...item.icon } : undefined,
		tooltip: item.tooltip ? { ...item.tooltip } : undefined,
	};
};
