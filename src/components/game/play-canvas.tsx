import { Box, Flex, Text, useBreakpointValue } from "@chakra-ui/react";
import { Icon } from "@iconify/react";
import { gsap } from "gsap";
import {
   memo,
   useCallback,
   useEffect,
   useLayoutEffect,
   useMemo,
   useRef,
   useState,
} from "react";
import { useDragContext } from "./drag-context";
import type { ActiveDrag, DragData } from "./drag-types";
import {
   type Block,
   findInventoryItem,
   type PlacedItem,
   useGameDispatch,
   useGameState,
} from "./game-provider";
import {
   convertPixelToBlock,
   createDraggable,
   type DragHandle,
   ensureGsapPlugins,
   type GridMetrics,
   hitTestAny,
} from "./gsap-drag";

const BLOCK_HEIGHT = 60;

type ItemLabelGetter = (itemType: string) => string;
type StatusMessageGetter = (placedItem: PlacedItem) => string | null;
type PlacedItemClickHandler = (placedItem: PlacedItem) => void;
type ItemClickableCheck = (placedItem: PlacedItem) => boolean;

type PlayCanvasProps = {
   stateKey?: string;
   title?: string;
   getItemLabel?: ItemLabelGetter;
   getStatusMessage?: StatusMessageGetter;
   onPlacedItemClick?: PlacedItemClickHandler;
   isItemClickable?: ItemClickableCheck;
};

type DragPreview = {
   itemId: string;
   itemType: string;
   blockX: number;
   blockY: number;
   x: number;
   y: number;
   width: number;
   height: number;
   valid: boolean;
};

const defaultGetItemLabel: ItemLabelGetter = (itemType: string) => {
   return itemType.charAt(0).toUpperCase() + itemType.slice(1);
};

const defaultGetStatusMessage: StatusMessageGetter = () => {
   return null;
};

const defaultIsItemClickable: ItemClickableCheck = () => true;

const GridCell = memo(
   ({
      borderColor,
      showBorder,
      isOccupied,
      height,
   }: {
      borderColor: string;
      showBorder: boolean;
      isOccupied: boolean;
      height: number;
   }) => {
      const borderStyle = showBorder ? "dashed" : "solid";
      const resolvedBorderColor = showBorder ? borderColor : "transparent";

      return (
         <Box
            border={`1px ${borderStyle}`}
            borderColor={resolvedBorderColor}
            borderRadius="md"
            bg="transparent"
            height={`${height}px`}
            transition="border-color 0.15s ease"
            data-occupied={isOccupied}
         />
      );
   },
   (prev, next) =>
      prev.borderColor === next.borderColor &&
      prev.showBorder === next.showBorder &&
      prev.isOccupied === next.isOccupied,
);

