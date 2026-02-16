export class QuestionScheduler {
	private timers = new Map<string, ReturnType<typeof setTimeout>>();

	schedule(key: string, ms: number, fn: () => void): void {
		this.cancel(key);
		const timerId = setTimeout(() => {
			this.timers.delete(key);
			fn();
		}, ms);
		this.timers.set(key, timerId);
	}

	cancel(key: string): void {
		const existing = this.timers.get(key);
		if (existing !== undefined) {
			clearTimeout(existing);
			this.timers.delete(key);
		}
	}

	dispose(): void {
		for (const timer of this.timers.values()) {
			clearTimeout(timer);
		}
		this.timers.clear();
	}
}
