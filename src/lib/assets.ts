import { assetRegistry, AssetPair, AssetInfo } from './asset-registry';

export type { AssetPair, AssetInfo };

export const assetInfo = assetRegistry.getAssetInfo();
export const fullAssetList = assetRegistry.getFullAssetList();
export const allPairs = assetRegistry.getAllPairs();

export const parseSymbolString = (symbol: string) => assetRegistry.parseSymbolString(symbol);
export const getAvailableQuotesForBase = (base: string) => assetRegistry.getAvailableQuotesForBase(base);

export const topBases = assetRegistry.getTopAssets().map(a => a.ticker);
export const topAssets = assetRegistry.getTopAssets();
