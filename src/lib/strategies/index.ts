
import type { Strategy } from '@/lib/types';
import smaCrossoverStrategy from './sma-crossover';
import emaCrossoverStrategy from './ema-crossover';
import rsiDivergenceStrategy from './rsi-divergence';
import peakFormationFibStrategy from './peak-formation-fib';
import reversePffStrategy from './reverse-pff';
import volumeDeltaStrategy from './volume-profile-delta';
import macdCrossoverStrategy from './macd-crossover';
import bollingerBandsStrategy from './bollinger-bands';
import supertrendStrategy from './supertrend';
import donchianChannelStrategy from './donchian-channels';
import ichimokuCloudStrategy from './ichimoku-cloud';
// Import new strategies
import awesomeOscillatorStrategy from './awesome-oscillator';
import cciReversionStrategy from './cci-reversion';
import chaikinMoneyFlowStrategy from './chaikin-money-flow';
import coppockCurveStrategy from './coppock-curve';
import elderRayStrategy from './elder-ray-index';
import heikinAshiTrendStrategy from './heikin-ashi-trend';
import keltnerChannelsStrategy from './keltner-channels';
import momentumCrossStrategy from './momentum-cross';
import obvDivergenceStrategy from './obv-divergence';
import parabolicSarFlipStrategy from './parabolic-sar-flip';
import pivotPointReversalStrategy from './pivot-point-reversal';
import stochasticCrossoverStrategy from './stochastic-crossover';
import vwapCrossStrategy from './vwap-cross';
import williamsRStrategy from './williams-percent-r';
import hyperPeakFormationStrategy from './hyper-peak-formation';


export const strategies: Strategy[] = [
  peakFormationFibStrategy,
  reversePffStrategy,
  hyperPeakFormationStrategy,
  volumeDeltaStrategy,
  smaCrossoverStrategy,
  emaCrossoverStrategy,
  rsiDivergenceStrategy,
  macdCrossoverStrategy,
  bollingerBandsStrategy,
  supertrendStrategy,
  donchianChannelStrategy,
  ichimokuCloudStrategy,
  // Add new strategies to the list
  awesomeOscillatorStrategy,
  cciReversionStrategy,
  chaikinMoneyFlowStrategy,
  coppockCurveStrategy,
  elderRayStrategy,
  heikinAshiTrendStrategy,
  keltnerChannelsStrategy,
  momentumCrossStrategy,
  obvDivergenceStrategy,
  parabolicSarFlipStrategy,
  pivotPointReversalStrategy,
  stochasticCrossoverStrategy,
  vwapCrossStrategy,
  williamsRStrategy,
].sort((a,b) => a.name.localeCompare(b.name));

export const strategyMetadatas = strategies.map(({ id, name }) => ({
  id,
  name,
}));

export const getStrategyById = (id: string): Strategy | undefined => {
  return strategies.find(s => s.id === id);
}
