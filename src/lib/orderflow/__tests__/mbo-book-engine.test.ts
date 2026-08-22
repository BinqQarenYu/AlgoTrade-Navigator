import { describe, it, expect, beforeEach } from 'vitest';
import { MBOBookEngine } from '../mbo-book-engine';
import type { MBOEvent } from '../types';

describe('MBOBookEngine', () => {
  let engine: MBOBookEngine;

  beforeEach(() => {
    engine = new MBOBookEngine(0.25);
  });

  it('should round prices according to tick size', () => {
    expect(engine.roundPrice(7368.62)).toBe(7368.5);
    expect(engine.roundPrice(7368.63)).toBe(7368.75);
    expect(engine.roundPrice(7368.125)).toBe(7368.25);
  });

  it('should maintain order book and calculate best bid/ask correctly', () => {
    engine.processEvent({
      action: 'ADD',
      side: 'BID',
      price: 7368.0,
      size: 50,
      orderId: 'bid-1',
      timestamp: 1000,
    });

    engine.processEvent({
      action: 'ADD',
      side: 'BID',
      price: 7368.25,
      size: 100,
      orderId: 'bid-2',
      timestamp: 1001,
    });

    engine.processEvent({
      action: 'ADD',
      side: 'ASK',
      price: 7368.75,
      size: 75,
      orderId: 'ask-1',
      timestamp: 1002,
    });

    expect(engine.getBestBid()).toBe(7368.25);
    expect(engine.getBestAsk()).toBe(7368.75);
    expect(engine.getMidPrice()).toBe(7368.5);

    const levels = engine.getL2Levels(5);
    expect(levels.bids[0].price).toBe(7368.25);
    expect(levels.bids[0].volume).toBe(100);
    expect(levels.asks[0].price).toBe(7368.75);
    expect(levels.asks[0].volume).toBe(75);
  });

  it('should track user simulated order queue position accurately', () => {
    // 1. Place initial resting orders ahead of user
    engine.processEvent({
      action: 'ADD',
      side: 'BID',
      price: 7368.0,
      size: 100,
      orderId: 'ahead-1',
      timestamp: 1000,
    });

    engine.processEvent({
      action: 'ADD',
      side: 'BID',
      price: 7368.0,
      size: 50,
      orderId: 'ahead-2',
      timestamp: 1001,
    });

    // 2. User registers limit order
    const tracker = engine.registerUserOrder('user-ord-99', 'BID', 7368.0, 10);
    expect(tracker.ordersAhead).toBe(2);
    expect(tracker.volumeAhead).toBe(150);
    expect(tracker.status).toBe('PENDING');

    // 3. Trade executes 60 volume at 7368.0
    engine.processEvent({
      action: 'EXECUTE',
      side: 'BID',
      price: 7368.0,
      size: 60,
      orderId: 'ahead-1',
      timestamp: 1010,
    });

    const updated = engine.getUserTracker('user-ord-99');
    expect(updated?.volumeAhead).toBe(90);
    expect(updated?.status).toBe('PENDING');

    // 4. Trade executes remaining 90 volume ahead + 10 of user order
    engine.processEvent({
      action: 'EXECUTE',
      side: 'BID',
      price: 7368.0,
      size: 100,
      orderId: 'ahead-2',
      timestamp: 1020,
    });

    const filled = engine.getUserTracker('user-ord-99');
    expect(filled?.volumeAhead).toBe(0);
    expect(filled?.filledQuantity).toBe(10);
    expect(filled?.status).toBe('FILLED');
  });

  it('should detect Iceberg reload events when volume exceeds visible size', () => {
    engine.processEvent({
      action: 'ADD',
      side: 'ASK',
      price: 7370.0,
      size: 50,
      orderId: 'iceberg-1',
      timestamp: 2000,
    });

    // Execution 1
    engine.processEvent({
      action: 'EXECUTE',
      side: 'ASK',
      price: 7370.0,
      size: 40,
      orderId: 'iceberg-1',
      timestamp: 2005,
    });

    // Execution 2 pushing cumulative execution past visible size
    const result = engine.processEvent({
      action: 'EXECUTE',
      side: 'ASK',
      price: 7370.0,
      size: 50,
      orderId: 'iceberg-1',
      timestamp: 2010,
    });

    expect(result.icebergDetected).toBeDefined();
    expect(result.icebergDetected?.price).toBe(7370.0);
    expect(engine.getRecentIcebergs().length).toBeGreaterThan(0);
  });

  it('should detect spoofing when order is placed and cancelled in <50ms near spread', () => {
    engine.processEvent({
      action: 'ADD',
      side: 'BID',
      price: 7368.5,
      size: 10,
      orderId: 'spread-1',
      timestamp: 3000,
    });

    // Add large spoof order
    engine.processEvent({
      action: 'ADD',
      side: 'BID',
      price: 7368.25,
      size: 200,
      orderId: 'spoof-1',
      timestamp: 3000,
    });

    // Cancel 20ms later
    const res = engine.processEvent({
      action: 'CANCEL',
      side: 'BID',
      price: 7368.25,
      size: 200,
      orderId: 'spoof-1',
      timestamp: 3020,
    });

    expect(res.spoofDetected).toBeDefined();
    expect(res.spoofDetected?.lifetimeMs).toBe(20);
    expect(res.spoofDetected?.size).toBe(200);
    expect(engine.getRecentSpoofs().length).toBeGreaterThan(0);
  });
});
