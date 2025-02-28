import React, { useEffect, useState } from 'react';
import useLivePrice from '../utils/useLivePrice';

function LivePrices() {
  const [item, setItem] = useState(null);
  const price = useLivePrice();

  const handleClick = (crypto) => () => {
    setItem(crypto);
  }

  return (
    <div>
      <h2>Prices:</h2>
      {price ? Object.entries(price).map(([crypto, priceObj]) => (
        <button onClick={handleClick(crypto)} key={crypto}>
          {crypto.charAt(0).toUpperCase() + crypto.slice(1)}: {priceObj.usd}
        </button>
      )) : "Loading..."}
    </div>
  );
}

export default LivePrices;
