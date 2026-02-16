import { describe, expect, it } from "vitest";
import type { LockRequest } from "../behavior/resource-lock";
import {
	createResourceLock,
	isHeldBy,
	isLocked,
	releaseLock,
	tryAcquire,
	waitQueueSize,
} from "../behavior/resource-lock";

describe("resource-lock", () => {
	const resourceId = "db-connection";

	const exclusiveRequest = (requesterId: string): LockRequest => ({
		resourceId,
		requesterId,
		mode: "exclusive",
	});

	const sharedRequest = (requesterId: string): LockRequest => ({
		resourceId,
		requesterId,
		mode: "shared",
	});

	describe("createResourceLock", () => {
		it("initializes an empty lock", () => {
			const lock = createResourceLock(resourceId);
			expect(lock.resourceId).toBe(resourceId);
			expect(lock.holders).toEqual([]);
			expect(lock.mode).toBeNull();
			expect(lock.waitQueue).toEqual([]);
		});
	});

	describe("tryAcquire", () => {
		it("exclusive on free lock succeeds", () => {
			const lock = createResourceLock(resourceId);
			const result = tryAcquire(lock, exclusiveRequest("thread-1"));
			expect(result.acquired).toBe(true);
			expect(result.lock.holders).toEqual(["thread-1"]);
			expect(result.lock.mode).toBe("exclusive");
		});

		it("exclusive on held lock adds to wait queue", () => {
			const lock = createResourceLock(resourceId);
			const { lock: held } = tryAcquire(lock, exclusiveRequest("thread-1"));
			const result = tryAcquire(held, exclusiveRequest("thread-2"));
			expect(result.acquired).toBe(false);
			expect(result.lock.holders).toEqual(["thread-1"]);
			expect(result.lock.waitQueue).toHaveLength(1);
			expect(result.lock.waitQueue[0].requesterId).toBe("thread-2");
		});

		it("shared on free lock succeeds", () => {
			const lock = createResourceLock(resourceId);
			const result = tryAcquire(lock, sharedRequest("reader-1"));
			expect(result.acquired).toBe(true);
			expect(result.lock.holders).toEqual(["reader-1"]);
			expect(result.lock.mode).toBe("shared");
		});

		it("shared on shared lock allows multiple holders", () => {
			const lock = createResourceLock(resourceId);
			const { lock: first } = tryAcquire(lock, sharedRequest("reader-1"));
			const result = tryAcquire(first, sharedRequest("reader-2"));
			expect(result.acquired).toBe(true);
			expect(result.lock.holders).toEqual(["reader-1", "reader-2"]);
			expect(result.lock.mode).toBe("shared");
		});

		it("exclusive on shared lock adds to wait queue", () => {
			const lock = createResourceLock(resourceId);
			const { lock: shared } = tryAcquire(lock, sharedRequest("reader-1"));
			const result = tryAcquire(shared, exclusiveRequest("writer-1"));
			expect(result.acquired).toBe(false);
			expect(result.lock.holders).toEqual(["reader-1"]);
			expect(result.lock.waitQueue).toHaveLength(1);
			expect(result.lock.waitQueue[0].requesterId).toBe("writer-1");
		});

		it("is idempotent for same requester already holding", () => {
			const lock = createResourceLock(resourceId);
			const { lock: held } = tryAcquire(lock, exclusiveRequest("thread-1"));
			const result = tryAcquire(held, exclusiveRequest("thread-1"));
			expect(result.acquired).toBe(true);
			expect(result.lock).toBe(held);
		});

		it("does not duplicate waiters", () => {
			const lock = createResourceLock(resourceId);
			const { lock: held } = tryAcquire(lock, exclusiveRequest("thread-1"));
			const { lock: waiting } = tryAcquire(held, exclusiveRequest("thread-2"));
			const result = tryAcquire(waiting, exclusiveRequest("thread-2"));
			expect(result.acquired).toBe(false);
			expect(result.lock.waitQueue).toHaveLength(1);
			expect(result.lock).toBe(waiting);
		});
	});

	describe("releaseLock", () => {
		it("frees the lock when last holder releases", () => {
			const lock = createResourceLock(resourceId);
			const { lock: held } = tryAcquire(lock, exclusiveRequest("thread-1"));
			const result = releaseLock(held, "thread-1");
			expect(result.lock.holders).toEqual([]);
			expect(result.lock.mode).toBeNull();
			expect(result.promoted).toBeNull();
		});

		it("promotes next waiter when holder releases", () => {
			const lock = createResourceLock(resourceId);
			const { lock: held } = tryAcquire(lock, exclusiveRequest("thread-1"));
			const { lock: withWaiter } = tryAcquire(
				held,
				exclusiveRequest("thread-2"),
			);
			const result = releaseLock(withWaiter, "thread-1");
			expect(result.lock.holders).toEqual(["thread-2"]);
			expect(result.lock.mode).toBe("exclusive");
			expect(result.lock.waitQueue).toEqual([]);
			expect(result.promoted).toBe("thread-2");
		});

		it("is no-op for non-holder", () => {
			const lock = createResourceLock(resourceId);
			const { lock: held } = tryAcquire(lock, exclusiveRequest("thread-1"));
			const result = releaseLock(held, "thread-99");
			expect(result.lock).toBe(held);
			expect(result.promoted).toBeNull();
		});

		it("removes one holder when multiple shared holders exist", () => {
			const lock = createResourceLock(resourceId);
			const { lock: first } = tryAcquire(lock, sharedRequest("reader-1"));
			const { lock: second } = tryAcquire(first, sharedRequest("reader-2"));
			const result = releaseLock(second, "reader-1");
			expect(result.lock.holders).toEqual(["reader-2"]);
			expect(result.lock.mode).toBe("shared");
			expect(result.promoted).toBeNull();
		});
	});

	describe("helpers", () => {
		it("isLocked returns true when held", () => {
			const lock = createResourceLock(resourceId);
			expect(isLocked(lock)).toBe(false);
			const { lock: held } = tryAcquire(lock, exclusiveRequest("thread-1"));
			expect(isLocked(held)).toBe(true);
		});

		it("isHeldBy checks specific requester", () => {
			const lock = createResourceLock(resourceId);
			const { lock: held } = tryAcquire(lock, exclusiveRequest("thread-1"));
			expect(isHeldBy(held, "thread-1")).toBe(true);
			expect(isHeldBy(held, "thread-2")).toBe(false);
		});

		it("waitQueueSize returns queue length", () => {
			const lock = createResourceLock(resourceId);
			expect(waitQueueSize(lock)).toBe(0);
			const { lock: held } = tryAcquire(lock, exclusiveRequest("thread-1"));
			const { lock: withWaiter } = tryAcquire(
				held,
				exclusiveRequest("thread-2"),
			);
			expect(waitQueueSize(withWaiter)).toBe(1);
		});
	});

	describe("immutability", () => {
		it("tryAcquire returns a new lock object", () => {
			const lock = createResourceLock(resourceId);
			const result = tryAcquire(lock, exclusiveRequest("thread-1"));
			expect(result.lock).not.toBe(lock);
			expect(lock.holders).toEqual([]);
		});

		it("releaseLock returns a new lock object", () => {
			const lock = createResourceLock(resourceId);
			const { lock: held } = tryAcquire(lock, exclusiveRequest("thread-1"));
			const result = releaseLock(held, "thread-1");
			expect(result.lock).not.toBe(held);
			expect(held.holders).toEqual(["thread-1"]);
		});
	});
});
