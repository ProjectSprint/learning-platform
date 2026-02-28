/**
 * Engine runtime public contract.
 *
 * Important boundary:
 * - `engine/*` exports game/business APIs.
 * - `internal/*` stays as implementation primitives/interactors.
 *
 * CQRS naming convention:
 * - `snapshot` — stale Redux state (point-in-time read)
 * - `store` — live in-memory behavior state
 * - `cmd` — fire-and-forget command bus
 */

export type {
	EffectContext,
	GuardContext,
	GuardCtx,
	HandlerCtx,
	ScheduledCtx,
	ScheduledEffectContext,
} from "../../types/behavior";
// Types re-exported for consumers who need them as local type aliases or
// inline annotations (e.g. `type Ctx = HandlerCtx<MyCtx>`).
export type {
	ConditionContext,
	QuestionTypeSpec,
} from "../../types/question";
export type { CommandApi } from "../../types/runtime";
// Constructor functions — drive TypeScript inference so consumers never need
// to import the *For type aliases separately.
export {
	BehaviorDefinition,
	BehaviorRule,
	QuestionDefinition,
} from "./constructors";
export {
	ConditionFactory,
	EntityFactory,
	isGridSpace,
	isItem,
	PhaseRuleFactory,
	SpaceFactory,
} from "./factories";
export type {
	AnyModalContract,
	AnyTerminalContract,
	ContractRegistry,
	EntityContractMap,
	EntityContractSchema,
	EntityData,
	EntityKey,
	EntityPayloadWriter,
	EntityReader,
	EntityState,
	InferModal,
	InferTerminal,
	ModalContract,
	ModalKey,
	ModalPayload,
	ModalSubmissionContract,
	ModalSubmissionParseResult,
	RegistryEntityPayloadWriter,
	TerminalContract,
	TerminalInputContract,
	TerminalKey,
	TerminalPayload,
	TypedEntity,
} from "./public-methods";
export {
	buildEntityArrivedTrigger,
	buildEntityClickTrigger,
	buildEntityPlacedTrigger,
	buildModalSubmitTrigger,
	buildTerminalInputTrigger,
	// New names
	chooseLaneForExecution,
	createEntityPayloadWriter,
	createEntityReader,
	deriveQuestionPhase,
	entityIsInSpace,
	findEntitySpace,
	getEntitiesByType,
	getEntityStateValue,
	getGridEmptyPositions,
	isEntityInSpace_public as isEntityInSpace,
	isModalOpen,
	isSpaceEmpty,
	isSpaceFull,
	listSpaceEntityIds,
	lookupEntity,
	lookupSpace,
	parseModalSubmission,
	parseTerminalInput,
	pickLane_public as pickLane,
	resolveQuestionPhase,
	// Old names (deprecated aliases kept for backward compat)
	selectEntitiesByType,
	selectEntityStateValue,
	selectGridEmptyPositions,
	selectSpaceIsEmpty,
	selectSpaceIsFull,
} from "./public-methods";
export { bootstrapQuestion, useQuestionRuntime } from "./runtime-lifecycle";
