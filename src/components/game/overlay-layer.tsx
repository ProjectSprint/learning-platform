import { Box, Button, Flex, Link, Text } from "@chakra-ui/react";
import {
	Fragment,
	lazy,
	type MouseEvent,
	Suspense,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

import { type Hint, useGameDispatch, useGameState } from "./game-provider";

const RouterConfigForm = lazy(() =>
	import("./forms/router-config-form").then((mod) => ({
		default: mod.RouterConfigForm,
	})),
);

const PCConfigForm = lazy(() =>
	import("./forms/pc-config-form").then((mod) => ({
		default: mod.PCConfigForm,
	})),
);

const SuccessModal = lazy(() =>
	import("./forms/success-modal").then((mod) => ({
		default: mod.SuccessModal,
	})),
);

const ConfirmModal = lazy(() =>
	import("./forms/confirm-modal").then((mod) => ({
		default: mod.ConfirmModal,
	})),
);

const getFocusableElements = (container: HTMLElement) =>
	Array.from(
		container.querySelectorAll<HTMLElement>(
			'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
		),
	).filter(
		(element) =>
			!element.hasAttribute("disabled") && !element.getAttribute("aria-hidden"),
	);

const HintToast = ({
	hint,
	onDismiss,
}: {
	hint: Hint;
	onDismiss: () => void;
}) => {
	return (
		<Box
			bg="gray.800"
			border="1px solid"
			borderColor="gray.700"
			borderRadius="md"
			p={3}
			width="260px"
			boxShadow="lg"
		>
			<Text fontSize="sm" fontWeight="bold" mb={2}>
				Hint
			</Text>
			<Text fontSize="sm" color="gray.200" mb={3}>
				{hint.message}
			</Text>
			<Flex justify="space-between" align="center" gap={2}>
				{hint.docsUrl ? (
					<Link
						href={hint.docsUrl}
						target="_blank"
						rel="noopener noreferrer"
						fontSize="sm"
					>
						Docs
					</Link>
				) : (
					<Box />
				)}
				<Button variant="ghost" size="xs" onClick={onDismiss}>
					Dismiss
				</Button>
			</Flex>
		</Box>
	);
};

export const OverlayLayer = () => {
	const { overlay, canvas } = useGameState();
	const dispatch = useGameDispatch();
	const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
	const modalRef = useRef<HTMLDivElement | null>(null);
	const lastActiveRef = useRef<HTMLElement | null>(null);
	const hintTimeouts = useRef<Map<string, number>>(new Map());

	const activeModal = overlay.activeModal;
	const hints = overlay.hints;

	const currentDeviceConfig = useMemo(() => {
		if (!activeModal?.deviceId) {
			return undefined;
		}

		const placed = canvas.placedItems.find(
			(item) => item.id === activeModal.deviceId,
		);
		return placed?.data;
	}, [activeModal?.deviceId, canvas.placedItems]);

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

	useEffect(() => {
		hints.forEach((hint) => {
			if (!hint.autoDismiss || hintTimeouts.current.has(hint.id)) {
				return;
			}

			const timeoutId = window.setTimeout(() => {
				dispatch({ type: "DISMISS_HINT", payload: { hintId: hint.id } });
			}, 10_000);

			hintTimeouts.current.set(hint.id, timeoutId);
		});

		const currentIds = new Set(hints.map((hint) => hint.id));
		hintTimeouts.current.forEach((timeoutId, hintId) => {
			if (!currentIds.has(hintId)) {
				window.clearTimeout(timeoutId);
				hintTimeouts.current.delete(hintId);
			}
		});
	}, [dispatch, hints]);

	useEffect(() => {
		return () => {
			hintTimeouts.current.forEach((timeoutId) => {
				window.clearTimeout(timeoutId);
			});
			hintTimeouts.current.clear();
		};
	}, []);

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

	if (!activeModal && hints.length === 0) {
		return null;
	}

	const modalContent = (() => {
		if (!activeModal) {
			return null;
		}

		switch (activeModal.type) {
			case "router-config":
				return (
					<RouterConfigForm
						deviceId={activeModal.deviceId ?? ""}
						currentConfig={currentDeviceConfig}
						onClose={() => dispatch({ type: "CLOSE_MODAL" })}
					/>
				);
			case "pc-config":
				return (
					<PCConfigForm
						deviceId={activeModal.deviceId ?? ""}
						currentConfig={currentDeviceConfig}
						onClose={() => dispatch({ type: "CLOSE_MODAL" })}
					/>
				);
			case "success": {
				const title =
					typeof activeModal.data?.title === "string"
						? activeModal.data.title
						: undefined;
				const message =
					typeof activeModal.data?.message === "string"
						? activeModal.data.message
						: undefined;
				const actionLabel =
					typeof activeModal.data?.actionLabel === "string"
						? activeModal.data.actionLabel
						: undefined;

				return (
					<SuccessModal
						title={title}
						message={message}
						actionLabel={actionLabel}
						onAction={() => dispatch({ type: "CLOSE_MODAL" })}
					/>
				);
			}
			case "confirm": {
				const title =
					typeof activeModal.data?.title === "string"
						? activeModal.data.title
						: undefined;
				const message =
					typeof activeModal.data?.message === "string"
						? activeModal.data.message
						: undefined;
				const confirmLabel =
					typeof activeModal.data?.confirmLabel === "string"
						? activeModal.data.confirmLabel
						: undefined;
				const cancelLabel =
					typeof activeModal.data?.cancelLabel === "string"
						? activeModal.data.cancelLabel
						: undefined;

				return (
					<ConfirmModal
						title={title}
						message={message}
						confirmLabel={confirmLabel}
						cancelLabel={cancelLabel}
						onConfirm={() => dispatch({ type: "CLOSE_MODAL" })}
						onCancel={() => dispatch({ type: "CLOSE_MODAL" })}
					/>
				);
			}
			default:
				return null;
		}
	})();

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
							{modalContent ?? <Fragment />}
						</Suspense>
					</Box>
				</Box>
			)}

			{hints.length > 0 && (
				<Box
					position="absolute"
					bottom={{ base: 4, md: 6 }}
					right={{ base: 4, md: 6 }}
					display="flex"
					flexDirection="column"
					gap={3}
					pointerEvents="auto"
					aria-live="polite"
				>
					{hints.map((hint) => (
						<HintToast
							key={hint.id}
							hint={hint}
							onDismiss={() =>
								dispatch({ type: "DISMISS_HINT", payload: { hintId: hint.id } })
							}
						/>
					))}
				</Box>
			)}
		</Box>,
		portalTarget,
	);
};
