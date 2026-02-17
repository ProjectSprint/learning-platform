import type { EntityData, ItemData } from "@/components/game/types/entity";

export const isItemData = (entity: EntityData): entity is ItemData => {
	return "allowedPlaces" in entity && "draggable" in entity;
};
