import { Decimal } from 'decimal.js';
import type {
  MBOEvent,
  MBOOrder,
  MBOSide,
  L2PriceLevel,
  IcebergEvent,
  SpoofEvent,
  QueuePositionTracker,
} from './types';

export class MBOBookEngine {
  private ordersById: Map<string, MBOOrder> = new Map();
  private bids: Map<number, MBOOrder[]> = new Map(); // price -> FIFO queue
  private asks: Map<number, MBOOrder[]> = new Map(); // price -> FIFO queue

  // Aggregated totals for rapid L2 lookups
  private bidVolumes: Map<number, number> = new Map();
  private askVolumes: Map<number, number> = new Map();

  // Algorithmic Detection State
  private icebergs: IcebergEvent[] = [];
  private spoofEvents: SpoofEvent[] = [];
  private priceLevelExecutions: Map<number, { count: number; volume: number; firstExecTime: number }> = new Map();

  // User simulated order queue positions
  private userTrackers: Map<string, QueuePositionTracker> = new Map();

  private tickSize: number;

  constructor(tickSize: number = 0.25) {
    this.tickSize = tickSize;
  }

  public setTickSize(tickSize: number) {
    this.tickSize = tickSize;
  }

  public clear() {
    this.ordersById.clear();
    this.bids.clear();
    this.asks.clear();
    this.bidVolumes.clear();
    this.askVolumes.clear();
    this.icebergs = [];
    this.spoofEvents = [];
    this.priceLevelExecutions.clear();
    this.userTrackers.clear();
  }

  public roundPrice(price: number): number {
    const dPrice = new Decimal(price);
    const dTick = new Decimal(this.tickSize);
    return dPrice.dividedBy(dTick).round().times(dTick).toNumber();
  }

  public getBestBid(): number | null {
    if (this.bidVolumes.size === 0) return null;
    let max = -Infinity;
    for (const [p, v] of this.bidVolumes.entries()) {
      if (v > 0 && p > max) max = p;
    }
    return max === -Infinity ? null : max;
  }

  public getBestAsk(): number | null {
    if (this.askVolumes.size === 0) return null;
    let min = Infinity;
    for (const [p, v] of this.askVolumes.entries()) {
      if (v > 0 && p < min) min = p;
    }
    return min === Infinity ? null : min;
  }

  public getMidPrice(): number {
    const bb = this.getBestBid();
    const ba = this.getBestAsk();
    if (bb !== null && ba !== null) return (bb + ba) / 2;
    if (bb !== null) return bb;
    if (ba !== null) return ba;
    return 7368.5; // default benchmark
  }

