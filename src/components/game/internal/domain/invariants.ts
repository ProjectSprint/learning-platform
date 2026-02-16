import type { GameReadState } from "./read";
import { getSpaceEntityIds } from "./read";

export type OwnershipViolation = {
	entityId: string;
	firstSpaceId: string;
	duplicateSpaceId: string;
};

export const assertNever = (value: never, context: string): never => {
	throw new Error(`[invariant] unreachable ${context}: ${String(value)}`);
};

export const findOwnershipViolations = (
	state: GameReadState,
): OwnershipViolation[] => {
	const ownerByEntityId = new Map<string, string>();
	const violations: OwnershipViolation[] = [];

	for (const spaceId of Object.keys(state.spaces)) {
		for (const entityId of getSpaceEntityIds(state, spaceId)) {
			const knownOwner = ownerByEntityId.get(entityId);
			if (knownOwner && knownOwner !== spaceId) {
				violations.push({
					entityId,
					firstSpaceId: knownOwner,
					duplicateSpaceId: spaceId,
				});
				continue;
			}
			ownerByEntityId.set(entityId, spaceId);
		}
	}

	return violations;
};

export const assertSingleSpaceOwnership = (state: GameReadState): void => {
	const violations = findOwnershipViolations(state);
	if (violations.length === 0) {
		return;
	}

	const details = violations
		.map(
			(violation) =>
				`entity "${violation.entityId}" appears in both "${violation.firstSpaceId}" and "${violation.duplicateSpaceId}"`,
		)
		.join("; ");
	throw new Error(`[invariant] single-space ownership violated: ${details}`);
};
