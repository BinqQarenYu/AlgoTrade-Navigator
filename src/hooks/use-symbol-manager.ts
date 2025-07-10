
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { topAssets, getAvailableQuotesForBase, parseSymbolString } from '@/lib/assets';
import { useToast } from '@/hooks/use-toast';

export function useSymbolManager(
    pageKey: string,
    defaultBase: string,
    defaultQuote: string
) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [baseAsset, setBaseAsset] = usePersistentState<string>(`${pageKey}-base-asset`, defaultBase);
    const [quoteAsset, setQuoteAsset] = usePersistentState<string>(`${pageKey}-quote-asset`, defaultQuote);

    const [availableQuotes, setAvailableQuotes] = useState<string[]>([]);
    const symbol = useMemo(() => `${baseAsset}${quoteAsset}`, [baseAsset, quoteAsset]);

    // Effect to handle symbol changes from URL query parameters
    useEffect(() => {
        const symbolFromQuery = searchParams.get('symbol');
        if (symbolFromQuery) {
            const parsed = parseSymbolString(symbolFromQuery);
            if (parsed && (parsed.base !== baseAsset || parsed.quote !== quoteAsset)) {
                setBaseAsset(parsed.base);
                setQuoteAsset(parsed.quote);
                toast({
                    title: "Asset Loaded",
                    description: `Now analyzing ${parsed.base}/${parsed.quote}.`,
                });
                
                // Clean the URL by removing the symbol query parameter after processing
                const newParams = new URLSearchParams(searchParams.toString());
                newParams.delete('symbol');
                router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
            }
        }
    }, [searchParams, baseAsset, quoteAsset, setBaseAsset, setQuoteAsset, toast, pathname, router]);


    // Effect to update available quotes when base asset changes
    useEffect(() => {
        const quotes = getAvailableQuotesForBase(baseAsset);
        setAvailableQuotes(quotes);
        if (!quotes.includes(quoteAsset)) {
            setQuoteAsset(quotes[0] || '');
        }
    }, [baseAsset, quoteAsset, setQuoteAsset]);

    const handleBaseAssetChange = useCallback((newBase: string) => {
        setBaseAsset(newBase);
    }, [setBaseAsset]);

    const handleQuoteAssetChange = useCallback((newQuote: string) => {
        setQuoteAsset(newQuote);
    }, [setQuoteAsset]);

    return {
        baseAsset,
        quoteAsset,
        symbol,
        availableQuotes,
        handleBaseAssetChange,
        handleQuoteAssetChange
    };
}
