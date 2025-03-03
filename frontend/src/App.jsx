import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend  } from 'recharts';

function App() {
  const [orderBook, setOrderBook] = useState({
    'BTC/USD': { bids: [], asks: [] },
    'ETH/USD': { bids: [], asks: [] },
    'LTC/USD': { bids: [], asks: [] },
    'XRP/USD': { bids: [], asks: [] },
    'BCH/USD': { bids: [], asks: [] }
  });
  const [trades, setTrades] = useState([]);
  const [priceUpdates, setPriceUpdates] = useState({});
  const [ chartType, setChartType ] = useState();
  const [chartUpdate, setChartUpdate] = useState({
    'BTC/USD': [],
    'ETH/USD': [],
    'LTC/USD': [],
    'XRP/USD': [],
    'BCH/USD': []
  });
  const [order, setOrder] = useState({ pair: 'BTC/USD', side: 'buy', orderType: 'market', amount: '', price: '' });
  const wsRef = useRef(null); // Reference to store the WebSocket connection

  useEffect(() => {
    wsRef.current = new WebSocket('ws://localhost:8080');

    wsRef.current.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      console.log("data from server", data);
      if (type === 'price_update') {
        const priceData = {};
        Object.entries(data).map(([key, value]) => {
          if (key === "bitcoin") {
            priceData["BTC/USD"] = value;
            setChartUpdate(prev => ({
              ...prev,
              'BTC/USD': [...prev['BTC/USD'], {
                time: new Date().toLocaleTimeString(),
                price: value["usd"]
              }].slice(-30) // Keep last 30 data points
            }));
          } else if (key === "ethereum") {
            priceData["ETH/USD"] = value;
            setChartUpdate(prev => ({
              ...prev,
              'ETH/USD': [...prev['ETH/USD'], {
                time: new Date().toLocaleTimeString(),
                price: value["usd"]
              }].slice(-30) // Keep last 30 data points
            }));
          } else if (key === "litecoin") {
            priceData["LTC/USD"] = value;
            setChartUpdate(prev => ({
              ...prev,
              'LTC/USD': [...prev['LTC/USD'], {
                time: new Date().toLocaleTimeString(),
                price: value["usd"]
              }].slice(-30) // Keep last 30 data points
            }));
          } else if (key === "ripple") {
            priceData["XRP/USD"] = value;
            setChartUpdate(prev => ({
              ...prev,
              'XRP/USD': [...prev['XRP/USD'], {
                time: new Date().toLocaleTimeString(),
                price: value["usd"]
              }].slice(-30) // Keep last 30 data points
            }));
          } else if (key === "bitcoin-cash") {
            priceData["BCH/USD"] = value;
            setChartUpdate(prev => ({
              ...prev,
              'BCH/USD': [...prev['BCH/USD'], {
                time: new Date().toLocaleTimeString(),
                price: value["usd"]
              }].slice(-30) // Keep last 30 data points
            }));
          }
        })
        setPriceUpdates(priceData);
      }
      if (type === 'order_book') {
        // Update the specific pair in the order book
        console.log("Order Book Data", data);

        setOrderBook(prevOrderBook => ({
          ...prevOrderBook,
          [data.pair]: { 
            bids: data.bids ? [...data.bids].sort((a, b) => b.price - a.price) : [], // Sort bids descending
            asks: data.asks ? [...data.asks].sort((a, b) => a.price - b.price) : []  // Sort asks ascending
          }
        }));
      }
      if (type === 'trade') {
        setTrades(data);
      }
      if (type === 'error') {
        const errorMessage = data?.message || 'An unknown error occurred'; // Safely handle undefined data
        console.error('Error from backend:', errorMessage);
        alert(`Order submission failed: ${errorMessage}`); // Show error to user
      }
    };

    // wsRef.current.onclose = () => {
    //   console.log('WebSocket disconnected');
    // };

    // Clean up on unmount
    // return () => wsRef.current.close();
  }, []);

  const placeOrder = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Sending order:', { type: 'place_order', data: { userId: 1, ...order } }); // Debug log
      wsRef.current.send(JSON.stringify({ type: 'place_order', data: { userId: 1, ...order } }));
    } else {
      console.error('WebSocket not connected');
    }
  };

  const handleChartTypeChange = (e) => {
    const selectedPair = e.target.value;
    
    setChartType(selectedPair);
    
    // Send WebSocket message for chart update
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
            type: 'chart_update',
            data: { pair: selectedPair }
        }));

        console.log("Sent chart update for", selectedPair);
    } else {
      console.log("Web Socket Closed");
    }

  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Trading Page</h1>

      {/* Live Prices */}
      <h2>Live Prices</h2>
      <ul>
      {priceUpdates ? Object.entries(priceUpdates).map(([crypto, priceObj]) => (
          <li key={crypto}>{crypto}: ${priceObj.usd}</li>
        )) : "Loading..."}
      </ul>

      {/* Order Book (BTC/USD) */}
      <h2>Order Book (BTC/USD)</h2>
      <div>
        <h3>Bids</h3>
        <ul>
          {orderBook['BTC/USD']?.bids?.map((bid, i) => (
            <li key={i}>{bid.amount} @ ${bid.price.toFixed(2)}</li>
          ))}
        </ul>
        <h3>Asks</h3>
        <ul>
          {orderBook['BTC/USD']?.asks?.map((ask, i) => (
            <li key={i}>{ask.amount} @ ${ask.price.toFixed(2)}</li>
          ))}
        </ul>
      </div>

      {/* Trade History */}
      <h2>Trade History</h2>
      <ul>
        {trades.map((trade, i) => (
          <li key={i}>{trade.pair}: {trade.amount} @ ${trade.price} ({new Date(trade.executed_at).toLocaleTimeString()})</li>
        ))}
      </ul>

      {/* Place Order */}
      <h2>Place Order</h2>
      <select onChange={e => setOrder({ ...order, pair: e.target.value })}>
        <option value="BTC/USD">BTC/USD</option>
        <option value="ETH/USD">ETH/USD</option>
        <option value="LTC/USD">LTC/USD</option>
        <option value="XRP/USD">XRP/USD</option>
        <option value="BCH/USD">BCH/USD</option>
      </select>
      <select onChange={e => setOrder({ ...order, side: e.target.value })}>
        <option value="buy">Buy</option>
        <option value="sell">Sell</option>
      </select>
      <select onChange={e => setOrder({ ...order, orderType: e.target.value })}>
        <option value="market">Market</option>
        <option value="limit">Limit</option>
      </select>
      <input placeholder="Amount" value={order.amount} onChange={e => setOrder({ ...order, amount: e.target.value })} />
      {order.orderType === 'limit' && (
        <input placeholder="Price" value={order.price} onChange={e => setOrder({ ...order, price: e.target.value })} />
      )}
      <button onClick={placeOrder}>Submit Order</button>

      <h2>Price Charts</h2>
      
      {/** Select Token Type for Chart */} 
      <select onChange={handleChartTypeChange} value={chartType}>
        <option value="BTC/USD">BTC/USD</option>
        <option value="ETH/USD">ETH/USD</option>
        <option value="LTC/USD">LTC/USD</option>
        <option value="XRP/USD">XRP/USD</option>
        <option value="BCH/USD">BCH/USD</option>
      </select>
      <LineChart width={800} height={400} data={chartUpdate[order.pair]}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis domain={['auto', 'auto']} />
        <Tooltip />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="price" 
          stroke="#8884d8" 
          dot={false} 
          name={order.pair}
        />
      </LineChart>

    </div>
  );
}

export default App;