const PlacedItemCard = memo(
   ({
      item,
      x,
      y,
      width,
      height,
      isDragging,
      getItemLabel,
      getStatusMessage,
      itemRef,
   }: {
      item: PlacedItem;
      x: number;
      y: number;
      width: number;
      height: number;
      isDragging: boolean;
      getItemLabel: ItemLabelGetter;
      getStatusMessage: StatusMessageGetter;
      itemRef: React.RefCallback<HTMLDivElement>;
   }) => {
      const label = getItemLabel(item.type);
      const statusMessage = getStatusMessage(item);
      const iconInfo = item.icon;

      const getStatusBadgeColor = () => {
         if (item.status === "error") return "red.600";
         if (item.status === "warning") return "yellow.600";
         if (item.status === "success") return "green.600";
         return "gray.600";
      };

      const getBorderColor = () => {
         const isConnectable = item.behavior === "connectable";

         if (isConnectable) {
            if (item.status === "success") return "cyan.warning";
            if (item.status === "warning") return "yellow.500";
            if (item.status === "error") return "red.500";
            return "gray.500";
         }
         return "cyan.500";
      };

      return (
         <Box
            ref={itemRef}
            position="absolute"
            top={`${y}px`}
            left={`${x}px`}
            width={`${width}px`}
            height={`${height}px`}
            bg="gray.800"
            border="1px solid"
            borderColor={getBorderColor()}
            borderRadius="md"
            display="flex"
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            gap={2}
            px={3}
            cursor="grab"
            zIndex={isDragging ? 9999 : 1}
            style={{ touchAction: "none" }}
            aria-label={`${label}${statusMessage ? `: ${statusMessage}` : ""}`}
         >
            {iconInfo && (
               <Icon
                  icon={iconInfo.icon}
                  width={20}
                  height={20}
                  color={iconInfo.color}
               />
            )}
            <Text fontSize="xs" fontWeight="bold" color="gray.100">
               {label}
            </Text>

            {statusMessage && (
               <Box
                  position="absolute"
                  top="-8px"
                  right="-8px"
                  fontSize="9px"
                  px={1.5}
                  py={0.5}
                  borderRadius="full"
                  bg={getStatusBadgeColor()}
                  color="white"
                  fontWeight="medium"
                  boxShadow="sm"
                  whiteSpace="nowrap"
               >
                  {statusMessage}
               </Box>
            )}
         </Box>
      );
   },
   (prev, next) =>
      prev.item.id === next.item.id &&
      prev.item.status === next.item.status &&
      prev.item.data?.ip === next.item.data?.ip &&
      prev.item.data?.tcpState === next.item.data?.tcpState &&
      prev.item.data?.seqEnabled === next.item.data?.seqEnabled &&
      prev.item.data?.ack === next.item.data?.ack &&
      prev.x === next.x &&
      prev.y === next.y &&
      prev.width === next.width &&
      prev.height === next.height &&
      prev.isDragging === next.isDragging,
);

