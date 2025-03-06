import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend  } from 'recharts';
import { TradingViewChart } from './Components/TradingView';

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
  const [chartType, setChartType ] = useState("BTC/USD");
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
        }
        if (type === 'order_book') {
          // Update the specific pair in the order book
          console.log("Order Book Data", data);
  
          setOrderBook(data);
        }
        if (type === 'trade') {
          console.log("Trade Data", data);
          setTrades(data);
        }
        if (type === 'chart_data') {
          const filter_res = data.filter(item => item.pair === chartType);
          const formatData = filter_res.map(item => ({
            date: item.ordered_at,
            price: item.price
          })) ;
          console.log("Formatted Chart Data", formatData);

          setCandleData(formatData);
        }

        if (type === 'error') {
          const errorMessage = data?.message || 'An unknown error occurred'; // Safely handle undefined data
          console.error('Error from backend:', errorMessage);
          alert(`Order submission failed: ${errorMessage}`); // Show error to user
        }
      };

      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
      }

    } catch (err) {
      console.log(err);
    }
  }, [chartType]);

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
    console.log("Selected Pair:", selectedPair);
    setChartType(selectedPair);
  };

  return (
    <div style={{ padding: '20px'}}>
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
            <li key={i}>{parseFloat(bid.amount).toFixed(2)} @ ${parseFloat(bid.price).toFixed(2)}</li>
          ))}
        </ul>
        <h3>Asks</h3>
        <ul>
          {orderBook[chartType]?.asks?.map((ask, i) => (
            <li key={i}>{parseFloat(ask.amount).toFixed(2)} @ ${parseFloat(ask.price).toFixed(2)}</li>
          ))}
        </ul>
      </div>

      {/* Trade History */}
      <h2>Trade History</h2>
      <ul>
        {trades.map((trade, i) => (
          <li key={i}>{trade.pair}: {parseFloat(trade.amount).toFixed(2)} @ ${parseFloat(trade.price).toFixed(2)} ({new Date(trade.executed_at).toLocaleTimeString()})</li>
        ))}
      </ul>


      {/* <h1>{chartType} Price Chart</h1>
      <LineChart width={1000} height={600} data={candleData}>  
        <CartesianGrid strokeDasharray="3 3" />  
        <XAxis dataKey="date" />  
        <YAxis 
          domain={[
            0,
            dataMax => Math.ceil(Math.max(...candleData.map(item => item.price)) * 1.2) // Extends 20% above max value
          ]}
        /> 
        <Tooltip />  
        <Legend />  
        <Line type="monotone" dataKey="price" stroke="#8884d8" />  
      </LineChart> */}


      <TradingViewChart data={candleData} />

    </div>
  );
}

export default App;
