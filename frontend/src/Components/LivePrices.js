    import React, { useEffect, useState } from 'react';
    import fetchPrices from '../utils/liveprice';

    function LivePrices() {
        const [prices, setPrices] = useState(null);

        useEffect(() => {
            const getPrices = async () => {
                try {
                    console.log("Fetching prices....");
                    const priceData = await fetchPrices();
                    setPrices(priceData);
                    console.log("Set prices data", JSON.stringify(priceData))
                } catch (error) {
                    console.error('WebSocket error:', error);
                }
            };

            getPrices();
        }, []);

        return (
            <div>
                Prices: 
            </div>
        );
    }

    export default LivePrices;
