# Copilot Instructions for AlgoTrade Navigator

## Project Overview
AlgoTrade Navigator is an AI-driven platform for developing, backtesting, and deploying automated cryptocurrency trading strategies. It is built with Next.js (App Router), TypeScript, React, ShadCN UI, Tailwind CSS, and integrates with Google AI (Genkit) and Firebase for authentication and hosting.

## Architecture & Key Patterns
- **Strategies**: All trading strategies are modularized in `src/lib/strategies/`. Each strategy implements a `Strategy` interface (see `src/lib/types.ts`) and exposes a `calculate` method for signal generation. Strategies are registered in `all-strategies.ts` and accessed via `getStrategyById`.
- **Data Flow**: Market data (candles, OHLCV) is passed to strategies for signal calculation. Signals are annotated on the data objects and consumed by the UI and trade management logic.
- **Context Providers**: App-wide state (bot, API, auth, data manager) is managed via React context providers in `src/context/`.
- **App Structure**: Pages are organized under `src/app/(app)/` (e.g., `live`, `simulation`, `backtest`, `dashboard`). Each page imports and composes UI and strategy logic.
- **UI Components**: Reusable UI elements are in `src/components/ui/`. Trading and dashboard widgets are in `src/components/` and subfolders.
- **Environment Config**: Sensitive keys and environment-specific settings are managed via `.env` files. See the README for required variables.

## Developer Workflows
- **Install dependencies**: `npm install`
- **Run dev server**: `npm run dev` (Next.js, hot reload)
- **Build for production**: `npm run build`
- **Deploy**: Use Vercel or Firebase App Hosting. See README for details.
- **Add a new strategy**: Implement in `src/lib/strategies/`, export in `all-strategies.ts`, and ensure it matches the `Strategy` type.
- **Debugging**: Use `console.log` in strategy `calculate` methods. Debug output is visible in the terminal during local runs.

## Project-Specific Conventions
- **Strategy IDs**: Each strategy has a unique `id` used for selection and routing.
- **Signal Annotation**: Strategies annotate `buySignal`/`sellSignal` on `HistoricalData` objects.
- **Type Safety**: All data structures are strongly typed in `src/lib/types.ts`.
- **No mock data**: The app expects real market data feeds for live/sim trading.
- **AI Integration**: Genkit and Google AI are used for strategy validation and signal enhancement.

## Integration Points
- **Binance/Exchange API**: Market data and order execution are handled via API routes in `src/app/api/` and service files in `src/lib/`.
- **Firebase**: Used for authentication and (optionally) hosting. Configured via `.env` and `firebase.json`/`apphosting.yaml`.
- **Genkit/Google AI**: Used for AI-powered features. See `src/ai/` and related flows.

## Examples
- To add a new strategy: Copy an existing file in `src/lib/strategies/`, implement the `calculate` method, and register it in `all-strategies.ts`.
- To add a new dashboard widget: Create a component in `src/components/dashboard/` and import it in the relevant page under `src/app/(app)/dashboard/`.

## References
- `README.md`: Setup, environment, and deployment instructions
- `src/lib/types.ts`: Core types and interfaces
- `src/lib/strategies/`: All strategy logic
- `src/context/`: App-wide state management
- `src/app/(app)/`: Main app pages and flows

---

If any section is unclear or missing, please specify what needs to be improved or expanded.
