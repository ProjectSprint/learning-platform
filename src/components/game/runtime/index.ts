/**
 * Runtime module — public API for the declarative question runtime.
 *
 * Question pages import from this barrel to get everything they need:
 *   import { useQuestionRuntime, type QuestionDefinition } from "@/components/game/runtime";
 */

// Bootstrap
export { bootstrapQuestion } from "./bootstrap/bootstrap";
export type { CommandContext } from "./commands/create-commands";
// Commands
export { createCommands } from "./commands/create-commands";
export type { Commands } from "./commands/types";
export type { QuestionRuntime } from "./context/use-question-runtime";
// Context hook
export { useQuestionRuntime } from "./context/use-question-runtime";
// Definition types
export type {
	Condition,
	EntityDefinition,
	InventoryRule,
	PhaseRule,
	QuestionDefinition,
	QuestionMeta,
	SpaceDefinition,
	SpaceRule,
} from "./definition/types";
export type { ValidationError } from "./definition/validate";
// Definition validation
export { validateDefinition } from "./definition/validate";

// Selectors
export {
	selectEntitiesByType,
	selectEntitySpace,
	selectEntityStateValue,
} from "./selectors/entity-selectors";
export { selectDerivedPhase } from "./selectors/phase-selectors";
