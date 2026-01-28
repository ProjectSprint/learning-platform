// Main question component for webserver-ssl
// Handles game logic, canvas visibility, and transitions

import { Box, Flex, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDragEngine, useTerminalEngine } from "@/components/game/engines";
import {
   type PlacedItem,
   type InventoryGroupConfig,
   GameProvider,
   useGameDispatch,
   useGameState,
} from "@/components/game/game-provider";
import { PuzzleBoard } from "@/components/game/puzzle/board";
import { InventoryDrawer } from "@/components/game/puzzle/inventory";
import { GameShell } from "@/components/game/shell";
import {
	TerminalInput,
	TerminalLayout,
	TerminalView,
	useTerminalInput,
} from "@/components/game/terminal";
import type { QuestionProps } from "@/components/module";
import {
   type ConditionContext,
   type QuestionSpec,
   resolvePhase,
   resolveVisibility,
} from "@/components/game/question";

import {
   BASIC_INVENTORY_ITEMS,
   CANVAS_CONFIGS,
   CANVAS_ORDER,
   QUESTION_DESCRIPTION,
   QUESTION_ID,
   QUESTION_TITLE,
   SSL_ITEMS_INVENTORY,
   SSL_SETUP_INVENTORY_ITEMS,
   TERMINAL_INTRO_ENTRIES,
   TERMINAL_PROMPT,
} from "./-utils/constants";
import { getContextualHint } from "./-utils/get-contextual-hint";
import { INVENTORY_TOOLTIPS } from "./-utils/inventory-tooltips";
import {
   buildCertificateInfoModal,
   buildCertificateRequestModal,
   buildIndexHtmlViewModal,
   buildPrivateKeyInfoModal,
   buildRedirectInfoModal,
   buildTlsHandshakeModal,
   buildWebserver443StatusModal,
   buildWebserver80StatusModal,
} from "./-utils/modal-builders";
import {
   getSslItemLabel,
   getSslStatusMessage,
} from "./-utils/item-notification";
import {
   CertificateProvider,
   useCertificateContext,
} from "./-utils/certificate-context";
import { useSslState } from "./-utils/use-ssl-state";
import { useSslTerminal } from "./-utils/use-ssl-terminal";

type WebserverSslConditionKey =
   | "questionStatus"
   | "httpReady"
   | "httpsReady"
   | "hasRedirect"
   | "browserStatus"
   | "certificateIssued"
   | "sslUnlocked";

export const WebserverSslQuestion = ({ onQuestionComplete }: QuestionProps) => {
   return (
      <GameProvider>
         <CertificateProvider>
            <WebserverSslGame onQuestionComplete={onQuestionComplete} />
         </CertificateProvider>
      </GameProvider>
   );
};

