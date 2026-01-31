/**
 * Domain layer exports.
 * The domain layer contains the core business logic and domain models:
 * - Space: Containers that organize entities (GridSpace, PoolSpace, QueueSpace, PathSpace)
 * - Entity: Game objects that exist in spaces (Entity, Item)
 * - Behavior: Actions that entities can perform
 */

// Behavior exports
export * from "./behavior";

// Entity exports
export * from "./entity";
// Space exports
export * from "./space";
