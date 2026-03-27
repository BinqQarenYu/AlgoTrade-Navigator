async function getTop50() {
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
    const data = await response.json();
    
    const usdtPairs = data
      .filter(item => item.symbol.endsWith('USDT') && !item.symbol.includes('UP') && !item.symbol.includes('DOWN'))
      .map(item => ({
        symbol: item.symbol,
        volume: parseFloat(item.quoteVolume),
        price: parseFloat(item.lastPrice),
        change: parseFloat(item.priceChangePercent)
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 50);

    console.log(JSON.stringify(usdtPairs, null, 2));
  } catch (err) {
    console.error('Error fetching Binance data:', err);
  }
}

getTop50();
