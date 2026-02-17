/**
 * Engine runtime public contract.
 *
 * Important boundary:
 * - `engine/*` exports game/business APIs.
 * - `internal/*` stays as implementation primitives/interactors.
 */

export { isGridSpace, isItem } from "./factories";
export type {
	AnyModalContract,
	AnyTerminalContract,
	ContractRegistry,
	EntityContractMap,
	EntityContractSchema,
	EntityData,
	EntityKey,
	EntityPayloadWriter,
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
} from "./public-methods";
export {
	buildEntityArrivedTrigger,
	buildEntityClickTrigger,
	buildEntityPlacedTrigger,
	buildModalSubmitTrigger,
	buildTerminalInputTrigger,
	chooseLaneForExecution,
	createEntityPayloadWriter,
	deriveQuestionPhase,
	entityIsInSpace,
	findEntitySpace,
	listSpaceEntityIds,
	parseModalSubmission,
	parseTerminalInput,
} from "./public-methods";
export { bootstrapQuestion, useQuestionRuntime } from "./runtime-lifecycle";
