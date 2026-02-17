import type { BehaviorDefinition } from "./behavior";
import type { ItemDataConfig } from "./entity";
import type {
	CustomSpaceConfig,
	GridPosition,
	GridSpaceConfig,
	MeterSpaceConfig,
	PathSpaceConfig,
	PoolSpaceConfig,
	QueueSpaceConfig,
} from "./space";
import type { GameState } from "./state";

export type Condition<ConditionKey extends string = string> =
	| { kind: "and"; all: Condition<ConditionKey>[] }
	| { kind: "or"; any: Condition<ConditionKey>[] }
	| { kind: "not"; value: Condition<ConditionKey> }
	| { kind: "flag"; key: ConditionKey; is: boolean }
	| {
			kind: "eq";
			key: ConditionKey;
			value: string | number | boolean | null;
	  }
	| { kind: "in"; key: ConditionKey; values: Array<string | number> };

export type ConditionContext<ConditionKey extends string = string> = Record<
	ConditionKey,
	string | number | boolean | null | undefined
>;

export type PhaseRule<ConditionKey extends string = string> =
	| { kind: "set"; when: Condition<ConditionKey>; to: string }
	| { kind: "retain"; when: Condition<ConditionKey> };

export type InventoryRule<ConditionKey extends string = string> =
	| { kind: "show-group"; when: Condition<ConditionKey>; groupId: string }
	| { kind: "hide-group"; when: Condition<ConditionKey>; groupId: string };

export type SpaceRule<ConditionKey extends string = string> =
	| { kind: "show"; when: Condition<ConditionKey>; spaceId: string }
	| { kind: "hide"; when: Condition<ConditionKey>; spaceId: string };

export type PhaseResolution = {
	nextPhase: string;
	shouldRetain: boolean;
};

export type DragGatingContext = {
	readonly entityId: string;
	readonly entityType: string;
	readonly spaceId: string;
	readonly state: GameState;
};

export type DragGatingRule = {
	spaceId: string;
	entityType?: string;
	canDrag: (ctx: DragGatingContext) => boolean;
};

export type LayoutRuleContext = {
	readonly state: GameState;
	readonly phase: string;
};

export type LayoutVisibilityRule = {
	targetId: string;
	visible: (ctx: LayoutRuleContext) => boolean;
};

export type SpaceShapeOverrides = {
	rows?: number;
	cols?: number;
	maxCapacity?: number;
	speedMultiplier?: number;
	title?: string;
};

export type SpaceShapeRule = {
	spaceId: string;
	compute: (ctx: LayoutRuleContext) => SpaceShapeOverrides | undefined;
};

export type SpaceDefinition =
	| { kind: "grid"; config: GridSpaceConfig }
	| { kind: "pool"; config: PoolSpaceConfig }
	| { kind: "path"; config: PathSpaceConfig }
	| { kind: "custom"; config: CustomSpaceConfig }
	| { kind: "queue"; config: QueueSpaceConfig }
	| { kind: "meter"; config: MeterSpaceConfig };

export type EntityDefinition = {
	config: ItemDataConfig;
	initialSpace?: string;
	initialPosition?: GridPosition;
};

export type QuestionMeta = {
	id: string;
	title: string;
	description: string;
};

export type QuestionDefinition<
	ConditionKey extends string = string,
	TContext = Record<string, never>,
> = {
	meta: QuestionMeta;
	initialPhase: string;
	spaces: SpaceDefinition[];
	entities: EntityDefinition[];
	phaseRules: PhaseRule<ConditionKey>[];
	inventoryRules?: InventoryRule<ConditionKey>[];
	spaceRules?: SpaceRule<ConditionKey>[];
	behaviors?: BehaviorDefinition<TContext>;
	dragRules?: DragGatingRule[];
	layoutRules?: LayoutVisibilityRule[];
	shapeRules?: SpaceShapeRule[];
};
