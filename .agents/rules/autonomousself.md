---
trigger: always_on
glob: "**/*"
description: Autonomous agent execution directives and quantitative algorithmic trading standards for AlgoTrade-Navigator.
---

# Autonomous Self Rule - AlgoTrade-Navigator & Algorithmic Trading Standards

## 1. Autonomous Execution Principles
- **End-to-End Self-Sufficiency**: Diagnose, trace, and fix errors (type errors, lint failures, build errors, test failures) autonomously without waiting for step-by-step guidance.
- **Minimal Diff & Scope Protection**: Make minimal, precise changes necessary to satisfy the prompt. Refuse unrequested refactoring or scope creep.
- **Empirical Verification**: Never declare completion without running verification commands (`npm run typecheck`, `npm run lint`, `npm run test`).
- **Log Inspection**: Always read full un-truncated error logs before diagnosing runtime or build failures.

## 2. Quantitative & Algorithmic Trading Rigor
- **Floating Point Disallowance (`decimal.js`)**:
  - Never use native IEEE 754 floating-point math (`number`) for financial calculations (balances, order amounts, entry/exit prices, PnL, fee calculations, slippage, mark prices).
  - Use `decimal.js` or string-wrapped `Decimal` allocations for all monetary values and trading math.
- **Strict Execution Mode Isolation**:
  - Maintain complete segregation between `BACKTESTING`, `PAPER_TRADING`, and `LIVE_TRADING`.
  - Live exchange credentials (`API_KEY`, `SECRET`) must never be accessible or used within backtest routines or client-side bundles.
- **Exchange Connectivity & Rate Limits (CCXT)**:
  - All outbound multi-exchange transactions must execute asynchronously with proper concurrency handling.
  - Implement defensive rate limiting, exponential backoff, and disconnection recovery for exchange WebSocket/REST streams.
- **Risk Management & Pre-Trade Guardrails**:
  - Enforce pre-trade checks: max position size caps, max portfolio drawdown, circuit breaker trip conditions, and max allowed slippage.
  - Reject order execution immediately if pre-trade risk constraints are violated.

## 3. Tech Stack Conventions (AlgoTrade-Navigator)
- **Next.js 15 App Router**:
  - Keep clear separation between Server Components, Client Components (`'use client'`), and Server Actions.
  - Ensure API routes (`src/app/api/`) sanitize and validate request payloads using Zod.
- **TypeScript & Zod Schema Validation**:
  - Maintain strict TypeScript types. Avoid `any` types; prefer Zod schemas for external API, Genkit flow, and user form inputs.
- **DuckDB & Analytical Pipelines**:
  - Use parameterized DuckDB queries for market data querying and backtest log storage to prevent SQL injection and memory leaks.
- **Genkit AI Integration**:
  - All AI strategy validation flows (`src/ai/`) must return structured Zod outputs and implement fallback mechanisms on model timeouts.
- **UI & Charting Aesthetics**:
  - Use ShadCN UI components, Tailwind CSS, and `lightweight-charts` / `recharts` for quantitative visualizations.
  - Maintain dark theme consistency and rich quantitative dashboard UI aesthetics.

## 4. Verification & Testing Standards
- Run `npm run typecheck` (`tsc --noEmit`) to verify zero TypeScript compilation errors.
- Run `npm run test` (`vitest`) to ensure all quantitative, indicator, and trading logic tests pass clean.
