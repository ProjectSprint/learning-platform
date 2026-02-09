export type { BehaviorReactorDeps, BehaviorReactorResult } from "./reactor";
export { useBehaviorReactor } from "./reactor";
export {
	entityClicked,
	entityEnteredSpace,
	entityMoved,
	modalClosed,
	modalSubmitted,
	phaseChanged,
	terminalInput,
} from "./triggers";
export type {
	BehaviorDefinition,
	BehaviorRule,
	EffectContext,
	EventTrigger,
	GuardContext,
} from "./types";
