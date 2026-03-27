import { NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  bufferTrades, 
  bufferOHLCVBatch, 
  bufferMicrostructureEvents,
  bufferSystemLog
} from '@/lib/db-service';
import type { TradeRecord, OHLCVRecord, MicrostructureEventRecord } from '@/lib/db-service';
import { pulseNerve } from '@/lib/nerve-center';

// Security token validator
function isAuthenticated(request: Request) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.ORANGE_PI_SECRET || 'dev-secret-key';
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.split(' ')[1];
  
  return token === secret;
}

// Minimal generic schemas mapping directly to DuckDB buffer system
const tradeSchema = z.object({
  trade_id: z.string(),
  symbol: z.string(),
  price: z.number(),
  quantity: z.number(),
  side: z.enum(['buy', 'sell']),
  timestamp: z.number(),
  source: z.enum(['LIVE', 'BACKFILL']).default('LIVE'),
  entropy_score: z.number().optional(),
  vpin: z.number().optional(),
  is_synthetic: z.boolean().optional(),
  is_organic: z.boolean().optional(),
  is_iceberg: z.boolean().optional(),
  is_spoofing: z.boolean().optional(),
  funding_rate: z.number().optional(),
});

const ohlcvSchema = z.object({
  symbol: z.string(),
  interval: z.string(),
  time: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  source: z.enum(['LIVE', 'BACKFILL']).default('LIVE')
});

const microstructureEventSchema = z.object({
  event_id: z.string(),
  timestamp: z.number(),
  symbol: z.string(),
  event_type: z.enum(['WHALE_TX', 'ICEBERG', 'SPOOF_CANCEL', 'VPIN_SPIKE', 'LIQUIDATION', 'ENTROPY_SHIFT']),
  price: z.number(),
  volume_base: z.number(),
  volume_usd: z.number(),
  severity_score: z.number(),
  metadata: z.string().optional()
});

const payloadSchema = z.object({
  trades: z.array(tradeSchema).optional(),
  ohlcv: z.array(ohlcvSchema).optional(),
  microstructure_events: z.array(microstructureEventSchema).optional(),
  buffer_remaining: z.number().optional(),
  sentry_id: z.string().optional(),
  pulse: z.boolean().optional(),
  is_recovery: z.boolean().optional(),
  backlog_count: z.number().optional(),
  asset_count: z.number().optional()
});

export async function POST(request: Request) {
  try {
    if (!isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized. Invalid or missing Bearer token.' }, { status: 401 });
    }

    const body = await request.json();
    const result = payloadSchema.safeParse(body);
    
    // Identity & Priority extraction from headers
    const machineId = request.headers.get('x-machine-id') || body.sentry_id || 'UNKNOWN_SENTINEL';
    const rawPriority = request.headers.get('x-priority') || 'NORMAL';
    const isCritical = rawPriority === 'CRITICAL';

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid payload structure', details: result.error.format() },
        { status: 400 }
      );
    }

    const { trades, ohlcv, microstructure_events, buffer_remaining } = result.data;
    console.log(`[API/Ingest] Payload from ${machineId} | Priority: ${rawPriority} | Buffer: ${buffer_remaining}`);
    
    let processed = 0;

    if (trades && trades.length > 0) {
      const records = trades.map(t => ({ ...t, machine_id: machineId }));
      bufferTrades(records as TradeRecord[]); 
      processed += trades.length;
    }

    if (ohlcv && ohlcv.length > 0) {
      const records = ohlcv.map(k => ({ ...k, machine_id: machineId }));
      bufferOHLCVBatch(records as OHLCVRecord[]);
      processed += ohlcv.length;
    }

    if (microstructure_events && microstructure_events.length > 0) {
      const records = microstructure_events.map(e => ({ ...e, machine_id: machineId }));
      bufferMicrostructureEvents(records as MicrostructureEventRecord[]);
      processed += microstructure_events.length;
      
      // Pulse the NerveCenter for immediate micro-anomalies
      pulseNerve({ 
        type: 'MICROSTRUCTURE_EVENT', 
        payload: { count: records.length, latest: records[0] },
        machine_id: machineId 
      });
    }

    // Heartbeat reporting
    bufferSystemLog({
        id: `hb-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        timestamp: Date.now(),
        asset_pair: 'HEARTBEAT',
        alert_source: machineId,
        interval: 'N/A',
        numerical_data: JSON.stringify({ 
            processed, 
            buffer_remaining: buffer_remaining ?? 0,
            asset_count: body.asset_count || 1,
            priority: rawPriority
        }),
        message: `Heartbeat received from ${machineId}. Processed: ${processed}`
    });

    return NextResponse.json({ 
      success: true, 
      processed,
      priority: rawPriority,
      message: isCritical ? 'Critical Payload Flashed' : 'Payload Buffered Successfully'
    });

  } catch (error) {
    console.error('[API/Ingest] Server Error Handling Child Payload:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
