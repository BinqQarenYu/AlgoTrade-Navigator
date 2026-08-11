import type { Strategy, HistoricalData } from '@/lib/types';

export const defaultSeasonalAnalysisParams = {};

const seasonalAnalysisStrategy: Strategy = {
  id: 'seasonal-analysis',
  name: 'Seasonal Analysis Debug',
  description: 'Calculates the monthly returns by percentage grouped by year for debugging seasonal math.',
  
  async calculate(data: HistoricalData[], params: any = defaultSeasonalAnalysisParams): Promise<any> {
    if (!data || data.length === 0) return { error: 'No data provided' };

    const yearsMap = new Map<number, HistoricalData[]>();
    data.forEach(d => {
      const date = new Date(d.time);
      const year = date.getFullYear();
      if (!yearsMap.has(year)) yearsMap.set(year, []);
      yearsMap.get(year)!.push(d);
    });

    const YEARS = Array.from(yearsMap.keys()).sort((a, b) => b - a);
    
    const tableData = YEARS.map(year => {
      const yearDays = yearsMap.get(year)!;
      const monthlyReturns: (number | null)[] = Array(12).fill(null);
      
      for (let m = 0; m < 12; m++) {
        const monthDays = yearDays.filter(d => {
           const date = new Date(d.time);
           return date.getMonth() === m;
        });
        
        if (monthDays.length > 0) {
          monthDays.sort((a, b) => {
             return a.time - b.time;
          });
          const firstOpen = monthDays[0].open;
          const lastClose = monthDays[monthDays.length - 1].close;
          monthlyReturns[m] = (lastClose - firstOpen) / firstOpen * 100;
        }
      }
      
      return { year, monthlyReturns };
    });

    return { seasonalMatrix: tableData };
  }
};

export default seasonalAnalysisStrategy;
