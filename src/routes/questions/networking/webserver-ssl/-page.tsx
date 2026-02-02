import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EntityData } from "@/components/game/domain/entity/entity-data";
import { findEntitySpace } from "@/components/game/domain/space/validation";
import { GameBoard, GridSpace, PoolSpace } from "@/components/game/engine";
import { useDragEngine, useTerminalEngine } from "@/components/game/engines";
import {
	type BoardItemStatus,
	GameProvider,
	useGameDispatch,
	useGameState,
} from "@/components/game/game-provider";
import type { EntityStatus } from "@/components/game/presentation/entity/PlacedEntity";
import {
	ContextualHint,
	useContextualHint,
} from "@/components/game/presentation/hint";
import { DragOverlay } from "@/components/game/presentation/interaction/drag/DragOverlay";
import { Modal } from "@/components/game/presentation/modal";
import {
	TerminalInput,
	TerminalLayout,
	TerminalView,
	useTerminalInput,
} from "@/components/game/presentation/terminal";
import type { QuestionProps } from "@/components/module";

import {
	CANVAS_CONFIGS,
	CANVAS_ORDER,
	DEFAULT_DOMAIN,
	QUESTION_DESCRIPTION,
	QUESTION_TITLE,
	SSL_ITEMS_INVENTORY,
	SSL_SETUP_INVENTORY_ITEMS,
} from "./-utils/constants";
import { getContextualHint } from "./-utils/get-contextual-hint";
import { initializeSslQuestion } from "./-utils/init-spaces";
import {
	getSslItemLabel,
	getSslStatusMessage,
} from "./-utils/item-notification";
import {
	buildBrowserStatusModal,
	buildCertificateInfoModal,
	buildCertificateRequestModal,
	buildIndexHtmlViewModal,
	buildPrivateKeyInfoModal,
	buildRedirectInfoModal,
	buildWebserver80StatusModal,
	buildWebserver443StatusModal,
} from "./-utils/modal-builders";
import { useSslState } from "./-utils/use-ssl-state";
import { useSslTerminal } from "./-utils/use-ssl-terminal";

export const WebServerSslQuestion = ({ onQuestionComplete }: QuestionProps) => {
	return (
		<GameProvider>
			<SslGame onQuestionComplete={onQuestionComplete} />
		</GameProvider>
	);
};

