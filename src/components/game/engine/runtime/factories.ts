import type {
	EntityData,
	ItemData,
	ItemDataConfig,
} from "@/components/game/types/entity";
import type { Item } from "@/components/game/types/inventory";
import type {
	Condition,
	ConditionValue,
	EntityDefinition,
	PhaseRule,
	SpaceDefinition,
} from "@/components/game/types/question";
import type {
	CustomSpaceConfig,
	GridPosition,
	GridSpaceConfig,
	MeterSpaceConfig,
	PathSpaceConfig,
	PoolSpaceConfig,
	QueueSpaceConfig,
} from "@/components/game/types/space";
import { isGridSpace as internalIsGridSpace } from "@/components/game/types/space";
import { isItemData as internalIsItemData } from "../../internal/domain/entity/entity-data";

// Question-facing guards (business logic narrows domain unions; internals own ADT constructors).
export const isItem = (entity: EntityData): entity is ItemData =>
	internalIsItemData(entity);
export const isGridSpace = internalIsGridSpace;

export const SpaceFactory = {
	grid: <TSpaceId extends string>(
		config: GridSpaceConfig<TSpaceId>,
	): SpaceDefinition<TSpaceId> => ({
		kind: "grid",
		config,
	}),
	pool: <TSpaceId extends string>(
		config: PoolSpaceConfig<TSpaceId>,
	): SpaceDefinition<TSpaceId> => ({
		kind: "pool",
		config,
	}),
	path: <TSpaceId extends string>(
		config: PathSpaceConfig<TSpaceId>,
	): SpaceDefinition<TSpaceId> => ({
		kind: "path",
		config,
	}),
	custom: <TSpaceId extends string>(
		config: CustomSpaceConfig<TSpaceId>,
	): SpaceDefinition<TSpaceId> => ({
		kind: "custom",
		config,
	}),
	queue: <TSpaceId extends string>(
		config: QueueSpaceConfig<TSpaceId>,
	): SpaceDefinition<TSpaceId> => ({
		kind: "queue",
		config,
	}),
	meter: <TSpaceId extends string>(
		config: MeterSpaceConfig<TSpaceId>,
	): SpaceDefinition<TSpaceId> => ({
		kind: "meter",
		config,
	}),
};

type Placement<TSpaceId extends string> = {
	initialSpace?: TSpaceId;
	initialPosition?: GridPosition;
};

const toItemDataConfig = (item: Item): ItemDataConfig => ({
	id: item.id,
	name: item.name,
	icon: item.icon,
	tooltip: item.tooltip,
	allowedPlaces: item.allowedPlaces,
	data: { ...(item.data ?? {}), type: item.type },
	draggable: item.draggable,
	category: item.category,
});

export const EntityFactory = {
	config: <TSpaceId extends string = never>(
		config: ItemDataConfig,
		placement?: Placement<TSpaceId>,
	): EntityDefinition<ItemDataConfig, TSpaceId> => ({
		config,
		initialSpace: placement?.initialSpace,
		initialPosition: placement?.initialPosition,
	}),
	item: <TSpaceId extends string = never>(
		item: Item,
		placement?: Placement<TSpaceId>,
	): EntityDefinition<ItemDataConfig, TSpaceId> =>
		EntityFactory.config(toItemDataConfig(item), placement),
	itemInSpace: <TSpaceId extends string>(
		item: Item,
		initialSpace: TSpaceId,
		initialPosition?: GridPosition,
	): EntityDefinition<ItemDataConfig, TSpaceId> =>
		EntityFactory.item(item, { initialSpace, initialPosition }),
};

export const ConditionFactory = {
	eq: <ConditionKey extends string, TValue extends ConditionValue>(
		key: ConditionKey,
		value: TValue,
	): Condition<ConditionKey, TValue> => ({
		kind: "eq",
		key,
		value,
	}),
	flag: <ConditionKey extends string>(
		key: ConditionKey,
		is: boolean,
	): Condition<ConditionKey> => ({
		kind: "flag",
		key,
		is,
	}),
	not: <ConditionKey extends string, TValue extends ConditionValue>(
		value: Condition<ConditionKey, TValue>,
	): Condition<ConditionKey, TValue> => ({
		kind: "not",
		value,
	}),
	and: <ConditionKey extends string, TValue extends ConditionValue>(
		...all: Condition<ConditionKey, TValue>[]
	): Condition<ConditionKey, TValue> => ({
		kind: "and",
		all,
	}),
	or: <ConditionKey extends string, TValue extends ConditionValue>(
		...any: Condition<ConditionKey, TValue>[]
	): Condition<ConditionKey, TValue> => ({
		kind: "or",
		any,
	}),
};

export const PhaseRuleFactory = {
	set: <
		ConditionKey extends string,
		TPhase extends string,
		TValue extends ConditionValue,
	>(
		when: Condition<ConditionKey, TValue>,
		to: TPhase,
	): PhaseRule<ConditionKey, TPhase, TValue> => ({
		kind: "set",
		when,
		to,
	}),
	retain: <
		ConditionKey extends string,
		TPhase extends string,
		TValue extends ConditionValue,
	>(
		when: Condition<ConditionKey, TValue>,
	): PhaseRule<ConditionKey, TPhase, TValue> => ({
		kind: "retain",
		when,
	}),
};
