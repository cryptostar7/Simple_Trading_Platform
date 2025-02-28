    import React, { useEffect, useState } from 'react';
    import fetchPrices from '../utils/liveprice';

    function LivePrices() {
        const [prices, setPrices] = useState(null);

        useEffect(() => {
            const getPrices = async () => {
                try {
                    console.log("Fetching prices....");
                    const priceData = await fetchPrices();
                    console.log("><<<><><", JSON.stringify(priceData.data));
                    setPrices(priceData.data);
                } catch (error) {
                    console.error('WebSocket error:', error);
                }
            };

            getPrices();
        }, []);

        return (
            <div>
                <h2>Prices:</h2> {prices}
                {/* {prices && Object.entries(prices).map(([crypto, priceObj]) => (
                    <div key={crypto}>
                        {crypto.charAt(0).toUpperCase() + crypto.slice(1)}: {priceObj.usd}
                    </div>
                ))} */}
            </div>
        );
    }

    export default LivePrices;
