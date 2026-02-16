/**
 * Engine runtime public contract.
 *
 * Important boundary:
 * - `engine/*` exports game/business APIs.
 * - `internal/*` stays as implementation primitives/interactors.
 */

export { isGridSpace, isItem } from "./factories";
export {
	buildEntityArrivedTrigger,
	buildEntityClickTrigger,
	buildEntityPlacedTrigger,
	buildModalSubmitTrigger,
	buildTerminalInputTrigger,
	chooseLaneForExecution,
	deriveQuestionPhase,
	entityIsInSpace,
	findEntitySpace,
	listSpaceEntityIds,
} from "./public-methods";
export { bootstrapQuestion, useQuestionRuntime } from "./runtime-lifecycle";
