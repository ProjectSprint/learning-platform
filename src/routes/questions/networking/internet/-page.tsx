import { Box, Flex, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDragEngine, useTerminalEngine } from "@/components/game/engines";
import {
   GameProvider,
   type PlacedItem,
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
} from "@/components/game/question";

import {
   CANVAS_CONFIGS,
   CANVAS_ORDER,
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
   getInternetItemLabel,
   getInternetStatusMessage,
} from "./-utils/item-notification";
import {
   buildDnsStatusModal,
   buildGoogleStatusModal,
   buildIgwStatusModal,
   buildPcStatusModal,
   buildRouterLanConfigModal,
   buildRouterNatConfigModal,
   buildRouterWanConfigModal,
} from "./-utils/modal-builders";
import { useInternetState } from "./-utils/use-internet-state";
import { useInternetTerminal } from "./-utils/use-internet-terminal";

type InternetConditionKey =
   | "questionStatus"
   | "dragStatus"
   | "allDevicesPlaced";

const INTERNET_SPEC_BASE: Omit<QuestionSpec<InternetConditionKey>, "handlers"> = {
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
         when: { kind: "eq", key: "allDevicesPlaced", value: true },
         to: "configuring",
      },
      {
         kind: "set",
         when: { kind: "eq", key: "dragStatus", value: "started" },
         to: "playing",
      },
      {
         kind: "set",
         when: { kind: "eq", key: "dragStatus", value: "finished" },
         to: "terminal",
      },
      {
         kind: "set",
         when: { kind: "eq", key: "questionStatus", value: "completed" },
         to: "completed",
      },
   ],
   labels: {
      getItemLabel: getInternetItemLabel,
      getStatusMessage: getInternetStatusMessage,
   },
};

export const InternetQuestion = ({ onQuestionComplete }: QuestionProps) => {
   return (
      <GameProvider>
         <InternetGame onQuestionComplete={onQuestionComplete} />
      </GameProvider>
   );
};

