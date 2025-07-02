
import type { Position, Trade, Portfolio } from './types';

// This file is being phased out in favor of live API data.
// The exports are kept to prevent build errors during transition.

export const portfolio: Portfolio | null = null;
export const openPositions: Position[] = [];
export const tradeHistory: Trade[] = [];

    