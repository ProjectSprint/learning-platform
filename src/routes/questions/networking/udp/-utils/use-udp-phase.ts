import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlacedItem } from "@/components/game/game-provider";
import { useAllPuzzles, useGameDispatch, useGameState } from "@/components/game/game-provider";

import {
	FRAME_ITEMS,
	INVENTORY_GROUP_IDS,
	UDP_CLIENT_IDS,
} from "./constants";
import { FRAME_DESTINY, TOTAL_FRAMES } from "./frame-destiny";
import { buildUdpSuccessModal } from "./modal-builders";
import type { UdpPhase } from "./types";

const FRAME_SEND_MS = 1500;
const NOTICE_MS = 2000;

export type UdpNotice = { message: string; tone: "error" | "info" } | null;

export const useUdpPhase = ({
	active,
	onQuestionComplete,
}: {
	active: boolean;
	onQuestionComplete: () => void;
}) => {
	const dispatch = useGameDispatch();
	const state = useGameState();
	const canvases = useAllPuzzles();

	const [phase, setPhase] = useState<UdpPhase>("intro");
	const [lastSentFrame, setLastSentFrame] = useState(0);
	const [notice, setNotice] = useState<UdpNotice>(null);
	const [clientFrames, setClientFrames] = useState(() => ({
		a: Array.from({ length: TOTAL_FRAMES }, () => false),
		b: Array.from({ length: TOTAL_FRAMES }, () => false),
		c: Array.from({ length: TOTAL_FRAMES }, () => false),
	}));

	const canvasesRef = useRef(canvases);
	const activeRef = useRef(active);
	const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
	const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastSentFrameRef = useRef(lastSentFrame);
	const successShownRef = useRef(false);

	useEffect(() => {
		canvasesRef.current = canvases;
	}, [canvases]);

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

	const registerTimer = useCallback((timerId: ReturnType<typeof setTimeout>) => {
		timersRef.current.add(timerId);
	}, []);

	const showNotice = useCallback((message: string, tone: "error" | "info") => {
		setNotice({ message, tone });
		if (noticeTimerRef.current) {
			clearTimeout(noticeTimerRef.current);
		}
		noticeTimerRef.current = setTimeout(() => {
			setNotice(null);
		}, NOTICE_MS);
	}, []);

	const updateInventoryGroup = useCallback(
		(id: string, updates: { visible?: boolean }) => {
			dispatch({
				type: "UPDATE_INVENTORY_GROUP",
				payload: { id, ...updates },
			});
		},
		[dispatch],
	);

	useEffect(() => {
		if (!active) return;
		updateInventoryGroup(INVENTORY_GROUP_IDS.frames, { visible: true });
		updateInventoryGroup(INVENTORY_GROUP_IDS.received, { visible: false });
		updateInventoryGroup(INVENTORY_GROUP_IDS.incoming, { visible: false });
		updateInventoryGroup(INVENTORY_GROUP_IDS.outgoing, { visible: false });
		updateInventoryGroup(INVENTORY_GROUP_IDS.dataPackets, { visible: false });
	}, [active, updateInventoryGroup]);

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
		(item: PlacedItem) => {
			const frameNumber =
				typeof item.data?.frameNumber === "number" ? item.data.frameNumber : 0;
			const expectedFrame = lastSentFrameRef.current + 1;
			if (frameNumber !== expectedFrame) {
				dispatch({
					type: "CONFIGURE_DEVICE",
					payload: {
						deviceId: item.id,
						puzzleId: "outbox",
						config: { status: "error", state: "rejected" },
					},
				});
				showNotice(`Send Frame ${expectedFrame} first.`, "error");
				const timer = setTimeout(() => {
					const outbox = canvasesRef.current.outbox;
					const placed = outbox?.placedItems.find(
						(entry) => entry.id === item.id,
					);
					if (!placed) return;
					dispatch({
						type: "REMOVE_ITEM",
						payload: {
							puzzleId: "outbox",
							blockX: placed.blockX,
							blockY: placed.blockY,
						},
					});
				}, 400);
				registerTimer(timer);
				return;
			}

			dispatch({
				type: "CONFIGURE_DEVICE",
				payload: {
					deviceId: item.id,
					puzzleId: "outbox",
					config: { status: "warning", state: "sending" },
				},
			});

			const timer = setTimeout(() => {
				if (!activeRef.current) return;
				const outbox = canvasesRef.current.outbox;
				const placed = outbox?.placedItems.find(
					(entry) => entry.id === item.id,
				);
				if (placed) {
					dispatch({
						type: "REMOVE_ITEM",
						payload: {
							puzzleId: "outbox",
							blockX: placed.blockX,
							blockY: placed.blockY,
						},
					});
				}

				lastSentFrameRef.current = frameNumber;
				setLastSentFrame(frameNumber);
				setClientFrames((prev) => {
					const next = {
						a: [...prev.a],
						b: [...prev.b],
						c: [...prev.c],
					};
					const destiny = FRAME_DESTINY[frameNumber];
					for (const clientId of UDP_CLIENT_IDS) {
						next[clientId][frameNumber - 1] = destiny?.[clientId] ?? false;
					}
					return next;
				});

				if (frameNumber >= TOTAL_FRAMES) {
					setPhase("complete");
				}
			}, FRAME_SEND_MS);
			registerTimer(timer);
		},
		[dispatch, registerTimer, showNotice],
	);

	const prevOutboxIdsRef = useRef<Set<string>>(new Set());
	useEffect(() => {
		if (!active) return;
		const outbox = canvases.outbox;
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
	}, [active, canvases.outbox, handleFrameDrop]);

	useEffect(() => {
		if (!active) return;
		if (phase !== "complete") return;
		if (successShownRef.current) return;
		if (state.question.status === "completed") return;

		successShownRef.current = true;
		dispatch({
			type: "OPEN_MODAL",
			payload: buildUdpSuccessModal(onQuestionComplete),
		});
		dispatch({ type: "COMPLETE_QUESTION" });
	}, [active, dispatch, onQuestionComplete, phase, state.question.status]);

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
