# AlgoTrade Navigator 🚀

AlgoTrade Navigator is a powerful, AI-driven platform for developing, backtesting, and deploying automated cryptocurrency trading strategies. Built with a modern tech stack, it provides a gitcomprehensive toolkit for both novice and experienced algorithmic traders to leverage market data and generative AI.

## Core Features
g
-   **Advanced Backtesting Engine:** Test trading strategies against historical market data with detailed performance reports, including PNL, win rate, and profit factor.
-   **Live Paper Trading:** Forward-test your strategies in a simulated environment using a live market data feed without risking real capital.
-   **Live & Manual Trading Matrix:** Deploy a portfolio of fully automated trading bots or use AI-powered signals for manual trade execution.
-   **AI-Powered Strategy Validation:** Utilize generative AI to validate trade signals during backtests for enhanced accuracy.
-   **Integrated Trading Chart:** Visualize market data, indicators, and trade executions with a feature-rich, lightweight charting library.
-   **Multi-Strategy Support:** Comes pre-loaded with dozens of classic trading strategies like EMA Crossovers, RSI Divergence, Supertrend, and more.

## Tech Stack

-   **Framework:** [Next.js](https://nextjs.org/) (App Router)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **UI:** [React](https://react.dev/), [ShadCN UI](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)
-   **Generative AI:** [Google AI (Gemini) & Genkit](https://firebase.google.com/docs/genkit)
-   **Authentication:** [Firebase Authentication](https://firebase.google.com/docs/auth)
-   **Deployment:** Ready for [Vercel](https://vercel.com) or [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)

## Getting Started

To run this project locally, you'll need to set up your environment variables.

### 1. Environment Configuration

Create a `.env` file in the root of the project and add the following variables.

```env
# Firebase Configuration (Required for Authentication & Deployment)
# Get these from your Firebase project settings
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID

# Google AI (Gemini) API Key (Required for all AI features)
# Get this from Google AI Studio
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

### 2. Install Dependencies

Install the necessary packages using npm:

```bash
npm install
```

### 3. Run the Development Server

Start the local development server:

```bash
npm run dev
```
http://100.120.168.121:3001/dashboard
The application should now be running on [http://localhost:3000](http://localhost:3000).

## Deployment

This application is optimized for easy deployment on modern hosting platforms.

### Deploying to Vercel

1.  Push your code to a Git repository (e.g., GitHub).
2.  Import the repository into your Vercel account.
3.  In the Vercel project settings, add the environment variables from your `.env` file.
4.  Deploy! Vercel will handle the rest.

### Deploying to Firebase App Hosting

1.  Ensure your `.env` file is populated with your Firebase project configuration.
2.  The `apphosting.yaml` and `next.config.ts` files are pre-configured for Firebase App Hosting.
3.  Follow the Firebase App Hosting deployment instructions.
