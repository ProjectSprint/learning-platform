/**
 * Runtime module — public API for the declarative question runtime.
 *
 * Question pages import runtime values and types from engine barrels:
 *   import { useQuestionRuntime } from "@/components/game/engine/runtime";
 *   import type { QuestionDefinition } from "@/components/game/types/question";
 */

// Selectors
export {
	getEntitySpaceId as selectEntitySpace,
	selectDerivedPhase,
	selectEntitiesByType,
	selectEntityStateValue,
} from "../domain/read";
export {
	createBehaviorInspector,
	createConsoleInspector,
	createJoinTracker,
	createResourceLock,
	entityClicked,
	evaluateDragGating,
	evaluateShapeRules,
	evaluateVisibility,
	hasFreeLane,
	isHeldBy,
	isJoinComplete,
	isLocked,
	isMidpointTick,
	joinRemaining,
	markChildComplete,
	modalClosed,
	modalSubmitted,
	NOOP_INSPECTOR,
	pathCheckpointData,
	pathResumeData,
	phaseChanged,
	pickLane,
	releaseLock,
	terminalInput,
	tryAcquire,
	waitQueueSize,
	whenEntityArrivedAtSpace,
	whenEntityPlacedInSpace,
	whenEntityTransferredToSpace,
} from "./behavior";
// Bootstrap
export { bootstrapQuestion } from "./bootstrap/bootstrap";
// Commands
export { createCommands } from "./commands/create-commands";
// Context hook
export { useQuestionRuntime } from "./context/use-question-runtime";
// Definition validation
export { validateDefinition } from "./definition/validate";
export {
	createExecutionFlowApi,
	createInteractionSessionApi,
	createProgressApi,
	createWorldApi,
	runtimeError,
	runtimeOk,
	toRuntimeErrorMessage,
	wrapRuntimeErrorMessage,
} from "./wrappers";
