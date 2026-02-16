import { Box, Flex, Text } from "@chakra-ui/react";
import { type MouseEvent, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGameDispatch, useGameState } from "../../game-provider";
import { ModalInstanceView } from "./modal-instance";

export const Modal = () => {
	const { overlay } = useGameState();
	const dispatch = useGameDispatch();
	const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
	const lastActiveRef = useRef<HTMLElement | null>(null);

	const visibleModals = Object.entries(overlay.modals).filter(
		([_, entry]) => entry.visible,
	);
	const hasVisibleModal = visibleModals.length > 0;

	useEffect(() => {
		if (typeof document === "undefined") {
			return;
		}

		let container = document.getElementById("overlay-portal");
		if (!container) {
			container = document.createElement("div");
			container.id = "overlay-portal";
			document.body.appendChild(container);
		}
		setPortalTarget(container);

		return () => {
			setPortalTarget(null);
		};
	}, []);

	useEffect(() => {
		if (!hasVisibleModal) {
			if (lastActiveRef.current) {
				lastActiveRef.current.focus();
			}
			return;
		}

		if (typeof document !== "undefined") {
			const activeElement = document.activeElement;
			if (activeElement instanceof HTMLElement) {
				lastActiveRef.current = activeElement;
			}
		}
	}, [hasVisibleModal]);

	useEffect(() => {
		if (!hasVisibleModal) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") {
				return;
			}

			// Check if any visible modal is blocking
			const blockingModal = visibleModals.find(
				([_, entry]) => entry.instance.blocking,
			);
			if (blockingModal) {
				return;
			}

			dispatch({ type: "CLOSE_MODAL" });
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [hasVisibleModal, visibleModals, dispatch]);

	if (!portalTarget) {
		return null;
	}

	// Always render portal (even with no visible modals) to preserve component state
	// Hidden modals use display:none, so they stay mounted
	return createPortal(
		<Box position="fixed" inset="0" zIndex={10000} pointerEvents="none">
			{Object.entries(overlay.modals).map(([modalId, entry]) => {
				const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
					if (event.target !== event.currentTarget) {
						return;
					}
					if (entry.instance.blocking) {
						return;
					}
					dispatch({ type: "CLOSE_MODAL", payload: { modalId } });
				};

				const handleClose = () =>
					dispatch({ type: "CLOSE_MODAL", payload: { modalId } });

				return (
					<Box
						key={modalId}
						position="absolute"
						inset="0"
						bg="rgba(0, 0, 0, 0.6)"
						display={entry.visible ? "flex" : "none"}
						alignItems="center"
						justifyContent="center"
						pointerEvents="auto"
						onClick={handleBackdropClick}
					>
						<Box
							tabIndex={-1}
							role="dialog"
							aria-modal="true"
							bg="gray.900"
							color="gray.100"
							border="1px solid"
							borderColor="gray.700"
							borderRadius="lg"
							p={6}
							width="min(460px, 92vw)"
							boxShadow="xl"
						>
							<Suspense
								fallback={
									<Flex align="center" justify="center" minHeight="120px">
										<Text fontSize="sm" color="gray.300">
											Loading...
										</Text>
									</Flex>
								}
							>
								<ModalInstanceView
									modalId={modalId}
									instance={entry.instance}
									onClose={handleClose}
								/>
							</Suspense>
						</Box>
					</Box>
				);
			})}
		</Box>,
		portalTarget,
	);
};
