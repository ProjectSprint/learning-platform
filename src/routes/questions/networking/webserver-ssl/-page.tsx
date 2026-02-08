import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { EntityData } from "@/components/game/domain/entity/entity-data";
import { findEntitySpace } from "@/components/game/domain/space/validation";
import { GameBoard, GridSpace, PoolSpace } from "@/components/game/engine";
import { useDragEngine, useTerminalEngine } from "@/components/game/engines";
import {
	type BoardItemStatus,
	GameProvider,
	useDrawerManager,
	useEngineEvents,
	useGameCtx,
	useGameDispatch,
	useGameState,
} from "@/components/game/game-provider";
import { DrawerLayout } from "@/components/game/presentation/drawer";
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
	useTerminalStore,
} from "@/components/game/presentation/terminal";
import type { QuestionProps } from "@/components/module";

import {
	DEFAULT_DOMAIN,
	INVENTORY_POOL_CONFIG,
	QUESTION_DESCRIPTION,
	QUESTION_TITLE,
	SPACE_CONFIGS,
	SSL_ITEMS_INVENTORY,
	SSL_ITEMS_POOL_CONFIG,
	SSL_POOL_IDS,
	SSL_SETUP_INVENTORY_ITEMS,
	SSL_SETUP_POOL_CONFIG,
	TERMINAL_INTRO_ENTRIES,
	TERMINAL_PROMPT,
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

const INVENTORY_DRAWER_ID = "inventory-drawer";
const WEB_SSL_SPACE_IDS = {
	browser: "browser",
	port80: "port-80",
	letsencrypt: "letsencrypt",
	port443: "port-443",
} as const;

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
	const gameCtx = useGameCtx();
	const { events, ack } = useEngineEvents("webserver-ssl-page");
	const initializedRef = useRef(false);
	const terminalOpenedRef = useRef(false);
	const terminalInput = useTerminalInput();
	const {
		terminal,
		openTerminal,
		closeTerminal,
		setPrompt,
		addEntry,
		addOutput,
	} = useTerminalStore();
	const isCompleted = state.question.status === "completed";
	const shouldShowTerminal =
		state.phase === "terminal" || state.phase === "completed" || isCompleted;
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
	const [showSslSpaces, setShowSslSpaces] = useState(false);
	const [showSslItems, setShowSslItems] = useState(false);
	const [eventTick, setEventTick] = useState(0);
	useDragEngine();
	const { registerDrawer, updateDrawerConfig, openDrawer } = useDrawerManager();
	const lastSslSpacesRef = useRef(showSslSpaces);
	const lastSslItemsRef = useRef(showSslItems);

	useLayoutEffect(() => {
		registerDrawer({
			id: INVENTORY_DRAWER_ID,
			contentType: "space",
			spaceId: "inventory",
			spaceIds: ["inventory"],
			title: "Inventory",
			position: "bottom",
			initialState: "expanded",
			expandedSize: { base: "65vh", md: "40vh" },
			foldedSize: { sm: "30vh" },
			mouseAware: true,
			showFloatingButton: true,
			floatingButtonLabel: "Inventory",
		});
	}, [registerDrawer]);

	useEffect(() => {
		const nextSpaceIds = ["inventory"];
		if (showSslSpaces) {
			nextSpaceIds.push(SSL_POOL_IDS.setup);
		}
		if (showSslItems) {
			nextSpaceIds.push(SSL_POOL_IDS.certificates);
		}

		updateDrawerConfig(INVENTORY_DRAWER_ID, { spaceIds: nextSpaceIds });

		const shouldOpen =
			(showSslSpaces && !lastSslSpacesRef.current) ||
			(showSslItems && !lastSslItemsRef.current);
		if (shouldOpen) {
			openDrawer(INVENTORY_DRAWER_ID);
		}

		lastSslSpacesRef.current = showSslSpaces;
		lastSslItemsRef.current = showSslItems;
	}, [openDrawer, showSslItems, showSslSpaces, updateDrawerConfig]);

	useEffect(() => {
		if (events.length === 0) {
			return;
		}

		let shouldSync = false;

		for (const event of events) {
			if (
				event.type === "ENTITY_ENTERED_SPACE" ||
				event.type === "ENTITY_LEFT_SPACE" ||
				event.type === "ENTITY_MOVED" ||
				event.type === "ENTITY_UPDATED" ||
				event.type === "PHASE_CHANGED"
			) {
				shouldSync = true;
			}

			if (
				event.type === "MODAL_SUBMITTED" &&
				event.modalId.startsWith("certificate-request-") &&
				event.modalActionId === "issue"
			) {
				const deviceId = event.modalId.replace("certificate-request-", "");
				const domain = String(event.values.domain ?? "").trim();

				if (domain) {
					dispatch({
						type: "ENTITY_UPDATED",
						payload: {
							entityId: deviceId,
							updates: {
								data: {
									certificateIssued: true,
									verified: true,
									certificateDomain: domain,
								},
							},
						},
					});
				}
			}

			if (
				event.type === "MODAL_SUBMITTED" &&
				event.modalId === "success" &&
				event.modalActionId === "primary"
			) {
				_onQuestionComplete();
			}
		}

		if (shouldSync) {
			setEventTick((prev) => prev + 1);
		}
		ack();
	}, [ack, dispatch, events, _onQuestionComplete]);

	const handleSslCommand = useSslTerminal({
		httpReady,
		httpsReady,
		hasRedirect,
		port80Domain,
		certificateDomain,
	});

	useTerminalEngine({
		onCommand: handleSslCommand,
	});

	useEffect(() => {
		void eventTick;
		if (httpReady) {
			setShowSslSpaces(true);
		}
	}, [eventTick, httpReady]);

	useEffect(() => {
		void eventTick;
		if (certificateIssued) {
			setShowSslItems(true);
		}
	}, [certificateIssued, eventTick]);

	useEffect(() => {
		void eventTick;
		if (httpsReady && hasRedirect && state.phase !== "terminal") {
			dispatch({ type: "SET_PHASE", payload: { phase: "terminal" } });
		}
	}, [dispatch, eventTick, hasRedirect, httpsReady, state.phase]);

	// Initialize question
	useEffect(() => {
		if (initializedRef.current) {
			return;
		}

		initializedRef.current = true;
		initializeSslQuestion(dispatch);
	}, [dispatch]);

	useEffect(() => {
		setPrompt(TERMINAL_PROMPT);
		for (const entry of TERMINAL_INTRO_ENTRIES) {
			addEntry(entry);
		}
		closeTerminal();
	}, [addEntry, closeTerminal, setPrompt]);

	// Terminal visibility and initial help message
	useEffect(() => {
		if (shouldShowTerminal && !terminal.visible) {
			openTerminal();

			if (!terminalOpenedRef.current) {
				terminalOpenedRef.current = true;
				const domain = port80Domain || certificateDomain || DEFAULT_DOMAIN;
				setTimeout(() => {
					const helpLines = [
						"Terminal - SSL diagnostic utility",
						"",
						"----",
						"",
						"SYNOPSIS",
						"curl [url]",
						"openssl s_client [url]",
						"help",
						"",
						"----",
						"",
						"COMMANDS",
						`curl http://${domain}`,
						`curl https://${domain}`,
						`curl -v https://${domain}`,
						`curl -I https://${domain}`,
						`openssl s_client https://${domain}`,
						"help",
						"clear",
						"",
					];

					for (const line of helpLines) {
						addOutput(line, "output");
					}
				}, 100);
			}
			return;
		}
		if (!shouldShowTerminal && terminal.visible) {
			closeTerminal();
		}
	}, [
		addOutput,
		closeTerminal,
		openTerminal,
		shouldShowTerminal,
		terminal.visible,
		port80Domain,
		certificateDomain,
	]);

	const spaceAreas = useMemo(
		() => ({
			browser: "browser",
			"port-80": "port-80",
			letsencrypt: "letsencrypt",
			"port-443": "port-443",
		}),
		[],
	);
	const browserConfig = SPACE_CONFIGS[WEB_SSL_SPACE_IDS.browser];
	const port80SpaceConfig = SPACE_CONFIGS[WEB_SSL_SPACE_IDS.port80];
	const letsencryptConfig = SPACE_CONFIGS[WEB_SSL_SPACE_IDS.letsencrypt];
	const port443Config = SPACE_CONFIGS[WEB_SSL_SPACE_IDS.port443];
	const gridTemplateAreas = showSslSpaces
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
	const gridTemplateColumns = showSslSpaces
		? {
				base: "1fr",
				md: "repeat(2, minmax(min-content, 1fr))",
				lg: "repeat(4, minmax(min-content, 1fr))",
			}
		: {
				base: "1fr",
				md: "repeat(2, minmax(min-content, 1fr))",
				lg: "repeat(2, minmax(min-content, 1fr))",
			};

	useEffect(() => {
		if (!showSslSpaces) {
			return;
		}

		for (const item of SSL_SETUP_INVENTORY_ITEMS) {
			const currentSpaceId = findEntitySpace(state, item.id);
			if (currentSpaceId) {
				continue;
			}

			dispatch({
				type: "ENTITY_ADDED",
				payload: { entityId: item.id, spaceId: SSL_POOL_IDS.setup },
			});
		}
	}, [dispatch, showSslSpaces, state]);

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
				type: "ENTITY_ADDED",
				payload: { entityId: item.id, spaceId: SSL_POOL_IDS.certificates },
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
			domain: (entity: EntityData) => {
				const spaceId = findEntitySpace(state, entity.id);
				if (spaceId !== "letsencrypt") {
					return;
				}
				const issued = certificateIssued;
				const domainName = issued
					? certificateDomain || port80Domain || DEFAULT_DOMAIN
					: typeof entity.data?.domain === "string"
						? entity.data.domain
						: port80Domain || DEFAULT_DOMAIN;
				dispatch({
					type: "OPEN_MODAL",
					payload: buildCertificateRequestModal(entity.id, domainName, issued, {
						domain: port80Domain || DEFAULT_DOMAIN,
					}),
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
		(entity: EntityData) => {
			if (entity.type === "domain") {
				return findEntitySpace(state, entity.id) === "letsencrypt";
			}
			return [
				"browser",
				"webserver-80",
				"webserver-443",
				"index-html",
				"private-key",
				"certificate",
				"redirect-to-https",
			].includes(entity.type);
		},
		[state],
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

			if (entity.type === "domain" && spaceId === "letsencrypt") {
				const status: EntityStatus = certificateIssued ? "success" : "error";
				const domainName = certificateIssued
					? certificateDomain || port80Domain || DEFAULT_DOMAIN
					: typeof entity.data?.domain === "string"
						? entity.data.domain
						: port80Domain || DEFAULT_DOMAIN;
				const statusMessage = getSslStatusMessage(
					{
						id: entity.id,
						itemId: entity.id,
						type: entity.type,
						blockX: 0,
						blockY: 0,
						status,
						data: { domain: domainName },
					},
					spaceId,
				);
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
						{browserConfig ? (
							<GridItem area={spaceAreas.browser}>
								<GridSpace
									ctx={gameCtx}
									config={browserConfig}
									onEntityClick={handleEntityClick}
									isEntityClickable={isEntityClickable}
									getEntityLabel={(entity) => getSslItemLabel(entity.type)}
									getEntityStatus={getEntityStatus}
								/>
							</GridItem>
						) : null}
						{port80SpaceConfig ? (
							<GridItem area={spaceAreas["port-80"]}>
								<GridSpace
									ctx={gameCtx}
									config={port80SpaceConfig}
									onEntityClick={handleEntityClick}
									isEntityClickable={isEntityClickable}
									getEntityLabel={(entity) => getSslItemLabel(entity.type)}
									getEntityStatus={getEntityStatus}
								/>
							</GridItem>
						) : null}
						{showSslSpaces && letsencryptConfig ? (
							<GridItem area={spaceAreas.letsencrypt}>
								<GridSpace
									ctx={gameCtx}
									config={letsencryptConfig}
									onEntityClick={handleEntityClick}
									isEntityClickable={isEntityClickable}
									getEntityLabel={(entity) => getSslItemLabel(entity.type)}
									getEntityStatus={getEntityStatus}
								/>
							</GridItem>
						) : null}
						{showSslSpaces && port443Config ? (
							<GridItem area={spaceAreas["port-443"]}>
								<GridSpace
									ctx={gameCtx}
									config={port443Config}
									onEntityClick={handleEntityClick}
									isEntityClickable={isEntityClickable}
									getEntityLabel={(entity) => getSslItemLabel(entity.type)}
									getEntityStatus={getEntityStatus}
								/>
							</GridItem>
						) : null}
					</Grid>

					<ContextualHint />

					<DragOverlay getEntityLabel={getSslItemLabel} />
					<DrawerLayout drawerId={INVENTORY_DRAWER_ID}>
						<Flex direction="column" gap={3}>
							<PoolSpace ctx={gameCtx} config={INVENTORY_POOL_CONFIG} />
							<Box display={showSslSpaces ? "block" : "none"}>
								<PoolSpace ctx={gameCtx} config={SSL_SETUP_POOL_CONFIG} />
							</Box>
							<Box display={showSslItems ? "block" : "none"}>
								<PoolSpace ctx={gameCtx} config={SSL_ITEMS_POOL_CONFIG} />
							</Box>
						</Flex>
					</DrawerLayout>
				</GameBoard>

				<TerminalLayout
					visible={terminal.visible}
					focusRef={terminalInput.inputRef}
					view={
						<TerminalView
							history={terminal.history}
							prompt={terminal.prompt}
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
