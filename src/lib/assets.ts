
// A mapping of asset tickers to their full names.
export const assetInfo: Record<string, string> = {
    "BTC": "Bitcoin", "ETH": "Ethereum", "SOL": "Solana", "BNB": "BNB", "XRP": "XRP",
    "DOGE": "Dogecoin", "ADA": "Cardano", "SHIB": "Shiba Inu", "AVAX": "Avalanche",
    "DOT": "Polkadot", "MATIC": "Polygon", "LINK": "Chainlink", "TRX": "TRON",
    "LTC": "Litecoin", "BCH": "Bitcoin Cash", "NEAR": "NEAR Protocol", "UNI": "Uniswap",
    "ATOM": "Cosmos", "ETC": "Ethereum Classic", "FIL": "Filecoin", "PEPE": "Pepe",
    "WIF": "dogwifhat", "NOT": "Notcoin", "TON": "Toncoin", "ORDI": "ORDI", "WLD": "Worldcoin",
    "ARB": "Arbitrum", "APT": "Aptos", "SUI": "Sui", "OP": "Optimism", "INJ": "Injective",
    "AR": "Arweave", "RUNE": "THORChain", "FTM": "Fantom", "AAVE": "Aave", "GRT": "The Graph",
    "MKR": "Maker", "SNX": "Synthetix", "LDO": "Lido DAO", "SAND": "The Sandbox", "MANA": "Decentraland",
    "AXS": "Axie Infinity", "GALA": "Gala", "THETA": "Theta Network", "XTZ": "Tezos", "EOS": "EOS",
    "KSM": "Kusama", "ZEC": "Zcash", "DASH": "Dash", "COMP": "Compound", "CRV": "Curve DAO Token",
    "1INCH": "1inch Network", "DYDX": "dYdX", "GMX": "GMX", "SUSHI": "SushiSwap", "YFI": "yearn.finance",
    "IMX": "Immutable", "BLUR": "Blur", "CELO": "Celo", "FLOKI": "FLOKI", "MEME": "Memecoin",
    "ENA": "Ethena", "W": "Wormhole", "JUP": "Jupiter", "JTO": "Jito", "PYTH": "Pyth Network",
    "BOME": "BOOK OF MEME", "ICP": "Internet Computer", "VET": "VeChain", "XLM": "Stellar",
    "HBAR": "Hedera", "ALGO": "Algorand", "EGLD": "MultiversX", "FLOW": "Flow", "CHZ": "Chiliz", "MINA": "Mina",
    "OM": "MANTRA", "NEWT": "Newt", "VIC": "VIC"
};

export const fullAssetList = [
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "SHIBUSDT", "AVAXUSDT", "DOTUSDT",
    "MATICUSDT", "LINKUSDT", "TRXUSDT", "LTCUSDT", "BCHUSDT", "NEARUSDT", "UNIUSDT", "ATOMUSDT", "ETCUSDT", "FILUSDT",
    "PEPEUSDT", "WIFUSDT", "NOTUSDT", "TONUSDT", "ORDIUSDT", "WLDUSDT", "ARBUSDT", "APTUSDT", "SUIUSDT", "OPUSDT",
    "INJUSDT", "ARUSDT", "RUNEUSDT", "FTMUSDT", "AAVEUSDT", "GRTUSDT", "MKRUSDT", "SNXUSDT", "LDOUSDT", "SANDUSDT",
    "MANAUSDT", "AXSUSDT", "GALAUSDT", "THETAUSDT", "XTZUSDT", "EOSUSDT", "KSMUSDT", "ZECUSDT", "DASHUSDT", "COMPUSDT",
    "CRVUSDT", "1INCHUSDT", "DYDXUSDT", "GMXUSDT", "SUSHIUSDT", "YFIUSDT", "IMXUSDT", "BLURUSDT", "CELOUSDT", "FLOKIUSDT",
    "MEMEUSDT", "ENAUSDT", "WUSDT", "JUPUSDT", "JTOUSDT", "PYTHUSDT", "BOMEUSDT", "ICPUSDT", "VETUSDT", "XLMUSDT",
    "HBARUSDT", "ALGOUSDT", "EGLDUSDT", "FLOWUSDT", "CHZUSDT", "MINAUSDT", "OMUSDT", "NEWTUSDT", "VICUSDT",
    // Add some pairs with other quotes
    "ETHBTC", "BNBBTC", "SOLBTC", "XRPBTC", "ADABTC", "DOTBTC", "LINKBTC", "LTCBTC",
    "BNBETH", "TRXETH", "SOLETH",
    "BTCUSDC", "ETHUSDC", "SOLUSDC", "BNBUSDC",
];

export interface AssetPair {
    base: string;
    quote: string;
    symbol: string; // e.g. BTCUSDT
}

// Longer quotes first to avoid mis-parsing (e.g. BTC ends with C, but USDC is the quote)
const KNOWN_QUOTES = ['USDT', 'USDC', 'FDUSD', 'TUSD', 'BUSD', 'BTC', 'ETH', 'BNB'];

export function parseSymbolString(symbol: string): AssetPair | null {
    for (const quote of KNOWN_QUOTES) {
        if (symbol.endsWith(quote) && symbol.length > quote.length) {
            const base = symbol.slice(0, -quote.length);
            if (base) {
                return { base, quote, symbol };
            }
        }
    }
    return null;
}

export const allPairs: AssetPair[] = fullAssetList.map(parseSymbolString).filter((p): p is AssetPair => p !== null);

export const getAvailableQuotesForBase = (base: string): string[] => {
    return allPairs.filter(p => p.base === base).map(p => p.quote).sort();
};

export const getAvailableBases = (): string[] => {
    const bases = allPairs.map(p => p.base);
    return [...new Set(bases)].sort();
};

export const pairsByBase = allPairs.reduce((acc, pair) => {
    if (!acc[pair.base]) {
        acc[pair.base] = [];
    }
    acc[pair.base].push(pair.quote);
    acc[pair.base].sort();
    return acc;
}, {} as Record<string, string[]>);


// A curated list of top assets for simpler dropdowns.
export const topBases = [
    "BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "ADA", "AVAX", "DOT",
    "LINK", "MATIC", "LTC", "NEAR", "UNI", "ATOM", "ETC", "FIL", "APT", "SUI", "OP",
    "PEPE", "WIF", "TON", "ORDI", "WLD", "ARB", "OM", "NEWT", "VIC"
].sort();

// New export for UI components
export const topAssets = topBases.map(ticker => ({
    ticker,
    name: assetInfo[ticker] || ticker
}));
