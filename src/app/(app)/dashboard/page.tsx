import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { OpenPositions } from "@/components/dashboard/open-positions";
import { TradeHistory } from "@/components/dashboard/trade-history";
import { portfolio, openPositions, tradeHistory } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PortfolioSummary 
        balance={portfolio.balance} 
        totalPnl={portfolio.totalPnl} 
        dailyVolume={portfolio.dailyVolume} 
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
            <OpenPositions positions={openPositions} />
        </div>
        <div className="lg:col-span-2">
            <TradeHistory trades={tradeHistory} />
        </div>
      </div>
    </div>
  );
}
