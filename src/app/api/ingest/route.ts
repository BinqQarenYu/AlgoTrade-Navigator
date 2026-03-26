import { NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  bufferTrades, 
  bufferOHLCVBatch, 
  bufferMicrostructureEvents,
  bufferSystemLog
} from '@/lib/db-service';
import type { TradeRecord, OHLCVRecord, MicrostructureEventRecord } from '@/lib/db-service';

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
  microstructure_events: z.array(microstructureEventSchema).optional()
});

export async function POST(request: Request) {
  try {
    if (!isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized. Invalid or missing Bearer token.' }, { status: 401 });
    }

    const body = await request.json();
    const result = payloadSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid payload structure', details: result.error.format() },
        { status: 400 }
      );
    }

    const { trades, ohlcv, microstructure_events } = result.data;
    
    let processed = 0;

    if (trades && trades.length > 0) {
      bufferTrades(trades as TradeRecord[]); 
      processed += trades.length;
    }

    if (ohlcv && ohlcv.length > 0) {
      bufferOHLCVBatch(ohlcv as OHLCVRecord[]);
      processed += ohlcv.length;
    }

    if (microstructure_events && microstructure_events.length > 0) {
      bufferMicrostructureEvents(microstructure_events as MicrostructureEventRecord[]);
      processed += microstructure_events.length;
    }

    // Log the ingest event for auditing
    if (processed > 0) {
        bufferSystemLog({
            id: `ingest-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            timestamp: Date.now(),
            asset_pair: 'SYSTEM',
            alert_source: 'ORANGE_PI_NODE',
            interval: 'N/A',
            numerical_data: `{"processed": ${processed}}`,
            message: `Successfully ingested ${processed} records from Child Node.`
        });
    }

    return NextResponse.json({ 
      success: true, 
      processed,
      message: 'Payload buffered successfully. Mother node will batch-flush to DuckDB.'
    });

  } catch (error) {
    console.error('[API/Ingest] Server Error Handling Child Payload:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
