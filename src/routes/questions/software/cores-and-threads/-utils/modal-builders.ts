import type {
	ModalAction,
	ModalContentBlock,
	ModalInstance,
} from "@/components/game/presentation/modal";
import { MODAL_IDS } from "./constants";

const text = (value: string): ModalContentBlock => ({
	kind: "text",
	text: value,
});

const action = (
	id: string,
	label: string,
	variant: ModalAction["variant"] = "primary",
): ModalAction => ({
	id,
	label,
	variant,
	closesModal: true,
	validate: false,
});

export const buildSingleWallModal = (): ModalInstance => ({
	id: MODAL_IDS.wall,
	title: "CPU Wall Hit",
	content: [
		text("Your single core is maxed out and every app waits in line."),
		text("Add a second core to keep more work moving."),
	],
	actions: [action("add-core", "Add Core")],
});

export const buildSchedulerModal = (): ModalInstance => ({
	id: MODAL_IDS.scheduler,
	title: "Second Core Needs a Scheduler",
	content: [
		text("Core 2 exists, but apps still route to Core 1 by default."),
		text("Enable scheduler logic to route whole apps to free cores."),
	],
	actions: [action("enable-scheduler", "Enable Scheduler")],
});

export const buildSingleThreadLimitModal = (): ModalInstance => ({
	id: MODAL_IDS.singleLimit,
	title: "Single Thread Limit",
	content: [
		text("Video Editor is still bottlenecked on one core."),
		text("To go faster, independent subtasks must run on separate cores."),
	],
	actions: [action("continue", "Continue")],
});

export const buildParallelIntroModal = (): ModalInstance => ({
	id: MODAL_IDS.parallelIntro,
	title: "Parallel Mode",
	content: [
		text("You are now the scheduler."),
		text("Assign independent subtasks to different cores."),
	],
	actions: [action("enable-splitting", "Start Parallel Split")],
});

export const buildConflictModal = (): ModalInstance => ({
	id: MODAL_IDS.conflict,
	title: "Race Condition",
	content: [
		text("Both cores touched GPU at the same time and corrupted output."),
		text("Shared resources need synchronization."),
	],
	actions: [action("continue", "Continue")],
});

export const buildLockIntroModal = (): ModalInstance => ({
	id: MODAL_IDS.lockIntro,
	title: "Enable Locks",
	content: [
		text("A lock serializes shared GPU access."),
		text("One task runs, the other waits safely."),
	],
	actions: [action("enable-locks", "Enable Locks")],
});

export const buildCompleteModal = (): ModalInstance => ({
	id: MODAL_IDS.complete,
	title: "Completed: Cores and Threads",
	content: [
		text(
			"You learned sequential execution, scheduling, parallelism, and locking.",
		),
		text(
			"This is the core reason software architecture matters on multi-core CPUs.",
		),
	],
	actions: [action("complete", "Complete")],
});
