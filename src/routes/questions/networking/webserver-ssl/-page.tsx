import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	ContextualHint,
	DragOverlay,
	DrawerLayout,
	GameBoard,
	GridSpace,
	Modal,
	PoolSpace,
	TerminalInput,
	TerminalLayout,
	TerminalView,
	useContextualHint,
	useDragEngine,
	useTerminalEngine,
	useTerminalInput,
	useTerminalStore,
} from "@/components/game/engine";
import {
	type BoardItemStatus,
	GameProvider,
	useDrawerManager,
	useGameCtx,
} from "@/components/game/engine/game-provider";
import {
	findEntitySpace,
	useQuestionRuntime,
} from "@/components/game/engine/runtime";
import type { EntityStatus } from "@/components/game/types/board";
import type { EntityData } from "@/components/game/types/entity";
import type { QuestionProps } from "@/components/module";

import {
	DEFAULT_DOMAIN,
	INVENTORY_POOL_CONFIG,
	QUESTION_DESCRIPTION,
	QUESTION_TITLE,
	SPACE_CONFIGS,
	SSL_ITEMS_POOL_CONFIG,
	SSL_POOL_IDS,
	SSL_SETUP_POOL_CONFIG,
	TERMINAL_INTRO_ENTRIES,
	TERMINAL_PROMPT,
} from "./-utils/constants";
import { SSL_DEFINITION } from "./-utils/definition";
import { getSslStatusMessage } from "./-utils/entity-badge";
import { getSslItemLabel } from "./-utils/entity-label";
import { getContextualHint } from "./-utils/get-contextual-hint";
import { useSslState } from "./-utils/use-ssl-state";

const INVENTORY_DRAWER_ID = "inventory-drawer";
const WEB_SSL_SPACE_IDS = {
	browser: "browser",
	port80: "port-80",
	letsencrypt: "letsencrypt",
	port443: "port-443",
} as const;

const toEntityStatus = (status: BoardItemStatus): EntityStatus =>
	status === "normal" ? undefined : status;

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
	const { state, behaviorContext, isCompleted, registerTerminalFinish } =
		useQuestionRuntime("webserver-ssl-page", SSL_DEFINITION);
	const gameCtx = useGameCtx();
	const terminalInput = useTerminalInput();
	const { terminal, openTerminal, closeTerminal, setPrompt, addEntry } =
		useTerminalStore();
	const shouldShowTerminal =
		state.phase === "terminal" || state.phase === "completed" || isCompleted;
	const {
		browserItems,
		browserStatus,
		certificateDomain,
		certificateIssued,
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

	// Navigate away when behavior signals completion
	useEffect(() => {
		if (behaviorContext.navigateAway) {
			_onQuestionComplete();
		}
	}, [behaviorContext.navigateAway, _onQuestionComplete]);

	const terminalEngine = useTerminalEngine({});
	registerTerminalFinish.current = terminalEngine.finish;

	useEffect(() => {
		if (httpReady) {
			setShowSslSpaces(true);
		}
	}, [httpReady]);

	useEffect(() => {
		if (certificateIssued) {
			setShowSslItems(true);
		}
	}, [certificateIssued]);

	useEffect(() => {
		setPrompt(TERMINAL_PROMPT);
		for (const entry of TERMINAL_INTRO_ENTRIES) {
			addEntry(entry);
		}
		closeTerminal();
	}, [addEntry, closeTerminal, setPrompt]);

	useEffect(() => {
		if (shouldShowTerminal && !terminal.visible) {
			openTerminal();
			return;
		}
		if (!shouldShowTerminal && terminal.visible) {
			closeTerminal();
		}
	}, [closeTerminal, openTerminal, shouldShowTerminal, terminal.visible]);

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
					status: toEntityStatus(browserStatus),
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
					status: toEntityStatus(port80Status),
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
					status: toEntityStatus(port443Status),
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
				const boardStatus: BoardItemStatus = certificateIssued
					? "success"
					: "error";
				const status = toEntityStatus(boardStatus);
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
						status: boardStatus,
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
