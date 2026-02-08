/**
 * QuestionDefinition — declarative config for bootstrap + runtime rules.
 *
 * A question page provides a QuestionDefinition to describe:
 * - what spaces and entities exist
 * - what phase rules / inventory rules / space rules to apply
 *
 * The runtime bootstraps state from this definition and provides
 * high-level commands so pages never dispatch raw actions.
 */

import type { ItemDataConfig } from "../../domain/entity/entity-data";
import type {
	Condition,
	InventoryRule,
	PhaseRule,
	SpaceRule,
} from "../../domain/question/question-ast";
import type {
	GridPosition,
	GridSpaceConfig,
	PoolSpaceConfig,
} from "../../domain/space/space-data";

// Re-export condition types for convenience
export type { Condition, InventoryRule, PhaseRule, SpaceRule };

/**
 * Declarative description of a space to create during bootstrap.
 */
export type SpaceDefinition =
	| { kind: "grid"; config: GridSpaceConfig }
	| { kind: "pool"; config: PoolSpaceConfig };

/**
 * Declarative description of an entity to create during bootstrap.
 */
export type EntityDefinition = {
	/** Item config passed to createItemData */
	config: ItemDataConfig;
	/** Space to place the entity in after creation (optional) */
	initialSpace?: string;
	/** Grid position within the initial space (optional, grid spaces only) */
	initialPosition?: GridPosition;
};

/**
 * Question metadata.
 */
export type QuestionMeta = {
	id: string;
	title: string;
	description: string;
};

/**
 * Full declarative definition for a question.
 *
 * @template CK — string union of condition keys used in phase/inventory/space rules
 */
export type QuestionDefinition<CK extends string = string> = {
	meta: QuestionMeta;
	initialPhase: string;
	spaces: SpaceDefinition[];
	entities: EntityDefinition[];
	phaseRules: PhaseRule<CK>[];
	inventoryRules?: InventoryRule<CK>[];
	spaceRules?: SpaceRule<CK>[];
};
