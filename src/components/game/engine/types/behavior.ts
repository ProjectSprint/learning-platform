import type {
	BehaviorDefinition as __BehaviorDefinition,
	BehaviorRule as __BehaviorRule,
	EffectContext as __EffectContext,
	EventTrigger as __EventTrigger,
	LaneSchedulerInput as __LaneSchedulerInput,
	LaneSelectionResult as __LaneSelectionResult,
} from "../../internal/runtime/behavior";

type _BehaviorDefinition<TContext = Record<string, never>> =
	__BehaviorDefinition<TContext>;
type _BehaviorRule<TContext = Record<string, never>> = __BehaviorRule<TContext>;
type _EffectContext<TContext = Record<string, never>> =
	__EffectContext<TContext>;
type _EventTrigger = __EventTrigger;
type _LaneSchedulerInput<TLaneId extends string = string> =
	__LaneSchedulerInput<TLaneId>;
type _LaneSelectionResult<TLaneId extends string = string> =
	__LaneSelectionResult<TLaneId>;

export type BehaviorDefinition<TContext = Record<string, never>> =
	_BehaviorDefinition<TContext>;
export type BehaviorRule<TContext = Record<string, never>> =
	_BehaviorRule<TContext>;
export type EffectContext<TContext = Record<string, never>> =
	_EffectContext<TContext>;
export type EventTrigger = _EventTrigger;
export type LaneSchedulerInput<TLaneId extends string = string> =
	_LaneSchedulerInput<TLaneId>;
export type LaneSelectionResult<TLaneId extends string = string> =
	_LaneSelectionResult<TLaneId>;
