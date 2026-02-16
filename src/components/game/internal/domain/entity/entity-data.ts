import type { _EntityData, _ItemData } from "@/components/game/types/entity";

export const isItemData = (entity: _EntityData): entity is _ItemData => {
	return "allowedPlaces" in entity && "draggable" in entity;
};
