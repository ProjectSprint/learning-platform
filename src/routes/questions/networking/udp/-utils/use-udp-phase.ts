import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { findEntitySpace } from "@/components/game/domain/space/validation";
import type { SpaceItemLocation } from "@/components/game/game-provider";
import {
	useAllSpaces,
	useEngineEvents,
	useGameState,
} from "@/components/game/game-provider";
import type {
	InteractionSessionApi,
	ProgressApi,
	WorldApi,
} from "@/components/game/runtime";

import { FRAME_ITEMS, UDP_CLIENT_IDS } from "./constants";
import { getFrameDestiny, TOTAL_FRAMES } from "./frame-destiny";
import { buildUdpSuccessModal } from "./modal-builders";
import type { UdpPhase } from "./types";

const FRAME_SEND_MS = 1500;
const NOTICE_MS = 2000;

export type UdpNotice = { message: string; tone: "error" | "info" } | null;

export const useUdpPhase = ({
	active,
	world,
	interactionSession,
	progress,
	onQuestionComplete,
}: {
	active: boolean;
	world: WorldApi;
	interactionSession: InteractionSessionApi;
	progress: ProgressApi;
	onQuestionComplete: () => void;
}) => {
	const state = useGameState();
	const spaces = useAllSpaces();

	const [phase, setPhase] = useState<UdpPhase>("intro");
	const [lastSentFrame, setLastSentFrame] = useState(0);
	const [notice, setNotice] = useState<UdpNotice>(null);
	const [clientFrames, setClientFrames] = useState(() => ({
		a: Array.from({ length: TOTAL_FRAMES }, () => false),
		b: Array.from({ length: TOTAL_FRAMES }, () => false),
		c: Array.from({ length: TOTAL_FRAMES }, () => false),
	}));
	const { events, ack } = useEngineEvents("udp-phase");

	useEffect(() => {
		if (events.length === 0) {
			return;
		}

		for (const event of events) {
			if (
				event.type === "MODAL_SUBMITTED" &&
				event.modalId === "udp-success" &&
				event.modalActionId === "complete"
			) {
				onQuestionComplete();
			}
		}

		ack();
	}, [ack, events, onQuestionComplete]);

	const spacesRef = useRef(spaces);
	const activeRef = useRef(active);
	const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
	const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastSentFrameRef = useRef(lastSentFrame);
	const successShownRef = useRef(false);

	useEffect(() => {
		spacesRef.current = spaces;
	}, [spaces]);

	useEffect(() => {
		activeRef.current = active;
		if (!active) {
			for (const timer of timersRef.current) {
				clearTimeout(timer);
			}
			timersRef.current.clear();
		}
	}, [active]);

	useEffect(() => {
		return () => {
			for (const timer of timersRef.current) {
				clearTimeout(timer);
			}
			if (noticeTimerRef.current) {
				clearTimeout(noticeTimerRef.current);
			}
		};
	}, []);

	const registerTimer = useCallback(
		(timerId: ReturnType<typeof setTimeout>) => {
			timersRef.current.add(timerId);
		},
		[],
	);

	const showNotice = useCallback((message: string, tone: "error" | "info") => {
		setNotice({ message, tone });
		if (noticeTimerRef.current) {
			clearTimeout(noticeTimerRef.current);
		}
		noticeTimerRef.current = setTimeout(() => {
			setNotice(null);
		}, NOTICE_MS);
	}, []);

	const removePoolItem = useCallback(
		(itemId: string) => {
			const spaceId = findEntitySpace(state, itemId);
			if (!spaceId) {
				return;
			}
			world.removeFromSpace(itemId, spaceId);
		},
		[state, world],
	);

	useEffect(() => {
		if (!active) return;
		if (phase === "intro") {
			const timer = setTimeout(() => {
				if (!activeRef.current) return;
				setPhase("streaming");
			}, 200);
			registerTimer(timer);
		}
	}, [active, phase, registerTimer]);

	const handleFrameDrop = useCallback(
		(item: SpaceItemLocation) => {
			const frameNumber =
				typeof item.data?.frameNumber === "number" ? item.data.frameNumber : 0;
			const expectedFrame = lastSentFrameRef.current + 1;
			if (frameNumber !== expectedFrame) {
				world.updateEntity(item.id, {
					data: { status: "error", state: "rejected" },
				});
				showNotice(`Send Frame ${expectedFrame} first.`, "error");
				const timer = setTimeout(() => {
					const outbox = spacesRef.current.internet;
					const placed = outbox?.placedItems.find(
						(entry) => entry.id === item.id,
					);
					if (!placed) return;
					world.removeFromSpace(placed.id, "internet");
				}, 400);
				registerTimer(timer);
				return;
			}

			world.updateEntity(item.id, {
				data: { status: "warning", state: "sending" },
			});
			removePoolItem(item.id);

			const timer = setTimeout(() => {
				if (!activeRef.current) return;
				const outbox = spacesRef.current.internet;
				const placed = outbox?.placedItems.find(
					(entry) => entry.id === item.id,
				);
				if (placed) {
					world.removeFromSpace(placed.id, "internet");
				}

				lastSentFrameRef.current = frameNumber;
				setLastSentFrame(frameNumber);
				setClientFrames((prev) => {
					const next = {
						a: [...prev.a],
						b: [...prev.b],
						c: [...prev.c],
					};
					for (const clientId of UDP_CLIENT_IDS) {
						next[clientId][frameNumber - 1] =
							getFrameDestiny(frameNumber, clientId) === "delivered";
					}
					return next;
				});

				if (frameNumber >= TOTAL_FRAMES) {
					setPhase("complete");
				}
			}, FRAME_SEND_MS);
			registerTimer(timer);
		},
		[registerTimer, removePoolItem, showNotice, world],
	);

	const prevOutboxIdsRef = useRef<Set<string>>(new Set());
	useEffect(() => {
		if (!active) return;
		const outbox = spaces.internet;
		if (!outbox) return;
		const currentIds = new Set(outbox.placedItems.map((item) => item.id));
		const newItems = outbox.placedItems.filter(
			(item) => !prevOutboxIdsRef.current.has(item.id),
		);

		for (const item of newItems) {
			if (item.type === "frame") {
				handleFrameDrop(item);
			}
		}

		prevOutboxIdsRef.current = currentIds;
	}, [active, spaces.internet, handleFrameDrop]);

	useEffect(() => {
		if (!active) return;
		if (phase !== "complete") return;
		if (successShownRef.current) return;
		if (state.question.status === "completed") return;

		successShownRef.current = true;
		interactionSession.openModal(buildUdpSuccessModal());
		progress.completeQuestion();
	}, [active, interactionSession, phase, progress, state.question.status]);

	const expectedFrame = Math.min(lastSentFrame + 1, TOTAL_FRAMES);

	const clientProgress = useMemo(
		() =>
			UDP_CLIENT_IDS.map((clientId) => {
				const frames = clientFrames[clientId];
				const receivedCount = frames.filter(Boolean).length;
				const percent = Math.round((receivedCount / TOTAL_FRAMES) * 100);
				return {
					clientId,
					frames,
					receivedCount,
					percent,
				};
			}),
		[clientFrames],
	);

	useEffect(() => {
		lastSentFrameRef.current = lastSentFrame;
	}, [lastSentFrame]);

	return {
		phase,
		lastSentFrame,
		expectedFrame,
		clientProgress,
		notice,
		frames: FRAME_ITEMS,
	};
};
