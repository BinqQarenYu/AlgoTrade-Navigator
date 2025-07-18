
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { defaultAwesomeOscillatorParams } from "@/lib/strategies/awesome-oscillator";
import { defaultBollingerBandsParams } from "@/lib/strategies/bollinger-bands";
import { defaultCciReversionParams } from "@/lib/strategies/cci-reversion";
import { defaultChaikinMoneyFlowParams } from "@/lib/strategies/chaikin-money-flow";
import { defaultCoppockCurveParams } from "@/lib/strategies/coppock-curve";
import { defaultDonchianChannelsParams } from "@/lib/strategies/donchian-channels";
import { defaultElderRayIndexParams } from "@/lib/strategies/elder-ray-index";
import { defaultEmaCrossoverParams } from "@/lib/strategies/ema-crossover";
import { defaultHyperPFFParams } from "@/lib/strategies/hyper-peak-formation";
import { defaultIchimokuCloudParams } from "@/lib/strategies/ichimoku-cloud";
import { defaultKeltnerChannelsParams } from "@/lib/strategies/keltner-channels";
import { defaultMacdCrossoverParams } from "@/lib/strategies/macd-crossover";
import { defaultMomentumCrossParams } from "@/lib/strategies/momentum-cross";
import { defaultObvDivergenceParams } from "@/lib/strategies/obv-divergence";
import { defaultParabolicSarFlipParams } from "@/lib/strategies/parabolic-sar-flip";
import { defaultPffParams } from "@/lib/strategies/peak-formation-fib";
import { defaultPivotPointReversalParams } from "@/lib/strategies/pivot-point-reversal";
import { defaultReversePffParams } from "@/lib/strategies/reverse-pff";
import { defaultRsiDivergenceParams } from "@/lib/strategies/rsi-divergence";
import { defaultSmaCrossoverParams } from "@/lib/strategies/sma-crossover";
import { defaultStochasticCrossoverParams } from "@/lib/strategies/stochastic-crossover";
import { defaultSupertrendParams } from "@/lib/strategies/supertrend";
import { defaultVolumeDeltaParams } from "@/lib/strategies/volume-profile-delta";
import { defaultVwapCrossParams } from "@/lib/strategies/vwap-cross";
import { defaultWilliamsRParams } from "@/lib/strategies/williams-percent-r";
import { defaultLiquidityOrderFlowParams } from "@/lib/strategies/liquidity-order-flow";
import { defaultLiquidityGrabParams } from '@/lib/strategies/liquidity-grab';
import { defaultEmaCciMacdParams } from '@/lib/strategies/ema-cci-macd';
import { defaultCodeBasedConsensusParams } from '@/lib/strategies/code-based-consensus';
import { defaultMtfEngulfingParams } from '@/lib/strategies/mtf-engulfing';
import { defaultSmiMfiSupertrendParams } from '@/lib/strategies/smi-mfi-supertrend';

interface LabContextType {
  strategyParams: Record<string, any>;
  setStrategyParams: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

const LabContext = createContext<LabContextType | undefined>(undefined);

const DEFAULT_STRATEGY_PARAMS: Record<string, any> = {
    'awesome-oscillator': defaultAwesomeOscillatorParams,
    'bollinger-bands': defaultBollingerBandsParams,
    'cci-reversion': defaultCciReversionParams,
    'chaikin-money-flow': defaultChaikinMoneyFlowParams,
    'coppock-curve': defaultCoppockCurveParams,
    'donchian-channels': defaultDonchianChannelsParams,
    'elder-ray-index': defaultElderRayIndexParams,
    'ema-crossover': defaultEmaCrossoverParams,
    'hyper-peak-formation': defaultHyperPFFParams,
    'ichimoku-cloud': defaultIchimokuCloudParams,
    'keltner-channels': defaultKeltnerChannelsParams,
    'macd-crossover': defaultMacdCrossoverParams,
    'momentum-cross': defaultMomentumCrossParams,
    'obv-divergence': defaultObvDivergenceParams,
    'parabolic-sar-flip': defaultParabolicSarFlipParams,
    'peak-formation-fib': defaultPffParams,
    'pivot-point-reversal': defaultPivotPointReversalParams,
    'reverse-pff': defaultReversePffParams,
    'rsi-divergence': defaultRsiDivergenceParams,
    'sma-crossover': defaultSmaCrossoverParams,
    'stochastic-crossover': defaultStochasticCrossoverParams,
    'supertrend': defaultSupertrendParams,
    'volume-delta': defaultVolumeDeltaParams,
    'vwap-cross': defaultVwapCrossParams,
    'williams-r': defaultWilliamsRParams,
    'liquidity-order-flow': defaultLiquidityOrderFlowParams,
    'liquidity-grab': defaultLiquidityGrabParams,
    'ema-cci-macd': defaultEmaCciMacdParams,
    'code-based-consensus': defaultCodeBasedConsensusParams,
    'mtf-engulfing': defaultMtfEngulfingParams,
    'smi-mfi-supertrend': defaultSmiMfiSupertrendParams,
};

export const LabProvider = ({ children }: { children: ReactNode }) => {
  const [strategyParams, setStrategyParams] = useState<Record<string, any>>(DEFAULT_STRATEGY_PARAMS);

  return (
    <LabContext.Provider value={{ 
      strategyParams,
      setStrategyParams,
    }}>
      {children}
    </LabContext.Provider>
  );
};

export const useLab = () => {
  const context = useContext(LabContext);
  if (context === undefined) {
    throw new Error('useLab must be used within a LabProvider');
  }
  return context;
};
