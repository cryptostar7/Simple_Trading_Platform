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
  const [ chartType, setChartType ] = useState("BTC/USD");
  const [chartUpdate, setChartUpdate] = useState({
    'BTC/USD': [],
    'ETH/USD': [],
    'LTC/USD': [],
    'XRP/USD': [],
    'BCH/USD': []
  });
  const [candleData, setCandleData] = useState([]);
  const [order, setOrder] = useState({ pair: 'BTC/USD', side: 'buy', orderType: 'market', amount: '', price: '' });
  const wsRef = useRef(null); // Reference to store the WebSocket connection

  useEffect(() => {
    try {
      wsRef.current = new WebSocket('ws://localhost:8080');

      wsRef.current.onmessage = (event) => {
        const { type, data } = JSON.parse(event.data);
        if (type === 'price_update') {
          const priceData = {};
          Object.entries(data).map(([key, value]) => {
            priceData[key] = value;
          });
          setPriceUpdates(priceData);
          // const chartData = chartRes.data.prices.map((price) => ({  
          //   date: new Date(price[0]).toLocaleDateString(),  
          //   price: price[1],  
          // }));  
          // setCandleData(chartData);
          
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
    } catch (err) {
      console.log(err);
    }
    

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
          <li key={crypto}>{crypto}: ${priceObj}</li>
        )) : "Loading..."}
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

      {/* Order Book (BTC/USD) */}
      <h2>Order Book ({chartType})</h2>
      <div>
        <h3>Bids</h3>
        <ul>
          {orderBook[chartType]?.bids?.map((bid, i) => (
            <li key={i}>{bid.amount} @ ${bid.price.toFixed(2)}</li>
          ))}
        </ul>
        <h3>Asks</h3>
        <ul>
          {orderBook[chartType]?.asks?.map((ask, i) => (
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


      <h1>{chartType} Price Chart</h1>  
      <LineChart width={600} height={300} data={candleData}>  
        <CartesianGrid strokeDasharray="3 3" />  
        <XAxis dataKey="date" />  
        <YAxis />  
        <Tooltip />  
        <Legend />  
        <Line type="monotone" dataKey="price" stroke="#8884d8" />  
      </LineChart>

    </div>
  );
}

export default App;
