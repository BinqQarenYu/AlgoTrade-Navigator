
import type { Strategy } from '@/lib/types';
import smaCrossoverStrategy from './sma-crossover';
import emaCrossoverStrategy from './ema-crossover';
import rsiDivergenceStrategy from './rsi-divergence';
import peakFormationFibStrategy from './peak-formation-fib';
import volumeDeltaStrategy from './volume-delta';
import macdCrossoverStrategy from './macd-crossover';
import bollingerBandsStrategy from './bollinger-bands';
import supertrendStrategy from './supertrend';
import donchianChannelStrategy from './donchian-channels';
import ichimokuCloudStrategy from './ichimoku-cloud';
import awesomeOscillatorStrategy from './awesome-oscillator';
import cciReversionStrategy from './cci-reversion';
import chaikinMoneyFlowStrategy from './chaikin-money-flow';
import coppockCurveStrategy from './coppock-curve';
import elderRayStrategy from './elder-ray-index';
import keltnerChannelsStrategy from './keltner-channels';
import momentumCrossStrategy from './momentum-cross';
import obvDivergenceStrategy from './obv-divergence';
import parabolicSarFlipStrategy from './parabolic-sar-flip';
import pivotPointReversalStrategy from './pivot-point-reversal';
import stochasticCrossoverStrategy from './stochastic-crossover';
import vwapCrossStrategy from './vwap-cross';
import williamsRStrategy from './williams-percent-r';
import hyperPeakFormationStrategy from './hyper-peak-formation';
import hyperPeakFormationOldStrategy from './hyper-peak-formation-old';
import liquidityOrderFlowStrategy from './liquidity-order-flow';
import liquidityGrabStrategy from './liquidity-grab';
import emaCciMacdStrategy from './ema-cci-macd';
import codeBasedConsensusStrategy from './code-based-consensus';
import mtfEngulfingStrategy from './mtf-engulfing';
import smiMfiSupertrendStrategy from './smi-mfi-supertrend';
import smiMfiScalpStrategy from './smi-mfi-scalp';

export const strategies: Strategy[] = [
  codeBasedConsensusStrategy,
  peakFormationFibStrategy,
  hyperPeakFormationStrategy,
  hyperPeakFormationOldStrategy,
  liquidityOrderFlowStrategy,
  liquidityGrabStrategy,
  volumeDeltaStrategy,
  smaCrossoverStrategy,
  emaCrossoverStrategy,
  rsiDivergenceStrategy,
  macdCrossoverStrategy,
  bollingerBandsStrategy,
  supertrendStrategy,
  donchianChannelStrategy,
  ichimokuCloudStrategy,
  awesomeOscillatorStrategy,
  cciReversionStrategy,
  chaikinMoneyFlowStrategy,
  coppockCurveStrategy,
  elderRayStrategy,
  keltnerChannelsStrategy,
  momentumCrossStrategy,
  obvDivergenceStrategy,
  parabolicSarFlipStrategy,
  pivotPointReversalStrategy,
  stochasticCrossoverStrategy,
  vwapCrossStrategy,
  williamsRStrategy,
  emaCciMacdStrategy,
  mtfEngulfingStrategy,
  smiMfiSupertrendStrategy,
  smiMfiScalpStrategy,
].sort((a,b) => a.name.localeCompare(b.name));

export const getStrategyById = (id: string): Strategy | undefined => {
  return strategies.find(s => s.id === id);
};
