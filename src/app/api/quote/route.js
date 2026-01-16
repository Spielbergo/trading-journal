export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return Response.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    // Try Yahoo Finance first
    try {
      const yahooFinance = (await import('yahoo-finance2')).default;
      const quote = await yahooFinance.quote(symbol);
      
      if (quote && quote.regularMarketPrice) {
        return Response.json({
          symbol: quote.symbol,
          price: quote.regularMarketPrice,
          change: quote.regularMarketChange || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          source: 'yahoo'
        });
      }
    } catch (yahooError) {
      console.log('Yahoo Finance failed, trying fallback:', yahooError.message);
    }

    // Fallback: Try Finnhub if you have API key
    const finnhubKey = process.env.FINNHUB_API_KEY;
    if (finnhubKey) {
      const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubKey}`);
      if (response.ok) {
        const data = await response.json();
        if (data.c) {
          return Response.json({
            symbol: symbol,
            price: data.c,
            change: data.d || 0,
            changePercent: data.dp || 0,
            source: 'finnhub'
          });
        }
      }
    }

    // If both fail, return error
    return Response.json({ 
      error: 'Unable to fetch quote from any source. Please try again or enter price manually.',
    }, { status: 503 });

  } catch (error) {
    console.error('Error fetching quote for', symbol, ':', error.message);
    return Response.json({ 
      error: 'Failed to fetch quote',
      details: error.message 
    }, { status: 500 });
  }
}
