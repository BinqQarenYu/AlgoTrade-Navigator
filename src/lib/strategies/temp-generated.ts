
// This file is a placeholder for dynamically generated strategies.
// The functionality related to this has been removed for the V1 release
// to simplify the codebase and will be re-introduced later.

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
