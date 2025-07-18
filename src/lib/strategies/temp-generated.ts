
// This file is a placeholder for dynamically generated strategies.
// The Strategy Maker will overwrite this file with the code for the latest
// strategy approved by the user, allowing the backtesting engine to import it.

import type { Strategy } from '@/lib/types';

const tempGeneratedStrategy: Strategy = {
    id: 'temp-generated-placeholder',
    name: 'Placeholder (No Strategy Generated)',
    description: 'This is a placeholder and should be overwritten by the Strategy Maker.',
    async calculate(data) {
        // Return data without any signals if this placeholder is ever used.
        return data;
    },
};

export default tempGeneratedStrategy;
