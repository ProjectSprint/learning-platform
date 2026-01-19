// Main question component for webserver-ssl
// Handles game logic, canvas visibility, and transitions

import type { GamePhase } from "@/components/game/game-provider";
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
import { GameShell } from "@/components/game/game-shell";
import { InventoryPanel } from "@/components/game/inventory-panel";
import { PlayCanvas } from "@/components/game/play-canvas";
import { TerminalPanel } from "@/components/game/terminal-panel";
import type { QuestionProps } from "@/components/module";

import {
   BASIC_INVENTORY_ITEMS,
   CANVAS_CONFIGS,
   CANVAS_ORDER,
   QUESTION_DESCRIPTION,
   QUESTION_ID,
   QUESTION_TITLE,
   SSL_ITEMS_INVENTORY,
   SSL_SETUP_INVENTORY_ITEMS,
   TERMINAL_PROMPT,
} from "./-utils/constants";
import { getContextualHint } from "./-utils/get-contextual-hint";
import { INVENTORY_TOOLTIPS } from "./-utils/inventory-tooltips";
import {
   buildBrowserStatusModal,
   buildCertificateInfoModal,
   buildCertificateRequestModal,
   buildIndexHtmlViewModal,
   buildPrivateKeyInfoModal,
   buildRedirectInfoModal,
   buildTlsHandshakeModal,
   buildWebserver443StatusModal,
   buildWebserver80StatusModal,
} from "./-utils/modal-builders";
import { getSslItemLabel, getSslStatusMessage } from "./-utils/item-formatters";
import { useSslState } from "./-utils/use-ssl-state";
import { useSslTerminal } from "./-utils/use-ssl-terminal";

