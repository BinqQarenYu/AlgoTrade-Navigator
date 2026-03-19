export interface AssetPair {
    base: string;
    quote: string;
    symbol: string; // e.g. BTCUSDT
}

export interface AssetInfo {
    ticker: string;
    name: string;
}

export class AssetRegistry {
    private assetInfo: Record<string, string>;
    private fullAssetList: string[];
    private knownQuotes: string[];
    private allPairs: AssetPair[];
    private topBases: string[];

    constructor() {
        // A mapping of asset tickers to their full names.
        this.assetInfo = {
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
            "HBAR": "Hedera", "ALGO": "Algorand", "EGLD": "MultiversX", "FLOW": "Flow", "CHZ": "Chiliz",
            "MINA": "Mina", "HYPER": "Hyper", "SAHARA": "Sahara"
        };

        this.fullAssetList = [
            "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "SHIBUSDT", "AVAXUSDT", "DOTUSDT",
            "MATICUSDT", "LINKUSDT", "TRXUSDT", "LTCUSDT", "BCHUSDT", "NEARUSDT", "UNIUSDT", "ATOMUSDT", "ETCUSDT", "FILUSDT",
            "PEPEUSDT", "WIFUSDT", "NOTUSDT", "TONUSDT", "ORDIUSDT", "WLDUSDT", "ARBUSDT", "APTUSDT", "SUIUSDT", "OPUSDT",
            "INJUSDT", "ARUSDT", "RUNEUSDT", "FTMUSDT", "AAVEUSDT", "GRTUSDT", "MKRUSDT", "SNXUSDT", "LDOUSDT", "SANDUSDT",
            "MANAUSDT", "AXSUSDT", "GALAUSDT", "THETAUSDT", "XTZUSDT", "EOSUSDT", "KSMUSDT", "ZECUSDT", "DASHUSDT", "COMPUSDT",
            "CRVUSDT", "1INCHUSDT", "DYDXUSDT", "GMXUSDT", "SUSHIUSDT", "YFIUSDT", "IMXUSDT", "BLURUSDT", "CELOUSDT", "FLOKIUSDT",
            "MEMEUSDT", "ENAUSDT", "WUSDT", "JUPUSDT", "JTOUSDT", "PYTHUSDT", "BOMEUSDT", "ICPUSDT", "VETUSDT", "XLMUSDT",
            "HBARUSDT", "ALGOUSDT", "EGLDUSDT", "FLOWUSDT", "CHZUSDT", "MINAUSDT", "HYPERUSDT", "SAHARAUSDT",
            // Add some pairs with other quotes
            "ETHBTC", "BNBBTC", "SOLBTC", "XRPBTC", "ADABTC", "DOTBTC", "LINKBTC", "LTCBTC",
            "BNBETH", "TRXETH", "SOLETH",
            "BTCUSDC", "ETHUSDC", "SOLUSDC", "BNBUSDC",
        ];

        this.knownQuotes = ['USDT', 'USDC', 'FDUSD', 'TUSD', 'BUSD', 'BTC', 'ETH', 'BNB'];

        this.allPairs = this.fullAssetList.map(this.parseSymbolString.bind(this)).filter((p): p is AssetPair => p !== null);

        this.topBases = [
            "BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "ADA", "AVAX", "DOT",
            "LINK", "MATIC", "LTC", "NEAR", "UNI", "ATOM", "ETC", "FIL", "APT", "SUI", "OP",
            "PEPE", "WIF", "TON", "ORDI", "WLD", "ARB", "HYPER", "SAHARA"
        ].sort();
    }

    // Longer quotes first to avoid mis-parsing (e.g. BTC ends with C, but USDC is the quote)
    public parseSymbolString(symbol: string): AssetPair | null {
        const cleanSymbol = symbol.replace('/', '').replace(':', '');
        for (const quote of this.knownQuotes) {
            if (cleanSymbol.endsWith(quote) && cleanSymbol.length > quote.length) {
                const base = cleanSymbol.slice(0, -quote.length);
                if (base) {
                    return { base, quote, symbol: cleanSymbol };
                }
            }
        }
        return null;
    }

    public getAvailableQuotesForBase(base: string): string[] {
        return this.allPairs.filter(p => p.base === base).map(p => p.quote).sort();
    }

    public getAvailableBases(): string[] {
        const bases = this.allPairs.map(p => p.base);
        return [...new Set(bases)].sort();
    }

    public getTopAssets(): AssetInfo[] {
        return this.topBases.map(ticker => ({
            ticker,
            name: this.assetInfo[ticker] || ticker
        }));
    }

    public getAllPairs(): AssetPair[] {
        return this.allPairs;
    }

    public getAssetInfo(): Record<string, string> {
        return this.assetInfo;
    }

    public getFullAssetList(): string[] {
        return this.fullAssetList;
    }
}

// Singleton instance as the Single Source of Truth
export const assetRegistry = new AssetRegistry();
