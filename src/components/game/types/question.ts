import type { BehaviorDefinition, EventTrigger } from "./behavior";
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

export type ConditionValue = string | number | boolean | null;

export type Condition<
	ConditionKey extends string = string,
	TValue extends ConditionValue = ConditionValue,
> =
	| { kind: "and"; all: Condition<ConditionKey, TValue>[] }
	| { kind: "or"; any: Condition<ConditionKey, TValue>[] }
	| { kind: "not"; value: Condition<ConditionKey, TValue> }
	| { kind: "flag"; key: ConditionKey; is: boolean }
	| {
			kind: "eq";
			key: ConditionKey;
			value: TValue;
	  }
	| {
			kind: "in";
			key: ConditionKey;
			values: Array<Extract<TValue, string | number>>;
	  };

export type ConditionContext<
	ConditionKey extends string = string,
	TValue extends ConditionValue = ConditionValue,
> = Record<ConditionKey, TValue | undefined>;

export type PhaseRule<
	ConditionKey extends string = string,
	TPhase extends string = string,
	TValue extends ConditionValue = ConditionValue,
> =
	| { kind: "set"; when: Condition<ConditionKey, TValue>; to: TPhase }
	| { kind: "retain"; when: Condition<ConditionKey, TValue> };

export type InventoryRule<
	ConditionKey extends string = string,
	TGroupId extends string = string,
	TValue extends ConditionValue = ConditionValue,
> =
	| {
			kind: "show-group";
			when: Condition<ConditionKey, TValue>;
			groupId: TGroupId;
	  }
	| {
			kind: "hide-group";
			when: Condition<ConditionKey, TValue>;
			groupId: TGroupId;
	  };

export type SpaceRule<
	ConditionKey extends string = string,
	TSpaceId extends string = string,
	TValue extends ConditionValue = ConditionValue,
> =
	| {
			kind: "show";
			when: Condition<ConditionKey, TValue>;
			spaceId: TSpaceId;
	  }
	| {
			kind: "hide";
			when: Condition<ConditionKey, TValue>;
			spaceId: TSpaceId;
	  };

export type PhaseResolution<TPhase extends string = string> = {
	nextPhase: TPhase;
	shouldRetain: boolean;
};

export type DragGatingContext = {
	readonly entityId: string;
	readonly entityType: string;
	readonly spaceId: string;
	readonly state: GameState;
};

export type DragGatingRule<
	TSpaceId extends string = string,
	TEntityType extends string = string,
> = {
	spaceId: TSpaceId;
	entityType?: TEntityType;
	canDrag: (ctx: DragGatingContext) => boolean;
};

export type LayoutRuleContext = {
	readonly state: GameState;
	readonly phase: string;
};

export type LayoutVisibilityRule<TSpaceId extends string = string> = {
	targetId: TSpaceId;
	visible: (ctx: LayoutRuleContext) => boolean;
};

export type SpaceShapeOverrides = {
	rows?: number;
	cols?: number;
	maxCapacity?: number;
	speedMultiplier?: number;
	title?: string;
};

export type SpaceShapeRule<TSpaceId extends string = string> = {
	spaceId: TSpaceId;
	compute: (ctx: LayoutRuleContext) => SpaceShapeOverrides | undefined;
};

export type SpaceDefinition<TSpaceId extends string = string> =
	| { kind: "grid"; config: GridSpaceConfig<TSpaceId> }
	| { kind: "pool"; config: PoolSpaceConfig<TSpaceId> }
	| { kind: "path"; config: PathSpaceConfig<TSpaceId> }
	| { kind: "custom"; config: CustomSpaceConfig<TSpaceId> }
	| { kind: "queue"; config: QueueSpaceConfig<TSpaceId> }
	| { kind: "meter"; config: MeterSpaceConfig<TSpaceId> };

export type EntityDefinition<
	TConfig extends ItemDataConfig = ItemDataConfig,
	TSpaceId extends string = string,
> = {
	config: TConfig;
	initialSpace?: TSpaceId;
	initialPosition?: GridPosition;
};

export type QuestionMeta<TQuestionId extends string = string> = {
	id: TQuestionId;
	title: string;
	description: string;
};

export type QuestionDefinition<
	ConditionKey extends string = string,
	TContext = unknown,
	TPhase extends string = string,
	TSpaceId extends string = string,
	TEntityType extends string = string,
	TQuestionId extends string = string,
	TConditionValue extends ConditionValue = ConditionValue,
> = {
	meta: QuestionMeta<TQuestionId>;
	initialPhase: TPhase;
	spaces: SpaceDefinition<TSpaceId>[];
	entities: EntityDefinition<ItemDataConfig, TSpaceId>[];
	phaseRules: PhaseRule<ConditionKey, TPhase, TConditionValue>[];
	inventoryRules?: InventoryRule<ConditionKey, string, TConditionValue>[];
	spaceRules?: SpaceRule<ConditionKey, TSpaceId, TConditionValue>[];
	behaviors?: BehaviorDefinition<
		TContext,
		EventTrigger<TSpaceId, TEntityType, string, string, TPhase>
	>;
	dragRules?: DragGatingRule<TSpaceId, TEntityType>[];
	layoutRules?: LayoutVisibilityRule<TSpaceId>[];
	shapeRules?: SpaceShapeRule<TSpaceId>[];
};

export type QuestionTypeSpec = {
	conditionKey: string;
	context: unknown;
	phase: string;
	spaceId: string;
	entityType: string;
	questionId: string;
	conditionValue: ConditionValue;
};

export type QuestionDefinitionFor<TSpec extends QuestionTypeSpec> =
	QuestionDefinition<
		TSpec["conditionKey"],
		TSpec["context"],
		TSpec["phase"],
		TSpec["spaceId"],
		TSpec["entityType"],
		TSpec["questionId"],
		TSpec["conditionValue"]
	>;
