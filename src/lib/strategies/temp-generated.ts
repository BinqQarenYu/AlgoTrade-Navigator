// This file is a placeholder for dynamically generated strategies.
// It is NOT imported by default to prevent build errors. The backtest page
// will load the strategy from localStorage when needed.

import type { Strategy } from '@/lib/types';

const tempGeneratedStrategy: Strategy = {
    id: 'temp-generated-placeholder',
    name: 'Placeholder (No Strategy Generated)',
    description: 'This is a placeholder and should not be used directly.',
    async calculate(data) {
        // Return data without any signals if this placeholder is ever used.
        return data;
    },
};

export default tempGeneratedStrategy;
