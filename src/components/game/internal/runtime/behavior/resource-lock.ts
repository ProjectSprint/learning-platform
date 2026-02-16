/**
 * Declarative lock/resource contention primitives.
 * Manages exclusive and shared access to named resources.
 */

/**
 * Lock mode for a resource.
 * - "exclusive": only one holder at a time
 * - "shared": multiple readers, exclusive writer (read-write lock)
 */
export type LockMode = "exclusive" | "shared";

/**
 * A lock request from an entity/task.
 */
export type LockRequest = {
	resourceId: string;
	requesterId: string;
	mode: LockMode;
};

/**
 * State of a single resource lock.
 */
export type ResourceLockState = {
	resourceId: string;
	holders: string[];
	mode: LockMode | null;
	waitQueue: LockRequest[];
};

/**
 * Create initial lock state for a resource.
 */
export function createResourceLock(resourceId: string): ResourceLockState {
	return {
		resourceId,
		holders: [],
		mode: null,
		waitQueue: [],
	};
}

/**
 * Try to acquire a lock. Returns updated state.
 * If lock is available, requester becomes holder.
 * If not, requester is added to wait queue.
 */
export function tryAcquire(
	lock: ResourceLockState,
	request: LockRequest,
): { lock: ResourceLockState; acquired: boolean } {
	// Already holding
	if (lock.holders.includes(request.requesterId)) {
		return { lock, acquired: true };
	}

	// Lock is free
	if (lock.holders.length === 0) {
		return {
			lock: {
				...lock,
				holders: [request.requesterId],
				mode: request.mode,
			},
			acquired: true,
		};
	}

	// Shared mode: allow multiple shared holders
	if (lock.mode === "shared" && request.mode === "shared") {
		return {
			lock: {
				...lock,
				holders: [...lock.holders, request.requesterId],
			},
			acquired: true,
		};
	}

	// Contention: add to wait queue
	const alreadyWaiting = lock.waitQueue.some(
		(r) => r.requesterId === request.requesterId,
	);
	if (alreadyWaiting) {
		return { lock, acquired: false };
	}

	return {
		lock: {
			...lock,
			waitQueue: [...lock.waitQueue, request],
		},
		acquired: false,
	};
}

/**
 * Release a lock held by a requester.
 * If there are waiters, the next waiter is promoted.
 */
export function releaseLock(
	lock: ResourceLockState,
	requesterId: string,
): { lock: ResourceLockState; promoted: string | null } {
	if (!lock.holders.includes(requesterId)) {
		return { lock, promoted: null };
	}

	const remainingHolders = lock.holders.filter((h) => h !== requesterId);

	// If there are still holders, just remove this one
	if (remainingHolders.length > 0) {
		return {
			lock: { ...lock, holders: remainingHolders },
			promoted: null,
		};
	}

	// Lock is now free — promote next waiter if any
	if (lock.waitQueue.length === 0) {
		return {
			lock: { ...lock, holders: [], mode: null, waitQueue: [] },
			promoted: null,
		};
	}

	const [nextRequest, ...restQueue] = lock.waitQueue;
	return {
		lock: {
			...lock,
			holders: [nextRequest.requesterId],
			mode: nextRequest.mode,
			waitQueue: restQueue,
		},
		promoted: nextRequest.requesterId,
	};
}

/**
 * Check if a resource is currently locked.
 */
export function isLocked(lock: ResourceLockState): boolean {
	return lock.holders.length > 0;
}

/**
 * Check if a specific requester holds the lock.
 */
export function isHeldBy(
	lock: ResourceLockState,
	requesterId: string,
): boolean {
	return lock.holders.includes(requesterId);
}

/**
 * Get the number of waiters in the queue.
 */
export function waitQueueSize(lock: ResourceLockState): number {
	return lock.waitQueue.length;
}