const WebserverSslGame = ({
   onQuestionComplete,
}: {
   onQuestionComplete: () => void;
}) => {
   const dispatch = useGameDispatch();
   const state = useGameState();
   const terminalInput = useTerminalInput();
   const { setCertificate } = useCertificateContext();
   const isCompleted = state.question.status === "completed";
   const initializedRef = useRef(false);
   const [prevSecureState, setPrevSecureState] = useState(false);
   const [sslCanvasesUnlocked, setSslCanvasesUnlocked] = useState(false);

   // Track which inventory groups have been shown to avoid redundant dispatches
   const inventoryShownRef = useRef({
      "ssl-setup": false,
      "ssl-items": false,
   });

   // Build inventory groups from items - ordered so newly visible groups appear above
   const inventoryGroups = useMemo<InventoryGroupConfig[]>(
      () => [
         {
            id: "ssl-setup",
            title: "SSL Setup",
            visible: false,
            items: SSL_SETUP_INVENTORY_ITEMS,
         },
         {
            id: "ssl-items",
            title: "SSL Certificate",
            visible: false,
            items: SSL_ITEMS_INVENTORY,
         },
         {
            id: "basic",
            title: "Basic Components",
            visible: true,
            items: BASIC_INVENTORY_ITEMS,
         },
      ],
      [],
   );

   const dragEngine = useDragEngine();

   // Get SSL game state
   const sslState = useSslState();

   // Handle terminal input
   const handleCommand = useSslTerminal({
      hasRedirect: sslState.hasRedirect,
      port80Domain: sslState.port80Domain,
      certificateDomain: sslState.certificateDomain,
      onQuestionComplete,
   });

   useTerminalEngine({
      onCommand: handleCommand,
   });

   const itemClickHandlers = useMemo(
      () => ({
         "webserver-80": ({ item }: { item: PlacedItem }) => {
            const status = item.data?.state as string | undefined;
            const domain = item.data?.domain as string | undefined;
            const servingFile = item.data?.servingFile as string | undefined;
            dispatch({
               type: "OPEN_MODAL",
               payload: buildWebserver80StatusModal(item.id, {
                  status,
                  domain,
                  servingFile,
               }),
            });
         },
         "webserver-443": ({ item }: { item: PlacedItem }) => {
            const status = item.data?.state as string | undefined;
            const domain = item.data?.domain as string | undefined;
            const privateKey = item.data?.privateKey as string | undefined;
            const certificate = item.data?.certificate as string | undefined;
            const servingFile = item.data?.servingFile as string | undefined;
            dispatch({
               type: "OPEN_MODAL",
               payload: buildWebserver443StatusModal(item.id, {
                  status,
                  domain,
                  privateKey,
                  certificate,
                  servingFile,
               }),
            });
         },
         domain: ({ item }: { item: PlacedItem }) => {
            const isInLetsencrypt = sslState.letsencryptCanvas?.placedItems.some(
               (entry) => entry.id === item.id,
            );

            if (!isInLetsencrypt) {
               return;
            }

            const currentDomain =
               typeof item.data?.domain === "string"
                  ? item.data.domain
                  : sslState.port80Domain;
            const certificateIssued = !!sslState.certificateIssued;

            dispatch({
               type: "OPEN_MODAL",
               payload: buildCertificateRequestModal(
                  item.id,
                  currentDomain || "",
                  certificateIssued,
                  { domain: sslState.port80Domain },
                  (domain) => setCertificate({ issued: true, domain }),
               ),
            });
         },
         "private-key": ({ item }: { item: PlacedItem }) => {
            dispatch({
               type: "OPEN_MODAL",
               payload: buildPrivateKeyInfoModal(item.id, true),
            });
         },
         certificate: ({ item }: { item: PlacedItem }) => {
            dispatch({
               type: "OPEN_MODAL",
               payload: buildCertificateInfoModal(
                  item.id,
                  sslState.port443SslStatus.hasCertificate,
               ),
            });
         },
         "redirect-to-https": ({ item }: { item: PlacedItem }) => {
            dispatch({
               type: "OPEN_MODAL",
               payload: buildRedirectInfoModal(item.id),
            });
         },
         "index-html": ({ item }: { item: PlacedItem }) => {
            dispatch({
               type: "OPEN_MODAL",
               payload: buildIndexHtmlViewModal(item.id),
            });
         },
      }),
      [
         dispatch,
         sslState.certificateIssued,
         sslState.letsencryptCanvas,
         sslState.port443SslStatus.hasCertificate,
         sslState.port80Domain,
      ],
   );

   const spec = useMemo<QuestionSpec<WebserverSslConditionKey>>(
      () => ({
         meta: {
            id: QUESTION_ID,
            title: QUESTION_TITLE,
            description: QUESTION_DESCRIPTION,
         },
         init: {
            kind: "multi",
            payload: {
               questionId: QUESTION_ID,
               canvases: CANVAS_CONFIGS,
               inventoryGroups,
               terminal: {
                  visible: false,
                  prompt: TERMINAL_PROMPT,
                  history: TERMINAL_INTRO_ENTRIES,
               },
               phase: "setup",
               questionStatus: "in_progress",
            },
         },
         phaseRules: [
            {
               kind: "set",
               when: { kind: "eq", key: "questionStatus", value: "completed" },
               to: "completed",
            },
            {
               kind: "set",
               when: {
                  kind: "and",
                  all: [
                     { kind: "flag", key: "httpsReady", is: true },
                     { kind: "flag", key: "hasRedirect", is: true },
                     { kind: "eq", key: "browserStatus", value: "success" },
                  ],
               },
               to: "terminal",
            },
            {
               kind: "set",
               when: {
                  kind: "and",
                  all: [
                     { kind: "flag", key: "httpReady", is: true },
                     { kind: "eq", key: "browserStatus", value: "warning" },
                  ],
               },
               to: "playing",
            },
         ],
         inventoryRules: [
            {
               kind: "show-group",
               groupId: "ssl-setup",
               when: {
                  kind: "and",
                  all: [
                     { kind: "flag", key: "httpReady", is: true },
                     { kind: "eq", key: "browserStatus", value: "warning" },
                  ],
               },
            },
            {
               kind: "show-group",
               groupId: "ssl-items",
               when: { kind: "flag", key: "certificateIssued", is: true },
            },
         ],
         canvasRules: [
            {
               kind: "show",
               puzzleId: "letsencrypt",
               when: {
                  kind: "or",
                  any: [
                     { kind: "flag", key: "httpReady", is: true },
                     { kind: "flag", key: "sslUnlocked", is: true },
                  ],
               },
            },
            {
               kind: "show",
               puzzleId: "port-443",
               when: {
                  kind: "or",
                  any: [
                     { kind: "flag", key: "httpReady", is: true },
                     { kind: "flag", key: "sslUnlocked", is: true },
                  ],
               },
            },
         ],
         labels: {
            getItemLabel: getSslItemLabel,
            getStatusMessage: getSslStatusMessage,
         },
         handlers: {
            onCommand: handleCommand,
            onItemClickByType: itemClickHandlers,
            isItemClickableByType: {
               "webserver-80": true,
               "webserver-443": true,
               domain: true,
               "private-key": true,
               certificate: true,
               "redirect-to-https": true,
               "index-html": true,
            },
         },
      }),
      [handleCommand, inventoryGroups, itemClickHandlers],
   );

   // Initialize multi-canvas question
   useEffect(() => {
      if (initializedRef.current) {
         return;
      }

      initializedRef.current = true;
      dispatch({
         type: "INIT_MULTI_CANVAS",
         payload: spec.init.payload,
      });
   }, [dispatch, spec.init.payload]); // inventoryGroups only depends on constants

   // Phase transitions and inventory group visibility
   useEffect(() => {
      if (!dragEngine) return;
      if (state.question.status === "completed") return;

      const context: ConditionContext<WebserverSslConditionKey> = {
         questionStatus: state.question.status,
         httpReady: sslState.httpReady,
         httpsReady: sslState.httpsReady,
         hasRedirect: sslState.hasRedirect,
         browserStatus: sslState.browserStatus,
         certificateIssued: sslState.certificateIssued,
         sslUnlocked: sslCanvasesUnlocked,
      };

      const resolved = resolvePhase(
         spec.phaseRules,
         context,
         state.phase,
         "setup",
      );

      if (sslState.httpReady && sslState.browserStatus === "warning") {
         if (!sslCanvasesUnlocked) {
            setSslCanvasesUnlocked(true);
         }
      }

      if (spec.inventoryRules) {
         const shouldShowSslSetup = resolveVisibility(
            spec.inventoryRules,
            context,
            "ssl-setup",
            inventoryShownRef.current["ssl-setup"],
         );
         if (shouldShowSslSetup && !inventoryShownRef.current["ssl-setup"]) {
            inventoryShownRef.current["ssl-setup"] = true;
            dispatch({
               type: "UPDATE_INVENTORY_GROUP",
               payload: { id: "ssl-setup", visible: true },
            });
         }

         const shouldShowSslItems = resolveVisibility(
            spec.inventoryRules,
            context,
            "ssl-items",
            inventoryShownRef.current["ssl-items"],
         );
         if (shouldShowSslItems && !inventoryShownRef.current["ssl-items"]) {
            inventoryShownRef.current["ssl-items"] = true;
            dispatch({
               type: "UPDATE_INVENTORY_GROUP",
               payload: { id: "ssl-items", visible: true },
            });
         }
      }

      let desiredPhase = resolved.nextPhase;
      if (sslCanvasesUnlocked && desiredPhase === "setup") {
         desiredPhase = state.phase;
      }

      if (state.phase !== desiredPhase) {
         dispatch({ type: "SET_PHASE", payload: { phase: desiredPhase } });
      }
   }, [
      dispatch,
      spec.inventoryRules,
      spec.phaseRules,
      state.phase,
      state.question.status,
      sslState.httpReady,
      sslState.browserStatus,
      sslState.certificateIssued,
      sslState.httpsReady,
      sslState.hasRedirect,
      sslCanvasesUnlocked,
      dragEngine,
   ]);

   // Show TLS handshake modal when browser transitions to secure
   useEffect(() => {
      if (
         !prevSecureState &&
         sslState.browserStatus === "success" &&
         sslState.httpsReady &&
         sslState.hasRedirect
      ) {
         // Browser just became secure - show TLS handshake
         dispatch({
            type: "OPEN_MODAL",
            payload: buildTlsHandshakeModal(),
         });
      }
      setPrevSecureState(
         sslState.browserStatus === "success" &&
         sslState.httpsReady &&
         sslState.hasRedirect,
      );
   }, [
      dispatch,
      prevSecureState,
      sslState.browserStatus,
      sslState.httpsReady,
      sslState.hasRedirect,
   ]);

   // Contextual hint
   const contextualHint = useMemo(
      () =>
         getContextualHint({
            browserCanvas: sslState.browserCanvas,
            port80Canvas: sslState.port80Canvas,
            letsencryptCanvas: sslState.letsencryptCanvas,
            port443Canvas: sslState.port443Canvas,
            allPlacedItems: sslState.allPlacedItems,
            httpReady: sslState.httpReady,
            httpsReady: sslState.httpsReady,
            certificateIssued: sslState.certificateIssued,
            browserStatus: sslState.browserStatus,
            letsencryptModalOpen: sslState.letsencryptModalOpen,
         }),
      [
         sslState.browserCanvas,
         sslState.port80Canvas,
         sslState.letsencryptCanvas,
         sslState.port443Canvas,
         sslState.allPlacedItems,
         sslState.httpReady,
         sslState.httpsReady,
         sslState.certificateIssued,
         sslState.browserStatus,
         sslState.letsencryptModalOpen,
      ],
   );

   // Item click handler
   const handlePlacedItemClick = useCallback(
      (item: PlacedItem) => {
         const handler = spec.handlers.onItemClickByType[item.type];
         if (handler) {
            handler({ item });
         }
      },
      [spec.handlers.onItemClickByType],
   );

   // Check if item is clickable
   const isItemClickable = useCallback(
      (item: PlacedItem) =>
         spec.handlers.isItemClickableByType[item.type] === true,
      [spec.handlers.isItemClickableByType],
   );

   // Canvas visibility logic
   const shouldShowCanvas = useCallback(
      (key: string) => {
         const context: ConditionContext<WebserverSslConditionKey> = {
            questionStatus: state.question.status,
            httpReady: sslState.httpReady,
            httpsReady: sslState.httpsReady,
            hasRedirect: sslState.hasRedirect,
            browserStatus: sslState.browserStatus,
            certificateIssued: sslState.certificateIssued,
            sslUnlocked: sslCanvasesUnlocked,
         };

         const defaultVisible = key === "browser" || key === "port-80";
         if (!spec.canvasRules) {
            return defaultVisible;
         }

         return resolveVisibility(spec.canvasRules, context, key, defaultVisible);
      },
      [
         spec.canvasRules,
         sslCanvasesUnlocked,
         sslState.browserStatus,
         sslState.certificateIssued,
         sslState.hasRedirect,
         sslState.httpReady,
         sslState.httpsReady,
         state.question.status,
      ],
   );

	return (
		<GameShell getItemLabel={spec.labels.getItemLabel}>
         <Flex
            direction="column"
            px={{ base: 2, md: 12, lg: 24 }}
            py={{ base: 2, md: 6 }}
         >
            <Box textAlign="left" mb={{ base: 2, md: 4 }} pb={{ base: 1, md: 0 }}>
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

            <Flex
               direction={{ base: "column", xl: "row" }}
               gap={{ base: 2, md: 4 }}
               align={{ base: "stretch", xl: "flex-start" }}
            >
               {CANVAS_ORDER.map((key) => {
                  if (!shouldShowCanvas(key)) {
                     return null;
                  }

                  const config = CANVAS_CONFIGS[key as keyof typeof CANVAS_CONFIGS];
                  if (!config) {
                     return null;
                  }

                  const canvasId = config.puzzleId ?? key;

                  return (
                     <Box
                        key={key}
                        flexGrow={config.columns}
                        flexBasis={0}
                        minW={{ base: "100%", xl: "0" }}
                     >
						<PuzzleBoard
							puzzleId={canvasId}
							title={config.title ?? key}
							getItemLabel={spec.labels.getItemLabel}
							getStatusMessage={spec.labels.getStatusMessage}
							onPlacedItemClick={handlePlacedItemClick}
							isItemClickable={isItemClickable}
						/>
                     </Box>
                  );
               })}
            </Flex>

			<InventoryDrawer tooltips={INVENTORY_TOOLTIPS} />

            {contextualHint && (
               <Box
                  bg="gray.800"
                  border="1px solid"
                  borderColor="gray.700"
                  borderRadius="md"
                  px={4}
                  py={2}
                  textAlign="center"
                  mb={4}
               >
                  <Text fontSize="sm" color="gray.100">
                     {contextualHint}
                  </Text>
               </Box>
            )}

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
      </GameShell>
   );
};
