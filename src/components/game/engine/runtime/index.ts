/**
 * Engine runtime public contract.
 *
 * Important boundary:
 * - `engine/*` exports game/business APIs.
 * - `internal/*` stays as implementation primitives/interactors.
 */

export * from "./factories";
export * from "./public-methods";
export * from "./runtime-lifecycle";
export * from "./types";
