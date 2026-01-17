// Custom hook for managing contextual hints based on user progress
// Monitors idle time and game state to provide timely hints

import { useEffect, useRef } from "react";
import type { GamePhase } from "@/components/game/game-provider";
import { useGameDispatch, useGameState } from "@/components/game/game-provider";

interface UseHintSystemProps {
	routerPlaced: boolean;
	pc1Placed: boolean;
	pc2Placed: boolean;
	pc1Connected: boolean;
	pc2Connected: boolean;
	routerConfigured: boolean;
	pc1HasIp: boolean;
	pc2HasIp: boolean;
	dhcpEnabled: boolean;
	ipRange: string | null;
}

/**
 * Manages contextual hints that appear when users are idle or stuck
 * Tracks user actions and provides progressive hints based on current progress
 */
export const useHintSystem = (props: UseHintSystemProps) => {
	const state = useGameState();
	const dispatch = useGameDispatch();
	const lastActionRef = useRef(Date.now());
	const hintStateRef = useRef({
		phase: state.phase,
		routerPlaced: false,
		pc1Placed: false,
		pc2Placed: false,
		pc1Connected: false,
		pc2Connected: false,
		routerConfigured: false,
		pc1HasIp: false,
		pc2HasIp: false,
		hintsActive: false,
		modalOpen: false,
	});

	// Track user actions to reset idle timer
	useEffect(() => {
		lastActionRef.current = Date.now();
	}, [
		state.canvas.placedItems.length,
		state.canvas.connections.length,
		props.dhcpEnabled,
		props.ipRange,
	]);

	// Update hint state snapshot
	useEffect(() => {
		hintStateRef.current = {
			phase: state.phase,
			routerPlaced: props.routerPlaced,
			pc1Placed: props.pc1Placed,
			pc2Placed: props.pc2Placed,
			pc1Connected: props.pc1Connected,
			pc2Connected: props.pc2Connected,
			routerConfigured: props.routerConfigured,
			pc1HasIp: props.pc1HasIp,
			pc2HasIp: props.pc2HasIp,
			hintsActive: state.overlay.hints.length > 0,
			modalOpen: Boolean(state.overlay.activeModal),
		};
	}, [
		props.pc1Connected,
		props.pc1HasIp,
		props.pc1Placed,
		props.pc2Connected,
		props.pc2HasIp,
		props.pc2Placed,
		props.routerConfigured,
		props.routerPlaced,
		state.overlay.activeModal,
		state.overlay.hints.length,
		state.phase,
	]);

	// Periodic hint system that checks idle time and provides contextual hints
	useEffect(() => {
		const interval = window.setInterval(() => {
			const snapshot = hintStateRef.current;

			// Don't show hints if modal or other hints are active
			if (snapshot.modalOpen || snapshot.hintsActive) {
				return;
			}

			const idleMs = Date.now() - lastActionRef.current;

			// Terminal phase hints
			if (snapshot.phase === "terminal") {
				if (idleMs >= 30_000) {
					dispatch({
						type: "SHOW_HINT",
						payload: {
							message:
								"Use a command that tests reachability between two computers.",
							docsUrl: "https://www.google.com/search?q=ping+command",
						},
					});
				}
				return;
			}

			// Setup phase hints - progressive guidance based on current state
			if (!snapshot.routerPlaced && idleMs >= 30_000) {
				dispatch({
					type: "SHOW_HINT",
					payload: {
						message: "Drag the router from inventory to the canvas.",
						docsUrl: "https://www.google.com/search?q=what+is+a+router",
					},
				});
				return;
			}

			if (
				snapshot.routerPlaced &&
				snapshot.pc1Placed &&
				!snapshot.pc1Connected &&
				idleMs >= 30_000
			) {
				dispatch({
					type: "SHOW_HINT",
					payload: {
						message: "Connect PC-1 to the router using a cable.",
						docsUrl: "https://www.google.com/search?q=ethernet+cable",
					},
				});
				return;
			}

			if (
				snapshot.routerPlaced &&
				snapshot.pc1Connected &&
				!snapshot.routerConfigured &&
				idleMs >= 60_000
			) {
				dispatch({
					type: "SHOW_HINT",
					payload: {
						message: "Open the router settings and enable DHCP.",
						docsUrl:
							"https://www.google.com/search?q=dhcp+router+configuration",
					},
				});
				return;
			}

			if (
				snapshot.routerPlaced &&
				snapshot.pc1Connected &&
				snapshot.pc2Connected &&
				!snapshot.pc1HasIp &&
				!snapshot.pc2HasIp &&
				idleMs >= 90_000
			) {
				dispatch({
					type: "SHOW_HINT",
					payload: {
						message:
							"Choose a private IP range so the router can assign IPs.",
						docsUrl:
							"https://www.google.com/search?q=private+ip+range",
					},
				});
			}
		}, 5_000);

		return () => window.clearInterval(interval);
	}, [dispatch]);
};