  public processEvent(event: MBOEvent): {
    icebergDetected?: IcebergEvent;
    spoofDetected?: SpoofEvent;
  } {
    const price = this.roundPrice(event.price);
    let icebergDetected: IcebergEvent | undefined;
    let spoofDetected: SpoofEvent | undefined;

    switch (event.action) {
      case 'ADD': {
        const order: MBOOrder = {
          orderId: event.orderId,
          side: event.side,
          price,
          size: event.size,
          timestamp: event.timestamp,
          initialTimestamp: event.timestamp,
        };
        this.ordersById.set(event.orderId, order);

        const targetMap = event.side === 'BID' ? this.bids : this.asks;
        const volumeMap = event.side === 'BID' ? this.bidVolumes : this.askVolumes;

        if (!targetMap.has(price)) {
          targetMap.set(price, []);
        }
        targetMap.get(price)!.push(order);

        const currentVol = volumeMap.get(price) || 0;
        volumeMap.set(price, currentVol + event.size);
        break;
      }

      case 'CANCEL': {
        const existing = this.ordersById.get(event.orderId);
        if (existing) {
          const lifetimeMs = event.timestamp - existing.initialTimestamp;
          const midPrice = this.getMidPrice();
          const distTicks = Math.abs(existing.price - midPrice) / this.tickSize;

          // Spoofing detection: Order placed and cancelled within <50ms near market spread with large size
          if (lifetimeMs < 50 && existing.size >= 100 && distTicks <= 8) {
            spoofDetected = {
              id: `spoof-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: event.timestamp,
              price: existing.price,
              side: existing.side,
              size: existing.size,
              lifetimeMs,
              distanceToMidTicks: distTicks,
              detectedAt: event.timestamp,
            };
            this.spoofEvents.push(spoofDetected);
            if (this.spoofEvents.length > 50) this.spoofEvents.shift();
          }

          // Remove from book
          this.removeOrder(existing, event.size || existing.size);
        }
        break;
      }

      case 'MODIFY': {
        const existing = this.ordersById.get(event.orderId);
        if (existing) {
          const oldSize = existing.size;
          const diff = event.size - oldSize;
          existing.size = event.size;

          const volumeMap = existing.side === 'BID' ? this.bidVolumes : this.askVolumes;
          const currentVol = volumeMap.get(existing.price) || 0;
          volumeMap.set(existing.price, Math.max(0, currentVol + diff));
        }
        break;
      }

      case 'EXECUTE': {
        const existing = this.ordersById.get(event.orderId);
        const execSize = event.size;

        // Iceberg Order Detection:
        // Track executions at this price. If executed volume at price level exceeds front visible size without price clearance
        const currentExec = this.priceLevelExecutions.get(price) || { count: 0, volume: 0, firstExecTime: event.timestamp };
        currentExec.count += 1;
        currentExec.volume += execSize;
        this.priceLevelExecutions.set(price, currentExec);

        const targetMap = event.side === 'BID' ? this.bids : this.asks;
        const queue = targetMap.get(price) || [];
        const frontOrder = queue[0];

        if (frontOrder && currentExec.volume > frontOrder.size * 1.5 && currentExec.count >= 2) {
          icebergDetected = {
            id: `iceberg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: event.timestamp,
            price,
            side: event.side,
            visibleSize: frontOrder.size,
            executedVolume: currentExec.volume,
            hiddenReloadCount: currentExec.count,
            detectedAt: event.timestamp,
          };
          this.icebergs.push(icebergDetected);
          if (this.icebergs.length > 50) this.icebergs.shift();
          // Reset tracker for this level
          this.priceLevelExecutions.delete(price);
        }

        if (existing) {
          this.removeOrder(existing, execSize);
        }

        // Decrement user queue position tracker if trade occurred ahead of user
        this.updateUserQueueOnExecution(price, event.side, execSize);
        break;
      }
    }

    return { icebergDetected, spoofDetected };
  }

  private removeOrder(order: MBOOrder, sizeToRemove: number) {
    const targetMap = order.side === 'BID' ? this.bids : this.asks;
    const volumeMap = order.side === 'BID' ? this.bidVolumes : this.askVolumes;

    const queue = targetMap.get(order.price);
    if (queue) {
      const idx = queue.findIndex((o) => o.orderId === order.orderId);
      if (idx !== -1) {
        if (order.size <= sizeToRemove) {
          queue.splice(idx, 1);
          this.ordersById.delete(order.orderId);
        } else {
          order.size -= sizeToRemove;
        }
      }
      if (queue.length === 0) {
        targetMap.delete(order.price);
      }
    }

    const currentVol = volumeMap.get(order.price) || 0;
    const newVol = Math.max(0, currentVol - sizeToRemove);
    if (newVol === 0) {
      volumeMap.delete(order.price);
    } else {
      volumeMap.set(order.price, newVol);
    }
  }

  // --- Simulated User Order Queue Tracking ---

  public registerUserOrder(
    userOrderId: string,
    side: MBOSide,
    price: number,
    size: number
  ): QueuePositionTracker {
    const rounded = this.roundPrice(price);
    const targetMap = side === 'BID' ? this.bids : this.asks;
    const queue = targetMap.get(rounded) || [];

    let volumeAhead = 0;
    let ordersAhead = 0;

    for (const ord of queue) {
      if (ord.orderId !== userOrderId) {
        volumeAhead += ord.size;
        ordersAhead += 1;
      }
    }

    const tracker: QueuePositionTracker = {
      userOrderId,
      side,
      price: rounded,
      userSize: size,
      ordersAhead,
      volumeAhead,
      initialOrdersAhead: ordersAhead,
      initialVolumeAhead: volumeAhead,
      status: 'PENDING',
      filledQuantity: 0,
    };

    this.userTrackers.set(userOrderId, tracker);
    return tracker;
  }

  private updateUserQueueOnExecution(price: number, side: MBOSide, execSize: number) {
    for (const tracker of this.userTrackers.values()) {
      if (tracker.price === price && tracker.side === side && tracker.status !== 'FILLED' && tracker.status !== 'CANCELLED') {
        let remainingExec = execSize;
        if (tracker.volumeAhead > 0) {
          const reduced = Math.min(tracker.volumeAhead, remainingExec);
          tracker.volumeAhead -= reduced;
          remainingExec -= reduced;
          tracker.ordersAhead = Math.max(0, Math.ceil(tracker.volumeAhead / 10)); // approximate count
        }

        if (remainingExec > 0 && tracker.volumeAhead === 0) {
          const fill = Math.min(tracker.userSize - tracker.filledQuantity, remainingExec);
          tracker.filledQuantity += fill;
          if (tracker.filledQuantity >= tracker.userSize) {
            tracker.status = 'FILLED';
          } else {
            tracker.status = 'PARTIALLY_FILLED';
          }
        }
      }
    }
  }

  public getUserTracker(orderId: string): QueuePositionTracker | undefined {
    return this.userTrackers.get(orderId);
  }

  public getAllUserTrackers(): QueuePositionTracker[] {
    return Array.from(this.userTrackers.values());
  }

  // --- L2 Book & Visual Extraction ---

  public getL2Levels(depth: number = 30): { bids: L2PriceLevel[]; asks: L2PriceLevel[] } {
    const bidPrices = Array.from(this.bidVolumes.keys()).sort((a, b) => b - a);
    const askPrices = Array.from(this.askVolumes.keys()).sort((a, b) => a - b);

    const bids: L2PriceLevel[] = bidPrices.slice(0, depth).map((p) => ({
      price: p,
      volume: this.bidVolumes.get(p) || 0,
      orderCount: this.bids.get(p)?.length || 0,
      side: 'BID',
    }));

    const asks: L2PriceLevel[] = askPrices.slice(0, depth).map((p) => ({
      price: p,
      volume: this.askVolumes.get(p) || 0,
      orderCount: this.asks.get(p)?.length || 0,
      side: 'ASK',
    }));

    return { bids, asks };
  }

  public getHeatmapSlice(): Map<number, number> {
    const slice = new Map<number, number>();
    for (const [p, v] of this.bidVolumes.entries()) {
      if (v > 0) slice.set(p, v);
    }
    for (const [p, v] of this.askVolumes.entries()) {
      if (v > 0) slice.set(p, v);
    }
    return slice;
  }

  public getRecentIcebergs(): IcebergEvent[] {
    return [...this.icebergs];
  }

  public getRecentSpoofs(): SpoofEvent[] {
    return [...this.spoofEvents];
  }
}
