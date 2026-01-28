import { Box, Flex, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDragEngine, useTerminalEngine } from "@/components/game/engines";
import {
   GameProvider,
   type PlacedItem,
   useGameDispatch,
   useGameState,
} from "@/components/game/game-provider";
import { Modal } from "@/components/game/modal";
import { PuzzleBoard } from "@/components/game/puzzle/board";
import { DragOverlay, DragProvider } from "@/components/game/puzzle/drag";
import { InventoryDrawer } from "@/components/game/puzzle/inventory";
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
} from "@/components/game/question";

import {
   CANVAS_CONFIG,
   INVENTORY_GROUPS,
   QUESTION_DESCRIPTION,
   QUESTION_ID,
   QUESTION_TITLE,
   TERMINAL_INTRO_ENTRIES,
   TERMINAL_PROMPT,
} from "./-utils/constants";
import { getContextualHint } from "./-utils/get-contextual-hint";
import { INVENTORY_TOOLTIPS } from "./-utils/inventory-tooltips";
import {
   getNetworkingItemLabel,
   getNetworkingStatusMessage,
} from "./-utils/item-notification";
import {
   buildPcConfigModal,
   buildRouterConfigModal,
} from "./-utils/modal-builders";
import { useNetworkState } from "./-utils/use-network-state";
import { useNetworkingTerminal } from "./-utils/use-networking-terminal";

type DhcpConditionKey = "dragStatus" | "questionStatus";

const DHCP_SPEC_BASE: Omit<QuestionSpec<DhcpConditionKey>, "handlers"> = {
   meta: {
      id: QUESTION_ID,
      title: QUESTION_TITLE,
      description: QUESTION_DESCRIPTION,
   },
   init: {
      kind: "multi",
      payload: {
         questionId: QUESTION_ID,
         canvases: { [CANVAS_CONFIG.id]: CANVAS_CONFIG },
         inventoryGroups: INVENTORY_GROUPS,
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
         when: { kind: "eq", key: "dragStatus", value: "finished" },
         to: "terminal",
      },
      {
         kind: "set",
         when: { kind: "eq", key: "dragStatus", value: "started" },
         to: "playing",
      },
   ],
   labels: {
      getItemLabel: getNetworkingItemLabel,
      getStatusMessage: getNetworkingStatusMessage,
   },
};

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
   const terminalInput = useTerminalInput();
   const isCompleted = state.question.status === "completed";
   const dragEngine = useDragEngine();
   const networkState = useNetworkState({ dragEngine });

   const handleNetworkingCommand = useNetworkingTerminal({
      pc2Ip: networkState.pc2Ip,
      onQuestionComplete,
   });

   useTerminalEngine({
      onCommand: handleNetworkingCommand,
   });

   const itemClickHandlers = useMemo(
      () => ({
         router: ({ item }: { item: PlacedItem }) => {
            const placedItem = state.puzzle.placedItems.find(
               (entry) => entry.id === item.id,
            );
            const currentConfig = placedItem?.data ?? {};
            dispatch({
               type: "OPEN_MODAL",
               payload: buildRouterConfigModal(item.id, currentConfig),
            });
         },
         pc: ({ item }: { item: PlacedItem }) => {
            const placedItem = state.puzzle.placedItems.find(
               (entry) => entry.id === item.id,
            );
            const currentConfig = placedItem?.data ?? {};
            dispatch({
               type: "OPEN_MODAL",
               payload: buildPcConfigModal(item.id, currentConfig),
            });
         },
      }),
      [dispatch, state.puzzle.placedItems],
   );

   const spec = useMemo<QuestionSpec<DhcpConditionKey>>(
      () => ({
         ...DHCP_SPEC_BASE,
         handlers: {
            onCommand: handleNetworkingCommand,
            onItemClickByType: itemClickHandlers,
            isItemClickableByType: { router: true, pc: true },
         },
      }),
      [handleNetworkingCommand, itemClickHandlers],
   );

   useEffect(() => {
      if (initializedRef.current) {
         return;
      }

      initializedRef.current = true;
      dispatch({
         type: "INIT_MULTI_CANVAS",
         payload: spec.init.payload,
      });
   }, [dispatch, spec.init.payload]);

   useEffect(() => {
      const context: ConditionContext<DhcpConditionKey> = {
         dragStatus: dragEngine.progress.status,
         questionStatus: state.question.status,
      };
      const resolved = resolvePhase(
         spec.phaseRules,
         context,
         state.phase,
         "setup",
      );

      if (state.phase !== resolved.nextPhase) {
         dispatch({ type: "SET_PHASE", payload: { phase: resolved.nextPhase } });
      }
   }, [
      dispatch,
      dragEngine.progress.status,
      spec.phaseRules,
      state.phase,
      state.question.status,
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
         const handler = spec.handlers.onItemClickByType[item.type];
         if (handler) {
            handler({ item });
         }
      },
      [spec.handlers.onItemClickByType],
   );

   const isItemClickable = useCallback(
      (item: PlacedItem) => spec.handlers.isItemClickableByType[item.type] === true,
      [spec.handlers.isItemClickableByType],
   );

   return (
      <DragProvider>
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

            <Box flex="1">
               <PuzzleBoard
                  getItemLabel={spec.labels.getItemLabel}
                  getStatusMessage={spec.labels.getStatusMessage}
                  onPlacedItemClick={handlePlacedItemClick}
                  isItemClickable={isItemClickable}
               />
            </Box>

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
         <Modal />
         <DragOverlay getItemLabel={spec.labels.getItemLabel} />
      </Box>
      </DragProvider>
   );
};
