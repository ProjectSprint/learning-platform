import type { _BehaviorDefinition } from "./behavior";
import type { _ItemDataConfig } from "./entity";
import type {
	_CustomSpaceConfig,
	_GridPosition,
	_GridSpaceConfig,
	_MeterSpaceConfig,
	_PathSpaceConfig,
	_PoolSpaceConfig,
	_QueueSpaceConfig,
} from "./space";
import type { GameState } from "./state";

export type _Condition<ConditionKey extends string = string> =
	| { kind: "and"; all: _Condition<ConditionKey>[] }
	| { kind: "or"; any: _Condition<ConditionKey>[] }
	| { kind: "not"; value: _Condition<ConditionKey> }
	| { kind: "flag"; key: ConditionKey; is: boolean }
	| {
			kind: "eq";
			key: ConditionKey;
			value: string | number | boolean | null;
	  }
	| { kind: "in"; key: ConditionKey; values: Array<string | number> };

export type _ConditionContext<ConditionKey extends string = string> = Record<
	ConditionKey,
	string | number | boolean | null | undefined
>;

export type _PhaseRule<ConditionKey extends string = string> =
	| { kind: "set"; when: _Condition<ConditionKey>; to: string }
	| { kind: "retain"; when: _Condition<ConditionKey> };

export type _InventoryRule<ConditionKey extends string = string> =
	| { kind: "show-group"; when: _Condition<ConditionKey>; groupId: string }
	| { kind: "hide-group"; when: _Condition<ConditionKey>; groupId: string };

export type _SpaceRule<ConditionKey extends string = string> =
	| { kind: "show"; when: _Condition<ConditionKey>; spaceId: string }
	| { kind: "hide"; when: _Condition<ConditionKey>; spaceId: string };

export type _PhaseResolution = {
	nextPhase: string;
	shouldRetain: boolean;
};

export type _DragGatingContext = {
	readonly entityId: string;
	readonly entityType: string;
	readonly spaceId: string;
	readonly state: GameState;
};

export type _DragGatingRule = {
	spaceId: string;
	entityType?: string;
	canDrag: (ctx: _DragGatingContext) => boolean;
};

export type _LayoutRuleContext = {
	readonly state: GameState;
	readonly phase: string;
};

export type _LayoutVisibilityRule = {
	targetId: string;
	visible: (ctx: _LayoutRuleContext) => boolean;
};

export type _SpaceShapeOverrides = {
	rows?: number;
	cols?: number;
	maxCapacity?: number;
	speedMultiplier?: number;
	title?: string;
};

export type _SpaceShapeRule = {
	spaceId: string;
	compute: (ctx: _LayoutRuleContext) => _SpaceShapeOverrides | undefined;
};

export type _SpaceDefinition =
	| { kind: "grid"; config: _GridSpaceConfig }
	| { kind: "pool"; config: _PoolSpaceConfig }
	| { kind: "path"; config: _PathSpaceConfig }
	| { kind: "custom"; config: _CustomSpaceConfig }
	| { kind: "queue"; config: _QueueSpaceConfig }
	| { kind: "meter"; config: _MeterSpaceConfig };

export type _EntityDefinition = {
	config: _ItemDataConfig;
	initialSpace?: string;
	initialPosition?: _GridPosition;
};

export type _QuestionMeta = {
	id: string;
	title: string;
	description: string;
};

export type _QuestionDefinition<
	ConditionKey extends string = string,
	TContext = Record<string, never>,
> = {
	meta: _QuestionMeta;
	initialPhase: string;
	spaces: _SpaceDefinition[];
	entities: _EntityDefinition[];
	phaseRules: _PhaseRule<ConditionKey>[];
	inventoryRules?: _InventoryRule<ConditionKey>[];
	spaceRules?: _SpaceRule<ConditionKey>[];
	behaviors?: _BehaviorDefinition<TContext>;
	dragRules?: _DragGatingRule[];
	layoutRules?: _LayoutVisibilityRule[];
	shapeRules?: _SpaceShapeRule[];
};

export type Condition<ConditionKey extends string = string> =
	_Condition<ConditionKey>;
export type ConditionContext<ConditionKey extends string = string> =
	_ConditionContext<ConditionKey>;
export type PhaseRule<ConditionKey extends string = string> =
	_PhaseRule<ConditionKey>;
export type InventoryRule<ConditionKey extends string = string> =
	_InventoryRule<ConditionKey>;
export type SpaceRule<ConditionKey extends string = string> =
	_SpaceRule<ConditionKey>;
export type PhaseResolution = _PhaseResolution;
export type DragGatingContext = _DragGatingContext;
export type DragGatingRule = _DragGatingRule;
export type LayoutRuleContext = _LayoutRuleContext;
export type LayoutVisibilityRule = _LayoutVisibilityRule;
export type SpaceShapeOverrides = _SpaceShapeOverrides;
export type SpaceShapeRule = _SpaceShapeRule;
export type SpaceDefinition = _SpaceDefinition;
export type EntityDefinition = _EntityDefinition;
export type QuestionMeta = _QuestionMeta;
export type QuestionDefinition<
	ConditionKey extends string = string,
	TContext = Record<string, never>,
> = _QuestionDefinition<ConditionKey, TContext>;
