import { test, describe, expect } from "vitest";
import { parseSymbolString } from "./assets";

describe("parseSymbolString", () => {
    test("parses standard pairs correctly", () => {
        expect(parseSymbolString("BTCUSDT")).toEqual({ base: "BTC", quote: "USDT", symbol: "BTCUSDT" });
        expect(parseSymbolString("ETHUSDC")).toEqual({ base: "ETH", quote: "USDC", symbol: "ETHUSDC" });
        expect(parseSymbolString("BNBBTC")).toEqual({ base: "BNB", quote: "BTC", symbol: "BNBBTC" });
    });

    test("handles separators (/, :)", () => {
        expect(parseSymbolString("BTC/USDT")).toEqual({ base: "BTC", quote: "USDT", symbol: "BTCUSDT" });
        expect(parseSymbolString("ETH:USDC")).toEqual({ base: "ETH", quote: "USDC", symbol: "ETHUSDC" });
        expect(parseSymbolString("SOL/BTC")).toEqual({ base: "SOL", quote: "BTC", symbol: "SOLBTC" });
    });

    test("returns null for unknown quotes", () => {
        expect(parseSymbolString("BTCXYZ")).toBeNull();
        expect(parseSymbolString("SOMETHINGNEW")).toBeNull();
    });

    test("returns null for empty string", () => {
        expect(parseSymbolString("")).toBeNull();
    });

    test("returns null if symbol is exactly the quote (no base)", () => {
        expect(parseSymbolString("USDT")).toBeNull();
        expect(parseSymbolString("BTC")).toBeNull();
        expect(parseSymbolString("/USDT")).toBeNull();
    });

    test("returns null for lowercase or mixed case input due to case sensitivity", () => {
        expect(parseSymbolString("btcusdt")).toBeNull();
        expect(parseSymbolString("BtcUsdt")).toBeNull();
    });

    test("handles multiple separators", () => {
        expect(parseSymbolString("BTC//USDT::")).toEqual({ base: "BTC", quote: "USDT", symbol: "BTCUSDT" });
    });

    test("handles base token that contains quote string", () => {
        expect(parseSymbolString("ETHBTCUSDT")).toEqual({ base: "ETHBTC", quote: "USDT", symbol: "ETHBTCUSDT" });
    });
});
