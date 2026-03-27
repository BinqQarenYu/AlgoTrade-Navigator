import type { OrderData, ManipulationFlags } from "@/lib/order-flow-analyzer";

export interface EnhancedOrderFlowData {
  orders: OrderData[];
  manipulation: ManipulationFlags;
}

export interface OrderFlowData {
  symbol: string;
  timestamp: number;
  orderType: 'buy' | 'sell';
  size: number;
  price: number;
  suspiciousFlags: string[];
  riskScore: number;
  flags: ManipulationFlags;
  marketSource?: any;
}

export interface BinanceOrderFlowData {
  id: string;
  timestamp: number;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  symbol: string;
}

export interface VeryLargeActivity {
  id: string;
  timestamp: number;
  startTime?: number;
  endTime?: number;
  type: 'large_order' | 'whale_movement' | 'anomaly' | 'massive_buy' | 'massive_sell' | 'whale_activity' | 'coordinated_attack';
  amount?: number;
  totalVolume?: number;
  orderCount?: number;
  avgPrice?: number;
  maxOrderSize?: number;
  symbol: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme' | 'critical';
  metadata?: any;
  isActive?: boolean;
}

export interface ManipulationPattern {
  type: 'padding' | 'scam' | 'rag';
  severity: 'low' | 'medium' | 'high';
  count: number;
  examples: OrderFlowData[];
  description?: string;
}
