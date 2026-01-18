import { Box, Flex, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDragEngine, useTerminalEngine } from "@/components/game/engines";
import {
   type GamePhase,
   GameProvider,
   type PlacedItem,
   useGameDispatch,
   useGameState,
} from "@/components/game/game-provider";
import { GameShell } from "@/components/game/game-shell";
import { InventoryPanel } from "@/components/game/inventory-panel";
import { PlayCanvas } from "@/components/game/play-canvas";
import { TerminalPanel } from "@/components/game/terminal-panel";
import type { QuestionProps } from "@/components/module";

import {
   CANVAS_CONFIG,
   INVENTORY_ITEMS,
   QUESTION_DESCRIPTION,
   QUESTION_ID,
   QUESTION_TITLE,
   TERMINAL_PROMPT,
} from "./-utils/constants";
import { getContextualHint } from "./-utils/get-contextual-hint";
import { INVENTORY_TOOLTIPS } from "./-utils/inventory-tooltips";
import {
   getNetworkingItemLabel,
   getNetworkingStatusMessage,
} from "./-utils/item-formatters";
import {
   buildPcConfigModal,
   buildRouterConfigModal,
} from "./-utils/modal-builders";
import { useNetworkState } from "./-utils/use-network-state";
import { useNetworkingTerminal } from "./-utils/use-networking-terminal";

export const DhcpQuestion = ({ onQuestionComplete }: QuestionProps) => {
   return (
      <GameProvider>
         <NetworkingGame onQuestionComplete={onQuestionComplete} />
      </GameProvider>
   );
};

const NetworkingGame = ({
   onQuestionComplete,
}: {
   onQuestionComplete: () => void;
}) => {
   const dispatch = useGameDispatch();
   const state = useGameState();
   const initializedRef = useRef(false);

   useEffect(() => {
      if (initializedRef.current) {
         return;
      }

      initializedRef.current = true;
      dispatch({
         type: "INIT_QUESTION",
         payload: {
            questionId: QUESTION_ID,
            config: {
               canvas: CANVAS_CONFIG,
               inventory: INVENTORY_ITEMS,
               terminal: {
                  visible: false,
                  prompt: TERMINAL_PROMPT,
                  history: [],
               },
               phase: "setup",
               questionStatus: "in_progress",
            },
         },
      });
   }, [dispatch]);

   const dragEngine = useDragEngine();

   const networkState = useNetworkState({ dragEngine });

   const handleNetworkingCommand = useNetworkingTerminal({
      pc2Ip: networkState.pc2Ip,
      onQuestionComplete,
   });

   useTerminalEngine({
      onCommand: handleNetworkingCommand,
   });

   useEffect(() => {
      let desiredPhase: GamePhase = "setup";

      if (dragEngine.progress.status === "started") {
         desiredPhase = "playing";
      }

      if (dragEngine.progress.status === "finished") {
         desiredPhase = "terminal";
      }

      if (state.question.status === "completed") {
         desiredPhase = "completed";
      }

      if (state.phase !== desiredPhase) {
         dispatch({ type: "SET_PHASE", payload: { phase: desiredPhase } });
      }
   }, [
      dispatch,
      state.phase,
      state.question.status,
      dragEngine.progress.status,
   ]);

   const contextualHint = useMemo(
      () =>
         getContextualHint({
            placedItems: networkState.placedItems,
            connections: networkState.connections,
            router: networkState.network.router,
            pc1: networkState.network.pc1,
            pc2: networkState.network.pc2,
            connectedPcIds: networkState.network.connectedPcIds,
            routerConfigured: networkState.routerConfigured,
            dhcpEnabled: networkState.dhcpEnabled,
            startIp: networkState.startIp,
            endIp: networkState.endIp,
            routerSettingsOpen: networkState.routerSettingsOpen,
            pc1HasIp: networkState.pc1HasIp,
            pc2HasIp: networkState.pc2HasIp,
         }),
      [
         networkState.placedItems,
         networkState.connections,
         networkState.network.router,
         networkState.network.pc1,
         networkState.network.pc2,
         networkState.network.connectedPcIds,
         networkState.routerConfigured,
         networkState.dhcpEnabled,
         networkState.startIp,
         networkState.endIp,
         networkState.routerSettingsOpen,
         networkState.pc1HasIp,
         networkState.pc2HasIp,
      ],
   );

   const handlePlacedItemClick = useCallback(
      (item: PlacedItem) => {
         const placedItem = state.canvas.placedItems.find((p) => p.id === item.id);
         const currentConfig = placedItem?.data ?? {};

         if (item.type === "router") {
            dispatch({
               type: "OPEN_MODAL",
               payload: buildRouterConfigModal(item.id, currentConfig),
            });
            return;
         }

         if (item.type === "pc") {
            dispatch({
               type: "OPEN_MODAL",
               payload: buildPcConfigModal(item.id, currentConfig),
            });
         }
      },
      [dispatch, state.canvas.placedItems],
   );

   const isItemClickable = useCallback(
      (item: PlacedItem) => item.type === "router" || item.type === "pc",
      [],
   );

   return (
      <GameShell getItemLabel={getNetworkingItemLabel}>
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

            <Box flex="1">
               <PlayCanvas
                  getItemLabel={getNetworkingItemLabel}
                  getStatusMessage={getNetworkingStatusMessage}
                  onPlacedItemClick={handlePlacedItemClick}
                  isItemClickable={isItemClickable}
               />
            </Box>

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