export const PlayCanvas = ({
   stateKey,
   title,
   getItemLabel = defaultGetItemLabel,
   getStatusMessage = defaultGetStatusMessage,
   onPlacedItemClick,
   isItemClickable = defaultIsItemClickable,
}: PlayCanvasProps) => {
   const state = useGameState();
   const dispatch = useGameDispatch();
   const { activeDrag, setActiveDrag, proxyRef, targetCanvasKeyRef } =
      useDragContext();
   const canvas = stateKey
      ? (state.canvases?.[stateKey] ?? state.canvas)
      : state.canvas;
   const canvasKey =
      stateKey ?? canvas.config.stateKey ?? canvas.config.id ?? "default";
   const canvasRef = useRef<HTMLDivElement | null>(null);
   const activeDragRef = useRef<ActiveDrag | null>(null);
   const placedItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
   const draggablesRef = useRef<DragHandle[]>([]);
   const callbacksRef = useRef<{
      canPlaceItemAt: (
         data: DragData,
         target: { blockX: number; blockY: number },
      ) => boolean;
      placeOrRepositionItem: (
         data: DragData,
         target: { blockX: number; blockY: number },
      ) => boolean;
   } | null>(null);
   const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
   const [hoveredBlock, setHoveredBlock] = useState<{
      x: number;
      y: number;
   } | null>(null);
   const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
   const [canvasSize, setCanvasSize] = useState({
      width: 0,
      height: 0,
      gapX: 0,
      gapY: 0,
   });
   const orientation = canvas.config.orientation ?? "horizontal";

   useEffect(() => {
      activeDragRef.current = activeDrag;
   }, [activeDrag]);

   useEffect(() => {
      if (activeDrag) {
         return;
      }
      setDragPreview(null);
      setHoveredBlock(null);
   }, [activeDrag]);

   const placedItemsByKey = useMemo(() => {
      const map = new Map<string, PlacedItem>();
      for (const item of canvas.placedItems) {
         map.set(`${item.blockX}-${item.blockY}`, item);
      }
      return map;
   }, [canvas.placedItems]);

   const orderedBlocks = useMemo(() => {
      if (orientation !== "vertical") {
         return canvas.blocks.flat();
      }
      const blocks: Block[] = [];
      for (let x = 0; x < canvas.config.columns; x += 1) {
         for (let y = 0; y < canvas.config.rows; y += 1) {
            const block = canvas.blocks[y]?.[x];
            if (block) {
               blocks.push(block);
            }
         }
      }
      return blocks;
   }, [canvas.blocks, canvas.config.columns, canvas.config.rows, orientation]);

   // biome-ignore lint/correctness/useExhaustiveDependencies: targetCanvasKeyRef is a ref and doesn't need to be in deps
   useEffect(() => {
      if (!activeDrag || !canvasRef.current) {
         return;
      }

      const element = canvasRef.current;
      const handlePointerMove = (event: PointerEvent) => {
         const rect = element.getBoundingClientRect();
         const isInside =
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom;

         if (!isInside) {
            return;
         }

         // Only update ref if different, prevents unnecessary re-renders
         if (targetCanvasKeyRef.current !== canvasKey) {
            targetCanvasKeyRef.current = canvasKey;
         }
      };

      window.addEventListener("pointermove", handlePointerMove);
      return () => window.removeEventListener("pointermove", handlePointerMove);
   }, [activeDrag, canvasKey]);

   useEffect(() => {
      const element = canvasRef.current;
      if (!element) {
         return;
      }

      const updateSize = () => {
         const rect = element.getBoundingClientRect();
         const styles = window.getComputedStyle(element);
         const gapX = Number.parseFloat(styles.columnGap || styles.gap || "0");
         const gapY = Number.parseFloat(styles.rowGap || styles.gap || "0");
         setCanvasSize({ width: rect.width, height: rect.height, gapX, gapY });
      };

      updateSize();

      if (typeof ResizeObserver === "undefined") {
         window.addEventListener("resize", updateSize);
         return () => window.removeEventListener("resize", updateSize);
      }

      const observer = new ResizeObserver(updateSize);
      observer.observe(element);
      return () => observer.disconnect();
   }, []);

   const blockWidth =
      (canvasSize.width - canvasSize.gapX * (canvas.config.columns - 1)) /
      canvas.config.columns || 0;
   const blockHeight =
      useBreakpointValue({ base: 48, sm: 54, md: 60 }) ?? BLOCK_HEIGHT;
   const stepX = blockWidth + canvasSize.gapX;
   const stepY = blockHeight + canvasSize.gapY;

   const gridMetrics: GridMetrics = useMemo(
      () => ({
         blockWidth,
         blockHeight,
         gapX: canvasSize.gapX,
         gapY: canvasSize.gapY,
      }),
      [blockWidth, blockHeight, canvasSize.gapX, canvasSize.gapY],
   );

   const canPlaceItemAt = useCallback(
      (
         data: DragData,
         target: { blockX: number; blockY: number },
         targetCanvasKey?: string,
      ) => {
         if (
            target.blockX < 0 ||
            target.blockY < 0 ||
            target.blockX >= canvas.config.columns ||
            target.blockY >= canvas.config.rows
         ) {
            return false;
         }

         // Check allowedPlaces for the target canvas
         if (targetCanvasKey) {
            const inventoryMatch = findInventoryItem(
               state.inventory.groups,
               data.itemId,
            );
            if (
               inventoryMatch?.item &&
               !inventoryMatch.item.allowedPlaces.includes(targetCanvasKey)
            ) {
               return false;
            }
         }

         const blockKey = `${target.blockX}-${target.blockY}`;
         const placedItem = placedItemsByKey.get(blockKey);
         const isOccupied = Boolean(placedItem);

         return !isOccupied;
      },
      [
         canvas.config.columns,
         canvas.config.rows,
         placedItemsByKey,
         state.inventory.groups,
      ],
   );

   const getSwapTarget = useCallback(
      (data: DragData, target: { blockX: number; blockY: number }) => {
         if (!data.isReposition) {
            return null;
         }

         const blockKey = `${target.blockX}-${target.blockY}`;
         const targetItem = placedItemsByKey.get(blockKey);
         if (!targetItem) {
            return null;
         }

         if (targetItem.itemId === data.itemId) {
            return null;
         }

         return targetItem;
      },
      [placedItemsByKey],
   );

   const placeOrRepositionItem = useCallback(
      (data: DragData, target: { blockX: number; blockY: number }) => {
         if (
            data.isReposition &&
            typeof data.fromBlockX === "number" &&
            typeof data.fromBlockY === "number"
         ) {
            if (
               data.fromBlockX === target.blockX &&
               data.fromBlockY === target.blockY
            ) {
               return false;
            }

            const swapTarget = getSwapTarget(data, target);
            if (swapTarget) {
               dispatch({
                  type: "SWAP_ITEMS",
                  payload: {
                     from: {
                        canvasKey: stateKey,
                        blockX: data.fromBlockX,
                        blockY: data.fromBlockY,
                     },
                     to: {
                        canvasKey: stateKey,
                        blockX: target.blockX,
                        blockY: target.blockY,
                     },
                  },
               });
               return true;
            }

            if (!canPlaceItemAt(data, target, canvasKey)) {
               return false;
            }

            dispatch({
               type: "REPOSITION_ITEM",
               payload: {
                  itemId: data.itemId,
                  fromBlockX: data.fromBlockX,
                  fromBlockY: data.fromBlockY,
                  toBlockX: target.blockX,
                  toBlockY: target.blockY,
                  stateKey,
               },
            });

            return true;
         }

         if (!canPlaceItemAt(data, target, canvasKey)) {
            return false;
         }

         dispatch({
            type: "PLACE_ITEM",
            payload: {
               itemId: data.itemId,
               blockX: target.blockX,
               blockY: target.blockY,
               stateKey,
            },
         });

         return true;
      },
      [canPlaceItemAt, dispatch, getSwapTarget, stateKey, canvasKey],
   );

   callbacksRef.current = { canPlaceItemAt, placeOrRepositionItem };

   useEffect(() => {
      ensureGsapPlugins();
   }, []);

   // biome-ignore lint/correctness/useExhaustiveDependencies: targetCanvasKeyRef is a ref and doesn't need to be in deps
   useLayoutEffect(() => {
      if (!canvasRef.current || !blockWidth || !blockHeight) {
         return;
      }

      for (const handle of draggablesRef.current) {
         handle.cleanup();
      }
      draggablesRef.current = [];

      for (const item of canvas.placedItems) {
         const el = placedItemRefs.current.get(item.id);
         if (!el) {
            continue;
         }

         const placedItem = item;
         const dragData: DragData = {
            itemId: placedItem.itemId,
            itemType: placedItem.type,
            isReposition: true,
            fromBlockX: placedItem.blockX,
            fromBlockY: placedItem.blockY,
         };

         const startX = placedItem.blockX * stepX;
         const startY = placedItem.blockY * stepY;

         const getOtherPlacedElements = () => {
            const others: Element[] = [];
            for (const [id, element] of placedItemRefs.current) {
               if (id !== placedItem.id) {
                  others.push(element);
               }
            }
            return others;
         };

         const handle = createDraggable(el, {
            inertia: false,
            minimumMovement: 4,
            onClick: () => {
               if (el.dataset.wasDragged === "true") {
                  el.dataset.wasDragged = "false";
                  return;
               }
               if (onPlacedItemClick && isItemClickable(placedItem)) {
                  onPlacedItemClick(placedItem);
               }
            },
            onDragStart: function (this: Draggable) {
               el.dataset.wasDragged = "true";
               const rect = el.getBoundingClientRect();
               const pointerOffset = {
                  x: this.pointerX - rect.left,
                  y: this.pointerY - rect.top,
               };

               setDraggingItemId(placedItem.id);
               setActiveDrag({
                  source: "canvas",
                  data: {
                     ...dragData,
                     itemName: placedItem.type,
                  },
                  sourceCanvasKey: canvasKey,
                  element: el,
                  initialRect: rect,
                  pointerOffset,
               });
               targetCanvasKeyRef.current = canvasKey;

               el.style.opacity = "0";
            },
            onDrag: function (this: Draggable) {
               const centerX = startX + this.x + blockWidth / 2;
               const centerY = startY + this.y + blockHeight / 2;
               const { blockX, blockY } = convertPixelToBlock(
                  centerX,
                  centerY,
                  gridMetrics,
               );

               const isOutOfBounds =
                  blockX < 0 ||
                  blockY < 0 ||
                  blockX >= canvas.config.columns ||
                  blockY >= canvas.config.rows;

               if (isOutOfBounds) {
                  setHoveredBlock(null);
                  setDragPreview(null);
                  return;
               }

               const collidingElement = hitTestAny(
                  el,
                  getOtherPlacedElements(),
                  "50%",
               );
               const hasCollision = collidingElement !== null;
               const swapTarget = getSwapTarget(dragData, { blockX, blockY });
               const canSwap = Boolean(swapTarget);

               const isOriginalPosition =
                  blockX === placedItem.blockX && blockY === placedItem.blockY;

               setHoveredBlock({ x: blockX, y: blockY });
               setDragPreview({
                  itemId: placedItem.itemId,
                  itemType: placedItem.type,
                  blockX,
                  blockY,
                  x: blockX * stepX,
                  y: blockY * stepY,
                  width: blockWidth,
                  height: blockHeight,
                  valid: !hasCollision || isOriginalPosition || canSwap,
               });
            },
            onDragEnd: function (this: Draggable) {
               const inventoryPanels = Array.from(
                  document.querySelectorAll<HTMLElement>("[data-inventory-panel]"),
               );
               const isOverInventory = inventoryPanels.some((panel) => {
                  const rect = panel.getBoundingClientRect();
                  return (
                     this.pointerX >= rect.left &&
                     this.pointerX <= rect.right &&
                     this.pointerY >= rect.top &&
                     this.pointerY <= rect.bottom
                  );
               });

               const dragSnapshot = activeDragRef.current;
               const targetCanvasKey = targetCanvasKeyRef.current;
               const sourceCanvasKey = dragSnapshot?.sourceCanvasKey ?? canvasKey;
               const isCrossCanvas =
                  targetCanvasKey && targetCanvasKey !== sourceCanvasKey;

               const finishDrag = (restoreOpacity = true) => {
                  setActiveDrag(null);
                  setDragPreview(null);
                  setHoveredBlock(null);
                  setDraggingItemId(null);
                  // Reset targetCanvasKeyRef when drag ends
                  targetCanvasKeyRef.current = undefined;
                  if (restoreOpacity) {
                     el.style.opacity = "1";
                  }
               };

               const animateProxyTo = (
                  targetX: number,
                  targetY: number,
                  targetWidth: number,
                  targetHeight: number,
                  onComplete: () => void,
               ) => {
                  if (!proxyRef.current) {
                     onComplete();
                     return;
                  }

                  gsap.to(proxyRef.current, {
                     x: targetX,
                     y: targetY,
                     width: targetWidth,
                     height: targetHeight,
                     duration: 0.2,
                     ease: "power2.out",
                     onComplete,
                  });
               };

               if (isOverInventory) {
                  dispatch({
                     type: "REMOVE_ITEM",
                     payload: {
                        blockX: placedItem.blockX,
                        blockY: placedItem.blockY,
                        stateKey,
                     },
                  });
                  gsap.set(el, { x: 0, y: 0, clearProps: "transform" });
                  finishDrag(false);
                  return;
               }

               if (isCrossCanvas && state.canvases) {
                  const targetCanvas = state.canvases[targetCanvasKey];
                  const targetElement = document.querySelector<HTMLDivElement>(
                     `[data-game-canvas][data-canvas-key="${targetCanvasKey}"]`,
                  );

                  if (targetCanvas && targetElement) {
                     const rect = targetElement.getBoundingClientRect();
                     const styles = window.getComputedStyle(targetElement);
                     const gapX = Number.parseFloat(
                        styles.columnGap || styles.gap || "0",
                     );
                     const gapY = Number.parseFloat(
                        styles.rowGap || styles.gap || "0",
                     );
                     const targetBlockWidth =
                        (rect.width - gapX * (targetCanvas.config.columns - 1)) /
                        targetCanvas.config.columns || 0;

                     const { blockX, blockY } = convertPixelToBlock(
                        this.pointerX - rect.left,
                        this.pointerY - rect.top,
                        {
                           blockWidth: targetBlockWidth,
                           blockHeight,
                           gapX,
                           gapY,
                        },
                     );

                     const isInsideTarget =
                        blockX >= 0 &&
                        blockY >= 0 &&
                        blockX < targetCanvas.config.columns &&
                        blockY < targetCanvas.config.rows;

                     if (isInsideTarget) {
                        const targetBlock = targetCanvas.blocks[blockY]?.[blockX];
                        const isTargetOccupied = Boolean(targetBlock?.itemId);

                        if (isTargetOccupied) {
                           dispatch({
                              type: "SWAP_ITEMS",
                              payload: {
                                 from: {
                                    canvasKey: sourceCanvasKey,
                                    blockX: placedItem.blockX,
                                    blockY: placedItem.blockY,
                                 },
                                 to: {
                                    canvasKey: targetCanvasKey,
                                    blockX,
                                    blockY,
                                 },
                              },
                           });
                        } else {
                           dispatch({
                              type: "TRANSFER_ITEM",
                              payload: {
                                 itemId: placedItem.itemId,
                                 fromCanvas: sourceCanvasKey,
                                 fromBlockX: placedItem.blockX,
                                 fromBlockY: placedItem.blockY,
                                 toCanvas: targetCanvasKey,
                                 toBlockX: blockX,
                                 toBlockY: blockY,
                              },
                           });
                        }
                        gsap.set(el, { x: 0, y: 0, clearProps: "transform" });
                        finishDrag();
                        return;
                     }
                  }

                  gsap.set(el, { x: 0, y: 0, clearProps: "transform" });
                  finishDrag();
                  return;
               }

               const canvasElement = canvasRef.current;
               if (!canvasElement) {
                  gsap.set(el, { x: 0, y: 0, clearProps: "transform" });
                  finishDrag();
                  return;
               }

               const canvasRect = canvasElement.getBoundingClientRect();
               const centerX = startX + this.x + blockWidth / 2;
               const centerY = startY + this.y + blockHeight / 2;
               const { blockX, blockY } = convertPixelToBlock(
                  centerX,
                  centerY,
                  gridMetrics,
               );
               const swapTarget = getSwapTarget(dragData, { blockX, blockY });
               const collidingElement = hitTestAny(
                  el,
                  getOtherPlacedElements(),
                  "50%",
               );

               if (collidingElement && !swapTarget) {
                  gsap.set(el, { x: 0, y: 0, clearProps: "transform" });
                  const originX = canvasRect.left + placedItem.blockX * stepX;
                  const originY = canvasRect.top + placedItem.blockY * stepY;
                  animateProxyTo(originX, originY, blockWidth, blockHeight, () => {
                     finishDrag();
                  });
                  return;
               }

               const placed = callbacksRef.current?.placeOrRepositionItem(dragData, {
                  blockX,
                  blockY,
               });
               if (!placed) {
                  gsap.set(el, { x: 0, y: 0, clearProps: "transform" });
                  const originX = canvasRect.left + placedItem.blockX * stepX;
                  const originY = canvasRect.top + placedItem.blockY * stepY;
                  animateProxyTo(originX, originY, blockWidth, blockHeight, () => {
                     finishDrag();
                  });
                  return;
               }

               const targetX = canvasRect.left + blockX * stepX;
               const targetY = canvasRect.top + blockY * stepY;
               gsap.set(el, { x: 0, y: 0, clearProps: "transform" });
               animateProxyTo(targetX, targetY, blockWidth, blockHeight, () => {
                  finishDrag();
               });
            },
         });

         draggablesRef.current.push(handle);
      }

      return () => {
         for (const handle of draggablesRef.current) {
            handle.cleanup();
         }
         draggablesRef.current = [];
      };
   }, [
      blockHeight,
      blockWidth,
      canPlaceItemAt,
      canvas.placedItems,
      getSwapTarget,
      dispatch,
      gridMetrics,
      isItemClickable,
      onPlacedItemClick,
      proxyRef,
      setActiveDrag,
      state.canvases,
      canvasKey,
      stateKey,
      stepX,
      stepY,
      canvas.config.columns,
      canvas.config.rows,
   ]);

   // biome-ignore lint/correctness/useExhaustiveDependencies: targetCanvasKeyRef is a ref and doesn't need to be in deps
   useEffect(() => {
      if (
         !activeDrag ||
         activeDrag.source !== "inventory" ||
         !canvasRef.current
      ) {
         return;
      }

      const canvasElement = canvasRef.current;
      let lastBlockX: number | null = null;
      let lastBlockY: number | null = null;

      const handlePointerMove = (event: PointerEvent) => {
         const rect = canvasElement.getBoundingClientRect();
         const x = event.clientX - rect.left;
         const y = event.clientY - rect.top;
         const isInside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
         // Update targetCanvasKeyRef for inventory drags so drops work correctly
         // This is especially important for conditionally rendered canvases
         // Only set when inside - don't clear when outside (let another canvas handle it)
         if (isInside) {
            targetCanvasKeyRef.current = canvasKey;
         }

         if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
            setDragPreview(null);
            setHoveredBlock(null);
            return;
         }

         const { blockX, blockY } = convertPixelToBlock(x, y, gridMetrics);

         if (
            blockX < 0 ||
            blockY < 0 ||
            blockX >= canvas.config.columns ||
            blockY >= canvas.config.rows
         ) {
            setDragPreview(null);
            setHoveredBlock(null);
            return;
         }

         // Only update if block coordinates changed
         if (lastBlockX !== blockX || lastBlockY !== blockY) {
            lastBlockX = blockX;
            lastBlockY = blockY;

            const valid = canPlaceItemAt(
               activeDrag.data,
               { blockX, blockY },
               canvasKey,
            );
            setHoveredBlock({ x: blockX, y: blockY });
            setDragPreview({
               itemId: activeDrag.data.itemId,
               itemType: activeDrag.data.itemType,
               blockX,
               blockY,
               x: blockX * stepX,
               y: blockY * stepY,
               width: blockWidth,
               height: blockHeight,
               valid,
            });
         }
      };

      const handlePointerUp = (event: PointerEvent) => {
         const targetCanvasKey = targetCanvasKeyRef.current;
         if (targetCanvasKey && targetCanvasKey !== canvasKey) {
            return;
         }

         const rect = canvasElement.getBoundingClientRect();
         const x = event.clientX - rect.left;
         const y = event.clientY - rect.top;

         const isInsideCanvas =
            x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
         const { blockX, blockY } = convertPixelToBlock(x, y, gridMetrics);
         const canPlace =
            isInsideCanvas &&
            canPlaceItemAt(activeDrag.data, { blockX, blockY }, canvasKey);

         if (canPlace && proxyRef.current) {
            const targetX = rect.left + blockX * stepX;
            const targetY = rect.top + blockY * stepY;

            gsap.to(proxyRef.current, {
               x: targetX,
               y: targetY,
               width: blockWidth,
               height: blockHeight,
               duration: 0.2,
               ease: "power2.out",
               onComplete: () => {
                  placeOrRepositionItem(activeDrag.data, { blockX, blockY });
                  setActiveDrag(null);
                  setDragPreview(null);
                  setHoveredBlock(null);
                  // Reset targetCanvasKeyRef after placing item from inventory
                  targetCanvasKeyRef.current = undefined;
               },
            });
         } else {
            setActiveDrag(null);
            setDragPreview(null);
            setHoveredBlock(null);
            // Reset targetCanvasKeyRef when drag ends
            targetCanvasKeyRef.current = undefined;
         }
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);

      return () => {
         window.removeEventListener("pointermove", handlePointerMove);
         window.removeEventListener("pointerup", handlePointerUp);
      };
   }, [
      activeDrag,
      blockHeight,
      blockWidth,
      canPlaceItemAt,
      canvas.config.columns,
      canvas.config.rows,
      canvasKey,
      gridMetrics,
      placeOrRepositionItem,
      proxyRef,
      setActiveDrag,
      stepX,
      stepY,
   ]);

   const setPlacedItemRef = useCallback(
      (itemId: string) => (el: HTMLDivElement | null) => {
         if (el) {
            placedItemRefs.current.set(itemId, el);
         } else {
            placedItemRefs.current.delete(itemId);
         }
      },
      [],
   );

   const showGrid = true;

   return (
      <Box
         className="play-canvas"
         data-game-canvas
         bg="gray.950"
         p={{ base: 2, md: 4 }}
         overflow="visible"
         position="relative"
         display="flex"
         flexDirection="column"
         gap={3}
      >
         {title ? (
            <Flex align="center" justify="space-between" mb={{ base: 0, md: 4 }}>
               <Text
                  fontSize={{ base: "xs", md: "sm" }}
                  fontWeight="bold"
                  color="gray.200"
               >
                  {title}
               </Text>
            </Flex>
         ) : null}

         <Box
            ref={canvasRef}
            position="relative"
            display="grid"
            data-game-canvas
            data-canvas-key={canvasKey}
            gridTemplateColumns={`repeat(${canvas.config.columns}, minmax(0, 1fr))`}
            gridTemplateRows={`repeat(${canvas.config.rows}, ${blockHeight}px)`}
            gridAutoFlow={orientation === "vertical" ? "column" : "row"}
            gap={2}
         >
            {orderedBlocks.map((block) => {
               const key = `${block.x}-${block.y}`;
               const placedItem = placedItemsByKey.get(key);
               const isHovered =
                  hoveredBlock?.x === block.x && hoveredBlock?.y === block.y;
               const borderColor =
                  isHovered && dragPreview
                     ? dragPreview.valid
                        ? "cyan.400"
                        : "red.400"
                     : "gray.700";

               return (
                  <GridCell
                     key={key}
                     borderColor={borderColor}
                     showBorder={showGrid}
                     isOccupied={Boolean(placedItem)}
                     height={blockHeight}
                  />
               );
            })}

            {canvas.placedItems.map((item) => {
               const isDragging = draggingItemId === item.id;
               return (
                  <PlacedItemCard
                     key={item.id}
                     item={item}
                     x={item.blockX * stepX}
                     y={item.blockY * stepY}
                     width={blockWidth}
                     height={blockHeight}
                     isDragging={isDragging}
                     getItemLabel={getItemLabel}
                     getStatusMessage={getStatusMessage}
                     itemRef={setPlacedItemRef(item.id)}
                  />
               );
            })}

            {dragPreview && (
               <Box
                  position="absolute"
                  zIndex={10}
                  top={`${dragPreview.y}px`}
                  left={`${dragPreview.x}px`}
                  width={`${dragPreview.width}px`}
                  height={`${dragPreview.height}px`}
                  border="1px dashed"
                  borderColor={dragPreview.valid ? "cyan.300" : "red.400"}
                  borderRadius="md"
                  pointerEvents="none"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  bg="rgba(15, 23, 42, 0.8)"
               >
                  <Text fontSize="xs" color="gray.100">
                     {getItemLabel(dragPreview.itemType)}
                  </Text>
               </Box>
            )}
         </Box>
      </Box>
   );
};

export type { PlayCanvasProps };
