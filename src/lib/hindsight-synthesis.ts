import type { MicrostructureAnalysis } from "@/lib/microstructure-service"

export type UnifiedSignalStatus = 'green' | 'yellow' | 'red' | 'neutral' | 'hidden';

export interface UnifiedSignal {
    status: UnifiedSignalStatus;
    action: 'BUY' | 'SELL' | 'HOLD' | 'WAIT';
    summaryPhrase: string;
    details: string;
    macroWeight: number; // 0-100% influence
    microWeight: number; // 0-100% influence
    strategyWeight: number; // 0-100% influence
    timestamp?: number;
    confluenceParams?: {
        strategyAction?: 'UP' | 'DOWN' | null;
        aiPrediction?: 'UP' | 'DOWN' | 'HOLD' | null;
        threatLevel?: number;
        isToxic?: boolean;
    };
}

export function generateHindsightSynthesis(
    strategyAction: 'UP' | 'DOWN' | null,
    aiPrediction: 'UP' | 'DOWN' | 'HOLD' | null,
    microstructure: MicrostructureAnalysis | null | undefined
): UnifiedSignal {
   if (!strategyAction) {
       return {
           status: 'hidden',
           action: 'WAIT',
           summaryPhrase: 'Awaiting Setup',
           details: 'The Formidable Hindsight Engine is in deep standby. It will activate immediately once your selected strategy identifies a structural setup.',
           macroWeight: 30, microWeight: 50, strategyWeight: 20
       };
   }

   // 1. Evaluate Strategy (The Catalyst) - 20% base weight
   const stTarget = strategyAction === 'UP' ? 'BUY' : 'SELL';
   let confluenceScore = 20;

   // 2. Evaluate Macro (AI) - 30% weight
   let macroAlignment = false;
   if (aiPrediction === strategyAction) {
       macroAlignment = true;
       confluenceScore += 30;
   } else if (aiPrediction === 'HOLD') {
       confluenceScore += 15; // Neutral, not inherently opposing
   }

   // 3. Evaluate Micro (Order Flow) - 50% weight (Dominant Force)
   let microAlignment = false;
   let threatLevel = 0; // 0-10
   let isToxic = false;

   if (microstructure) {
       threatLevel = microstructure.entropyScore || 0;
       isToxic = microstructure.isToxicTrap || microstructure.isSpoofing || false;

       // If threat is low (<4) and no toxic traps, that's high confluence.
       if (!isToxic && threatLevel < 4) {
           confluenceScore += 50;
           microAlignment = true;
       } else if (!isToxic && threatLevel < 7) {
           confluenceScore += 25; // Medium threat gets half penalty
       }
       // If highly manipulated or spoofing => 0 score contribution from micro.
   } else {
       // Without microstructure data, we cautiously add partial points to avoid failing good trades just because WS lagged
       confluenceScore += 20; 
   }

   // Synthesize Output
   let status: UnifiedSignalStatus = 'neutral';
   let finalAction: 'BUY' | 'SELL' | 'HOLD' | 'WAIT' = 'WAIT';
   let summaryPhrase = '';
   let details = '';

   if (confluenceScore >= 80) {
       status = 'green';
       finalAction = stTarget as 'BUY' | 'SELL';
       summaryPhrase = `Strong ${stTarget} - Full Confluence`;
       details = `Strategy fired ${stTarget}, AI confirms the Macro trend, and Order Flow shows clean liquidity. Execution highly recommended.`;
   } else if (confluenceScore >= 55) {
       status = 'yellow';
       finalAction = stTarget as 'BUY' | 'SELL';
       summaryPhrase = `Caution ${stTarget} - Mixed Signals`;
       if (!macroAlignment) {
           details = `Strategy fired ${stTarget}, but AI detects divergent Macro conditions. Consider sizing down if executing.`;
       } else {
           details = `Strategy and AI align for ${stTarget}, but Order Flow shows medium manipulative threats. Proceed with tight stops.`;
       }
   } else {
       status = 'red';
       finalAction = 'HOLD'; // Abort the strategy execution
       summaryPhrase = `Avoid ${stTarget} - Heavy Manipulation`;
       
       if (isToxic) {
           details = `Strategy fired ${stTarget}, but Order Flow detected immediate TOXIC SPOOFING TRAPS. Abort trade.`;
       } else if (!macroAlignment) {
           details = `Strategy fired ${stTarget}, but AI strongly opposes the Macro direction and liquidity is poor. High risk of trap.`;
       } else {
           details = `Confluence score critically low (${confluenceScore}%). Market microstructure is mathematically unsafe for entry.`;
       }
   }

   return {
       status,
       action: finalAction,
       summaryPhrase,
       details,
       macroWeight: 30,
       microWeight: 50,
       strategyWeight: 20,
       timestamp: Date.now(),
       confluenceParams: {
           strategyAction,
           aiPrediction,
           threatLevel,
           isToxic
       }
   };
}