const InternetGame = ({
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
   const internetState = useInternetState({ dragEngine });
   const placedItemById = useMemo(() => {
      const map = new Map<string, PlacedItem>();
      for (const entry of internetState.placedItems) {
         map.set(entry.id, entry);
      }
      return map;
   }, [internetState.placedItems]);

   const itemClickHandlers = useMemo(
      () => ({
         "router-lan": ({ item }: { item: PlacedItem }) => {
            const placedItem = placedItemById.get(item.id);
            const currentConfig = placedItem?.data ?? {};
            dispatch({
               type: "OPEN_MODAL",
               payload: buildRouterLanConfigModal(item.id, currentConfig),
            });
         },
         "router-nat": ({ item }: { item: PlacedItem }) => {
            const placedItem = placedItemById.get(item.id);
            const currentConfig = placedItem?.data ?? {};
            dispatch({
               type: "OPEN_MODAL",
               payload: buildRouterNatConfigModal(item.id, currentConfig),
            });
         },
         "router-wan": ({ item }: { item: PlacedItem }) => {
            const placedItem = placedItemById.get(item.id);
            const currentConfig = placedItem?.data ?? {};
            dispatch({
               type: "OPEN_MODAL",
               payload: buildRouterWanConfigModal(item.id, currentConfig),
            });
         },
         pc: ({ item }: { item: PlacedItem }) => {
            const placedItem = placedItemById.get(item.id);
            const currentConfig = placedItem?.data ?? {};
            dispatch({
               type: "OPEN_MODAL",
               payload: buildPcStatusModal(item.id, {
                  ip:
                     typeof currentConfig.ip === "string"
                        ? currentConfig.ip
                        : undefined,
                  status: internetState.googleReachable
                     ? "Connected to internet"
                     : "Waiting for connection",
               }),
            });
         },
         igw: ({ item }: { item: PlacedItem }) => {
            dispatch({
               type: "OPEN_MODAL",
               payload: buildIgwStatusModal(item.id, {
                  status: internetState.hasValidPppoeCredentials
                     ? "Authenticated"
                     : "Waiting for authentication",
               }),
            });
         },
         dns: ({ item }: { item: PlacedItem }) => {
            dispatch({
               type: "OPEN_MODAL",
               payload: buildDnsStatusModal(item.id, {
                  ip: internetState.dnsServer ?? undefined,
                  status: internetState.hasValidDnsServer ? "Active" : "Unreachable",
               }),
            });
         },
         google: ({ item }: { item: PlacedItem }) => {
            let reason: string | undefined;
            if (!internetState.hasValidDnsServer) {
               reason = "DNS not configured";
            } else if (!internetState.natEnabled) {
               reason = "NAT disabled";
            } else if (!internetState.hasValidPppoeCredentials) {
               reason = "WAN not connected";
            }

            dispatch({
               type: "OPEN_MODAL",
               payload: buildGoogleStatusModal(item.id, {
                  domain: "google.com",
                  ip: internetState.googleReachable
                     ? internetState.googleIp
                     : undefined,
                  status: internetState.googleReachable ? "Reachable" : "Unreachable",
                  reason,
               }),
            });
         },
      }),
      [
         dispatch,
         internetState.dnsServer,
         internetState.googleIp,
         internetState.googleReachable,
         internetState.hasValidDnsServer,
         internetState.hasValidPppoeCredentials,
         internetState.natEnabled,
         placedItemById,
      ],
   );

   const handleInternetCommand = useInternetTerminal({
      pcIp: internetState.pcIp,
      dnsConfigured: internetState.hasValidDnsServer,
      natEnabled: internetState.natEnabled,
      wanConnected: internetState.hasValidPppoeCredentials,
      onQuestionComplete,
   });

   useTerminalEngine({
      onCommand: handleInternetCommand,
   });

   const spec = useMemo<QuestionSpec<InternetConditionKey>>(
      () => ({
         ...INTERNET_SPEC_BASE,
         handlers: {
            onCommand: handleInternetCommand,
            onItemClickByType: itemClickHandlers,
            isItemClickableByType: {
               "router-lan": true,
               "router-nat": true,
               "router-wan": true,
               pc: true,
               igw: true,
               dns: true,
               google: true,
            },
         },
      }),
      [handleInternetCommand, itemClickHandlers],
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
      const context: ConditionContext<InternetConditionKey> = {
         dragStatus: dragEngine.progress.status,
         questionStatus: state.question.status,
         allDevicesPlaced: internetState.allDevicesPlaced,
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
      internetState.allDevicesPlaced,
      spec.phaseRules,
      state.phase,
      state.question.status,
   ]);

   const contextualHint = useMemo(
      () =>
         getContextualHint({
            placedItems: internetState.placedItems,
            connections: internetState.connections,
            pc: internetState.network.pc,
            cable: internetState.network.cable,
            routerLan: internetState.network.routerLan,
            routerNat: internetState.network.routerNat,
            routerWan: internetState.network.routerWan,
            fiber: internetState.network.fiber,
            igw: internetState.network.igw,
            dns: internetState.network.dns,
            google: internetState.network.google,
            allDevicesPlaced: internetState.allDevicesPlaced,
            routerLanConfigured: internetState.routerLanConfigured,
            routerNatConfigured: internetState.routerNatConfigured,
            routerWanConfigured: internetState.hasValidPppoeCredentials,
            routerLanSettingsOpen: internetState.routerLanSettingsOpen,
            routerNatSettingsOpen: internetState.routerNatSettingsOpen,
            routerWanSettingsOpen: internetState.routerWanSettingsOpen,
            dhcpEnabled: internetState.dhcpEnabled,
            natEnabled: internetState.natEnabled,
            startIp: internetState.startIp,
            endIp: internetState.endIp,
            dnsServer: internetState.dnsServer,
            connectionType: internetState.connectionType,
            pppoeUsername: internetState.username,
            pppoePassword: internetState.password,
            pcHasIp: internetState.pcHasIp,
            googleReachable: internetState.googleReachable,
         }),
      [
         internetState.placedItems,
         internetState.connections,
         internetState.network.pc,
         internetState.network.cable,
         internetState.network.routerLan,
         internetState.network.routerNat,
         internetState.network.routerWan,
         internetState.network.fiber,
         internetState.network.igw,
         internetState.network.dns,
         internetState.network.google,
         internetState.allDevicesPlaced,
         internetState.routerLanConfigured,
         internetState.routerNatConfigured,
         internetState.hasValidPppoeCredentials,
         internetState.routerLanSettingsOpen,
         internetState.routerNatSettingsOpen,
         internetState.routerWanSettingsOpen,
         internetState.dhcpEnabled,
         internetState.natEnabled,
         internetState.startIp,
         internetState.endIp,
         internetState.dnsServer,
         internetState.connectionType,
         internetState.username,
         internetState.password,
         internetState.pcHasIp,
         internetState.googleReachable,
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
                  const config = CANVAS_CONFIGS[key];
                  const title = config.title ?? key;

                  return (
                     <Box
                        key={key}
                        flexGrow={config.columns}
                        flexBasis={0}
                        minW={{ base: "100%", xl: "0" }}
                     >
                        <PuzzleBoard
                           puzzleId={key}
                           title={title}
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
