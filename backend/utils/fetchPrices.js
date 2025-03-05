const CoinGecko = require("coingecko-api");

async function fetchPrices(days = 30, id = 'bitcoin') {
    const CRYPTO_IDS = ['bitcoin', 'ethereum', 'litecoin', 'ripple', 'bitcoin-cash'];
    const CoinGeckoClient = new CoinGecko();

    try {
        // const marketData = {};

        // for (const [symbol, id] of Object.entries(CRYPTO_IDS)) {
        //     const response = await CoinGeckoClient.coins.fetch(id, {
        //         tickers: true,
        //         market_data: true,
        //     })

        //     console.log("Response Data",response.data);

        //     marketData[symbol] = {
        //         name: response.data.name,
        //         symbol: response.data.symbol,
        //         currentPrice: response.data.market_data.current_price.usd,
        //         high24h: response.data.market_data.high_24h.usd,
        //         low24h: response.data.market_data.low_24h.usd,
        //         volume24h: response.data.market_data.total_volume.usd,
        //         priceChange24h: response.data.market_data.price_change_percentage_24h,
        //         marketCap: response.data.market_data.market_cap.usd
        //     }
        // }

        // return marketData;


        
        const priceRes = await CoinGeckoClient.simple.price({
            ids: CRYPTO_IDS,
            vs_currencies: 'usd',
        })

        const chartRes = await CoinGeckoClient.coins.fetchMarketChart(id, {
            vs_currency: 'usd',  
            days: 30,
        })

        const priceData = {
            prices: priceRes.data,
            chartRes,
        };

        return priceData;
    } catch (err) {
        console.error('Error fetching prices:', err);
        return err;
    }
}

module.exports = fetchPrices;