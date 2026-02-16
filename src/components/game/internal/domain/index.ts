/**
 * Domain layer exports.
 * The domain layer contains the core business logic and domain models:
 * - Space: Containers that organize entities (GridSpace, PoolSpace, QueueSpace, PathSpace)
 * - Entity: Game objects that exist in spaces (Entity, Item)
 */

export * from "./adt";
// Entity exports
export * from "./entity";
export * from "./invariants";
export * from "./read";
export * from "./transformers";
