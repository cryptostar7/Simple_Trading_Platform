const CoinGecko = require("coingecko-api");

async function chartPrices(days = 30, id = 'bitcoin') {
    const CRYPTO_IDS = ['bitcoin', 'ethereum', 'litecoin', 'ripple', 'bitcoin-cash'];
    const CoinGeckoClient = new CoinGecko();

    try {

        const chartRes = await CoinGeckoClient.coins.fetchMarketChart(id, {
            vs_currency: 'usd',  
            days: days, 
        })

        return chartRes;
    } catch (err) {
        console.error('Error fetching prices:', err);
        return err;
    }
}

module.exports = fetchPrices;