const SslGame = ({
	onQuestionComplete: _onQuestionComplete,
}: {
	onQuestionComplete: () => void;
}) => {
	const dispatch = useGameDispatch();
	const state = useGameState();
	const initializedRef = useRef(false);
	const terminalInput = useTerminalInput();
	const isCompleted = state.question.status === "completed";
	const shouldShowTerminal = state.phase === "terminal";
	const {
		browserItems,
		browserStatus,
		certificateDomain,
		certificateIssued,
		hasRedirect,
		httpReady,
		httpsReady,
		letsencryptItems,
		letsencryptModalOpen,
		port80Config,
		port80Items,
		port80Domain,
		port443Items,
		port443Domain,
		port443SslStatus,
	} = useSslState();
	const [showSslCanvases, setShowSslCanvases] = useState(false);
	const [showSslItems, setShowSslItems] = useState(false);
	useDragEngine();

	const handleSslCommand = useSslTerminal({
		httpReady,
		httpsReady,
		hasRedirect,
		port80Domain,
		certificateDomain,
		onQuestionComplete: _onQuestionComplete,
	});

	useTerminalEngine({
		onCommand: handleSslCommand,
	});

	useEffect(() => {
		if (httpReady) {
			setShowSslCanvases(true);
		}
	}, [httpReady]);

	useEffect(() => {
		if (certificateIssued) {
			setShowSslItems(true);
		}
	}, [certificateIssued]);

	// Initialize question
	useEffect(() => {
		if (initializedRef.current) {
			return;
		}

		initializedRef.current = true;
		initializeSslQuestion(dispatch);
	}, [dispatch]);

	// Terminal visibility
	useEffect(() => {
		if (shouldShowTerminal && !state.terminal.visible) {
			dispatch({ type: "OPEN_TERMINAL" });
			return;
		}
		if (!shouldShowTerminal && state.terminal.visible) {
			dispatch({ type: "CLOSE_TERMINAL" });
		}
	}, [dispatch, shouldShowTerminal, state.terminal.visible]);

	const canvasAreas = useMemo(
		() => ({
			browser: "browser",
			"port-80": "port-80",
			letsencrypt: "letsencrypt",
			"port-443": "port-443",
		}),
		[],
	);
	const visibleCanvases = showSslCanvases
		? CANVAS_ORDER
		: (["browser", "port-80"] as const);
	const gridTemplateAreas = showSslCanvases
		? {
				base: `"browser" "port-80" "letsencrypt" "port-443"`,
				md: `"browser port-80" "letsencrypt port-443"`,
				lg: `"browser port-80 letsencrypt port-443"`,
			}
		: {
				base: `"browser" "port-80"`,
				md: `"browser port-80"`,
				lg: `"browser port-80"`,
			};
	const gridTemplateColumns = showSslCanvases
		? {
				base: "1fr",
				md: "repeat(2, minmax(0, 1fr))",
				lg: "repeat(4, minmax(0, 1fr))",
			}
		: {
				base: "1fr",
				md: "repeat(2, minmax(0, 1fr))",
				lg: "repeat(2, minmax(0, 1fr))",
			};

	useEffect(() => {
		if (!showSslCanvases) {
			return;
		}

		for (const item of SSL_SETUP_INVENTORY_ITEMS) {
			const currentSpaceId = findEntitySpace(state, item.id);
			if (currentSpaceId) {
				continue;
			}

			dispatch({
				type: "ADD_ENTITY_TO_SPACE",
				payload: { entityId: item.id, spaceId: "ssl-setup" },
			});
		}
	}, [dispatch, showSslCanvases, state]);

	useEffect(() => {
		if (!showSslItems) {
			return;
		}

		for (const item of SSL_ITEMS_INVENTORY) {
			const currentSpaceId = findEntitySpace(state, item.id);
			if (currentSpaceId) {
				continue;
			}

			dispatch({
				type: "ADD_ENTITY_TO_SPACE",
				payload: { entityId: item.id, spaceId: "ssl-items" },
			});
		}
	}, [dispatch, showSslItems, state]);

	const port80Status = useMemo<BoardItemStatus>(() => {
		if (
			!port80Config.hasWebserver ||
			!port80Config.hasDomain ||
			(!port80Config.hasIndexHtml && !port80Config.hasRedirect)
		) {
			return "error";
		}
		if (port80Config.hasRedirect) {
			return "success";
		}
		return "warning";
	}, [port80Config]);

	const port443Status = useMemo<BoardItemStatus>(() => {
		if (
			!port443SslStatus.hasWebserver ||
			!port443SslStatus.hasDomain ||
			!port443SslStatus.hasIndexHtml
		) {
			return "error";
		}
		if (port443SslStatus.hasPrivateKey && port443SslStatus.hasCertificate) {
			return "success";
		}
		return "warning";
	}, [port443SslStatus]);

	const port443Missing = useMemo(() => {
		if (port443Status !== "warning") {
			return null;
		}
		if (!port443SslStatus.hasPrivateKey && !port443SslStatus.hasCertificate) {
			return "ssl";
		}
		if (!port443SslStatus.hasPrivateKey) {
			return "private-key";
		}
		if (!port443SslStatus.hasCertificate) {
			return "certificate";
		}
		return null;
	}, [port443Status, port443SslStatus]);

	const browserModalStatus = useMemo(() => {
		if (browserStatus === "success") {
			return {
				url: `https://${port80Domain || DEFAULT_DOMAIN}`,
				connection: "Secure",
				port: "443",
			};
		}
		if (browserStatus === "warning") {
			return {
				url: `http://${port80Domain || DEFAULT_DOMAIN}`,
				connection: "Not Secure",
				port: "80",
			};
		}
		return {
			url: "Not connected",
			connection: "Can't connect",
			port: "—",
		};
	}, [browserStatus, port80Domain]);

	const entityClickHandlers = useMemo(
		() => ({
			browser: (entity: EntityData) => {
				dispatch({
					type: "OPEN_MODAL",
					payload: buildBrowserStatusModal(
						entity.id,
						browserModalStatus,
						browserStatus === "success",
					),
				});
			},
			"webserver-80": (entity: EntityData) => {
				const servingFile = port80Config.hasRedirect
					? "Redirect to HTTPS"
					: port80Config.hasIndexHtml
						? "index.html"
						: undefined;
				dispatch({
					type: "OPEN_MODAL",
					payload: buildWebserver80StatusModal(entity.id, {
						status:
							port80Status === "error"
								? "Not configured"
								: port80Status === "warning"
									? "Serving HTTP"
									: "Redirecting to HTTPS",
						domain: port80Domain,
						servingFile,
					}),
				});
			},
			"webserver-443": (entity: EntityData) => {
				dispatch({
					type: "OPEN_MODAL",
					payload: buildWebserver443StatusModal(entity.id, {
						status:
							port443Status === "error"
								? "Not configured"
								: port443Status === "warning"
									? "Missing SSL"
									: "🔒 Serving HTTPS",
						domain: port443Domain,
						privateKey: port443SslStatus.hasPrivateKey
							? "✓ Installed"
							: "Not installed",
						certificate: port443SslStatus.hasCertificate
							? "✓ Installed"
							: "Not installed",
						servingFile: port443SslStatus.hasIndexHtml
							? "index.html"
							: undefined,
					}),
				});
			},
			"domain-ssl": (entity: EntityData) => {
				dispatch({
					type: "OPEN_MODAL",
					payload: buildCertificateRequestModal(
						entity.id,
						certificateDomain || port80Domain || DEFAULT_DOMAIN,
						certificateIssued,
						{ domain: port80Domain || DEFAULT_DOMAIN },
					),
				});
			},
			"index-html": (entity: EntityData) => {
				dispatch({
					type: "OPEN_MODAL",
					payload: buildIndexHtmlViewModal(entity.id),
				});
			},
			"private-key": (entity: EntityData) => {
				const installed = findEntitySpace(state, entity.id) === "port-443";
				dispatch({
					type: "OPEN_MODAL",
					payload: buildPrivateKeyInfoModal(entity.id, installed),
				});
			},
			certificate: (entity: EntityData) => {
				const installed = findEntitySpace(state, entity.id) === "port-443";
				dispatch({
					type: "OPEN_MODAL",
					payload: buildCertificateInfoModal(entity.id, installed),
				});
			},
			"redirect-to-https": (entity: EntityData) => {
				dispatch({
					type: "OPEN_MODAL",
					payload: buildRedirectInfoModal(entity.id),
				});
			},
		}),
		[
			browserModalStatus,
			browserStatus,
			certificateDomain,
			certificateIssued,
			dispatch,
			port80Config,
			port80Domain,
			port80Status,
			port443Domain,
			port443SslStatus,
			port443Status,
			state,
		],
	);

	const handleEntityClick = useCallback(
		(entity: EntityData) => {
			const handler =
				entityClickHandlers[entity.type as keyof typeof entityClickHandlers];
			if (handler) {
				handler(entity);
			}
		},
		[entityClickHandlers],
	);

	const isEntityClickable = useCallback(
		(entity: EntityData) =>
			[
				"browser",
				"webserver-80",
				"webserver-443",
				"domain-ssl",
				"index-html",
				"private-key",
				"certificate",
				"redirect-to-https",
			].includes(entity.type),
		[],
	);

	const getEntityStatus = useCallback(
		(entity: EntityData) => {
			const spaceId = findEntitySpace(state, entity.id);
			if (!spaceId) {
				return {};
			}

			if (entity.type === "browser" && spaceId === "browser") {
				const statusMessage = getSslStatusMessage({
					id: entity.id,
					itemId: entity.id,
					type: entity.type,
					blockX: 0,
					blockY: 0,
					status: browserStatus,
					data: { domain: port80Domain || DEFAULT_DOMAIN },
				});
				return {
					status: browserStatus as EntityStatus,
					message: statusMessage,
				};
			}

			if (entity.type === "webserver-80" && spaceId === "port-80") {
				const statusMessage = getSslStatusMessage(
					{
						id: entity.id,
						itemId: entity.id,
						type: entity.type,
						blockX: 0,
						blockY: 0,
						status: port80Status,
						data: {},
					},
					spaceId,
				);
				return {
					status: port80Status as EntityStatus,
					message: statusMessage,
				};
			}

			if (entity.type === "webserver-443" && spaceId === "port-443") {
				const statusMessage = getSslStatusMessage(
					{
						id: entity.id,
						itemId: entity.id,
						type: entity.type,
						blockX: 0,
						blockY: 0,
						status: port443Status,
						data: { sslMissing: port443Missing ?? undefined },
					},
					spaceId,
				);
				return {
					status: port443Status as EntityStatus,
					message: statusMessage,
				};
			}

			if (
				entity.type === "domain" &&
				["port-80", "port-443"].includes(spaceId)
			) {
				const domain =
					spaceId === "port-443"
						? port443Domain || DEFAULT_DOMAIN
						: port80Domain || DEFAULT_DOMAIN;
				const statusMessage = getSslStatusMessage({
					id: entity.id,
					itemId: entity.id,
					type: entity.type,
					blockX: 0,
					blockY: 0,
					status: "normal",
					data: { domain },
				});
				return {
					message: statusMessage,
				};
			}

			if (entity.type === "domain-ssl" && spaceId === "letsencrypt") {
				const status: EntityStatus = certificateIssued ? "success" : "warning";
				const statusMessage = getSslStatusMessage({
					id: entity.id,
					itemId: entity.id,
					type: entity.type,
					blockX: 0,
					blockY: 0,
					status,
					data: { domain: certificateDomain || DEFAULT_DOMAIN },
				});
				return {
					status,
					message: statusMessage,
				};
			}

			return {};
		},
		[
			browserStatus,
			certificateDomain,
			certificateIssued,
			port80Domain,
			port80Status,
			port443Domain,
			port443Missing,
			port443Status,
			state,
		],
	);

	const contextualHint = useMemo(
		() =>
			getContextualHint({
				browserItems,
				port80Items,
				letsencryptItems,
				port443Items,
				httpReady,
				httpsReady,
				certificateIssued,
				browserStatus,
				letsencryptModalOpen,
			}),
		[
			browserItems,
			port80Items,
			letsencryptItems,
			port443Items,
			httpReady,
			httpsReady,
			certificateIssued,
			browserStatus,
			letsencryptModalOpen,
		],
	);

	useContextualHint(contextualHint);

	return (
		<Box
			as="main"
			role="main"
			display="flex"
			flexDirection="column"
			bg="gray.950"
			color="gray.100"
			position="relative"
		>
			<Flex
				direction="column"
				px={{ base: 4, md: 12, lg: 24 }}
				py={{ base: 4, md: 6 }}
			>
				<Box textAlign="left" mb={4}>
					<Text
						fontSize={{ base: "2xl", md: "4xl" }}
						fontWeight="bold"
						color="gray.50"
					>
						{QUESTION_TITLE}
					</Text>
					<Text fontSize={{ base: "sm", md: "md" }} color="gray.400">
						{QUESTION_DESCRIPTION}
					</Text>
				</Box>

				<GameBoard>
					<Grid
						templateAreas={gridTemplateAreas}
						templateColumns={gridTemplateColumns}
						gap={{ base: 2, md: 4 }}
						alignItems="stretch"
					>
						{visibleCanvases.map((canvasId) => {
							const config = CANVAS_CONFIGS[canvasId];
							if (!config) return null;
							return (
								<GridItem key={canvasId} area={canvasAreas[canvasId]} minW={0}>
									<GridSpace
										spaceId={canvasId}
										title={config.name ?? canvasId}
										onEntityClick={handleEntityClick}
										isEntityClickable={isEntityClickable}
										getEntityLabel={(entity) => getSslItemLabel(entity.type)}
										getEntityStatus={getEntityStatus}
									/>
								</GridItem>
							);
						})}
					</Grid>

					<Flex direction="column" gap={4} mt={4}>
						<PoolSpace title="Inventory" />
						{showSslCanvases && (
							<PoolSpace spaceId="ssl-setup" title="SSL Setup" />
						)}
						{showSslItems && (
							<PoolSpace spaceId="ssl-items" title="SSL Certificates" />
						)}
					</Flex>

					<ContextualHint />

					<DragOverlay getEntityLabel={getSslItemLabel} />
				</GameBoard>

				<TerminalLayout
					visible={state.terminal.visible}
					focusRef={terminalInput.inputRef}
					view={
						<TerminalView
							history={state.terminal.history}
							prompt={state.terminal.prompt}
							isCompleted={isCompleted}
						/>
					}
					input={
						<TerminalInput
							value={terminalInput.value}
							onChange={terminalInput.onChange}
							onKeyDown={terminalInput.onKeyDown}
							inputRef={terminalInput.inputRef}
							placeholder={isCompleted ? "Terminal disabled" : "Type a command"}
							disabled={isCompleted}
						/>
					}
				/>
			</Flex>
			<Modal />
		</Box>
	);
};
