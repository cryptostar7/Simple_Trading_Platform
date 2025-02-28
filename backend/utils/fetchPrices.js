const CoinGecko = require("coingecko-api");

async function fetchPrices() {
    const CRYPTO_IDS = ['bitcoin', 'ethereum', 'litecoin', 'ripple', 'bitcoin-cash'];
    const CoinGeckoClient = new CoinGecko();

    try {
        const response = await CoinGeckoClient.simple.price({
            ids: CRYPTO_IDS,
            vs_currencies: 'usd',
        })

        const priceData = {
            timestamp: Date.now(),
            prices: response.data
        };

        return priceData.prices;
    } catch (err) {
        console.error('Error fetching prices:', err);
        return err;
    }
}

module.exports = fetchPrices;