export const WebserverSslQuestion = ({ onQuestionComplete }: QuestionProps) => {
   return (
      <GameProvider>
         <WebserverSslGame onQuestionComplete={onQuestionComplete} />
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
	const initializedRef = useRef(false);
	const [showTlsModal, setShowTlsModal] = useState(false);
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

   // Initialize multi-canvas question
   useEffect(() => {
      if (initializedRef.current) {
         return;
      }

      initializedRef.current = true;
      dispatch({
         type: "INIT_MULTI_CANVAS",
         payload: {
            questionId: QUESTION_ID,
            canvases: CANVAS_CONFIGS,
            inventoryGroups,
            terminal: {
               visible: false,
               prompt: TERMINAL_PROMPT,
               history: [],
            },
            phase: "setup",
            questionStatus: "in_progress",
         },
      });
   }, [dispatch]); // inventoryGroups only depends on constants

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

   // Phase transitions and inventory group visibility
   useEffect(() => {
      if (!dragEngine) return;
      if (state.question.status === "completed") return;

      let desiredPhase: GamePhase = "setup";

		// setup -> playing: after browser + port-80 configured
		if (sslState.httpReady && sslState.browserStatus === "warning") {
			desiredPhase = "playing";
			if (!sslCanvasesUnlocked) {
				setSslCanvasesUnlocked(true);
			}
		}

      // Show SSL Setup inventory when HTTP works
      if (sslState.httpReady && sslState.browserStatus === "warning") {
         if (!inventoryShownRef.current["ssl-setup"]) {
            inventoryShownRef.current["ssl-setup"] = true;
            dispatch({
               type: "UPDATE_INVENTORY_GROUP",
               payload: { id: "ssl-setup", visible: true },
            });
         }
      }

      // Show SSL items when certificate is issued
      if (sslState.certificateIssued) {
         if (!inventoryShownRef.current["ssl-items"]) {
            inventoryShownRef.current["ssl-items"] = true;
            dispatch({
               type: "UPDATE_INVENTORY_GROUP",
               payload: { id: "ssl-items", visible: true },
            });
         }
      }

      // playing -> terminal: when HTTPS is ready and redirect is configured
      if (
         sslState.httpsReady &&
         sslState.hasRedirect &&
			sslState.browserStatus === "success"
		) {
			desiredPhase = "terminal";
		}

		if (sslCanvasesUnlocked && desiredPhase === "setup") {
			desiredPhase = state.phase;
		}

		if (state.phase !== desiredPhase) {
			dispatch({ type: "SET_PHASE", payload: { phase: desiredPhase } });
		}
   }, [
      dispatch,
      state.phase,
      state.question.status,
      sslState.httpReady,
      sslState.browserStatus,
      sslState.certificateIssued,
      sslState.httpsReady,
      sslState.hasRedirect,
      sslCanvasesUnlocked,
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
         setShowTlsModal(true);
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
         // Browser click - show status
         if (item.type === "browser") {
            const url = item.data?.url as string | undefined;
            const connection = item.data?.connection as string | undefined;
            const port = item.data?.port as string | undefined;
            dispatch({
               type: "OPEN_MODAL",
               payload: buildBrowserStatusModal(
                  item.id,
                  { url, connection, port },
                  showTlsModal && sslState.browserStatus === "success",
               ),
            });
            return;
         }

         // Webserver 80 click - show status
         if (item.type === "webserver-80") {
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
            return;
         }

         // Webserver 443 click - show status
         if (item.type === "webserver-443") {
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
            return;
         }

         // Domain (SSL) click - show certificate request modal if in letsencrypt canvas
         if (item.type === "domain-ssl") {
            // Check if this domain is in the letsencrypt canvas
            const isInLetsencrypt = sslState.letsencryptCanvas?.placedItems.some(
               (i) => i.id === item.id,
            );

            if (isInLetsencrypt) {
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
                  ),
               });
               return;
            }
         }

         // Private key click - show info
         if (item.type === "private-key") {
            dispatch({
               type: "OPEN_MODAL",
               payload: buildPrivateKeyInfoModal(item.id, true),
            });
            return;
         }

         // Certificate click - show info
         if (item.type === "certificate") {
            dispatch({
               type: "OPEN_MODAL",
               payload: buildCertificateInfoModal(
                  item.id,
                  sslState.port443SslStatus.hasCertificate,
               ),
            });
            return;
         }

         // Redirect click - show info
         if (item.type === "redirect-to-https") {
            dispatch({
               type: "OPEN_MODAL",
               payload: buildRedirectInfoModal(item.id),
            });
            return;
         }

         // index.html click - show content
         if (item.type === "index-html") {
            dispatch({
               type: "OPEN_MODAL",
               payload: buildIndexHtmlViewModal(item.id),
            });
            return;
         }
      },
      [
         dispatch,
         showTlsModal,
         sslState.browserStatus,
         sslState.port80Domain,
         sslState.port443SslStatus,
         sslState.certificateIssued,
         sslState.letsencryptCanvas,
      ],
   );

   // Check if item is clickable
   const isItemClickable = useCallback(
      (item: PlacedItem) =>
         [
            "browser",
            "webserver-80",
            "webserver-443",
            "domain",
            "domain-ssl",
            "private-key",
            "certificate",
            "redirect-to-https",
            "index-html",
         ].includes(item.type),
      [],
   );

   // Canvas visibility logic
   const shouldShowCanvas = useCallback(
      (key: string) => {
         // browser and port-80 always visible
         if (key === "browser" || key === "port-80") {
            return true;
         }
         // let's encrypt and port-443 appear when HTTP works
		if (
			(key === "letsencrypt" || key === "port-443") &&
			(sslState.httpReady || sslCanvasesUnlocked)
		) {
			return true;
		}
		return false;
	},
	[sslState.httpReady, sslCanvasesUnlocked],
	);

   // Canvas title mapping
   const getCanvasTitle = useCallback((key: string) => {
      switch (key) {
         case "browser":
            return "Browser";
         case "port-80":
            return "Port 80 (HTTP)";
         case "letsencrypt":
            return "Let's Encrypt";
         case "port-443":
            return "Port 443 (HTTPS)";
         default:
            return key;
      }
   }, []);

   return (
      <GameShell getItemLabel={getSslItemLabel}>
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

                  const stateKey = config.stateKey ?? key;

                  return (
                     <Box
                        key={key}
                        flexGrow={config.columns}
                        flexBasis={0}
                        minW={{ base: "100%", xl: "0" }}
                     >
                        <PlayCanvas
                           stateKey={stateKey}
                           title={getCanvasTitle(key)}
                           getItemLabel={getSslItemLabel}
                           getStatusMessage={getSslStatusMessage}
                           onPlacedItemClick={handlePlacedItemClick}
                           isItemClickable={isItemClickable}
                        />
                     </Box>
                  );
               })}
            </Flex>

            <Box alignSelf="center" my={4}>
               <InventoryPanel tooltips={INVENTORY_TOOLTIPS} />
            </Box>

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

            <TerminalPanel />
         </Flex>
      </GameShell>
   );
};
