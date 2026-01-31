import { Box, Flex, Text } from "@chakra-ui/react";
import { type MouseEvent, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGameDispatch, useGameState } from "../../game-provider";
import { ModalInstanceView } from "./modal-instance";

const getFocusableElements = (container: HTMLElement) =>
	Array.from(
		container.querySelectorAll<HTMLElement>(
			'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
		),
	).filter(
		(element) =>
			!element.hasAttribute("disabled") && !element.getAttribute("aria-hidden"),
	);

export const Modal = () => {
	const { overlay } = useGameState();
	const dispatch = useGameDispatch();
	const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
	const modalRef = useRef<HTMLDivElement | null>(null);
	const lastActiveRef = useRef<HTMLElement | null>(null);

	const activeModal = overlay.activeModal;

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
		if (!activeModal) {
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

		modalRef.current?.focus();
	}, [activeModal]);

	useEffect(() => {
		if (!activeModal || !modalRef.current) {
			return;
		}

		const container = modalRef.current;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Tab") {
				return;
			}

			const focusable = getFocusableElements(container);
			if (focusable.length === 0) {
				return;
			}

			const first = focusable[0];
			const last = focusable[focusable.length - 1];

			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
				return;
			}

			if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};

		container.addEventListener("keydown", handleKeyDown);
		return () => {
			container.removeEventListener("keydown", handleKeyDown);
		};
	}, [activeModal]);

	useEffect(() => {
		if (!activeModal) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") {
				return;
			}

			if (activeModal.blocking) {
				return;
			}

			dispatch({ type: "CLOSE_MODAL" });
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [activeModal, dispatch]);

	const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
		if (event.target !== event.currentTarget) {
			return;
		}
		if (activeModal?.blocking) {
			return;
		}
		dispatch({ type: "CLOSE_MODAL" });
	};

	if (!portalTarget) {
		return null;
	}

	if (!activeModal) {
		return null;
	}

	const handleClose = () => dispatch({ type: "CLOSE_MODAL" });

	return createPortal(
		<Box position="fixed" inset="0" zIndex={10000} pointerEvents="none">
			{activeModal && (
				<Box
					position="absolute"
					inset="0"
					bg="rgba(0, 0, 0, 0.6)"
					display="flex"
					alignItems="center"
					justifyContent="center"
					pointerEvents="auto"
					onClick={handleBackdropClick}
				>
					<Box
						ref={modalRef}
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
							<ModalInstanceView instance={activeModal} onClose={handleClose} />
						</Suspense>
					</Box>
				</Box>
			)}
		</Box>,
		portalTarget,
	);
};
