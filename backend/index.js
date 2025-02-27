const WebSocket = require('ws');
const mysql = require('mysql2/promise');
const express = require('express');
const app = express();
const wss = new WebSocket.Server({ port: 8080 });
require('dotenv').config();

// MySQL connection pool with your credentials
const pool = mysql.createPool({
    host: process.env.MY_SQL_HOST,          // Your hostname
    user: process.env.MY_SQL_USER_NAME,                // Your username
    password: process.env.MY_SQL_PASSWORD, // Your password
    database: 'trading_db',        // Your database name
    connectionLimit: 10            // Adjust as needed
});

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Successfully connected to trading_db');
        connection.release();
    } catch (err) {
        console.error('Database connection failed:', err.message);
    }
}
testConnection();

// In-memory order book and trades
const orderBook = {
    'BTC/USD': { bids: [], asks: [] },
    'ETH/USD': { bids: [], asks: [] },
    'LTC/USD': { bids: [], asks: [] },
    'XRP/USD': { bids: [], asks: [] },
    'BCH/USD': { bids: [], asks: [] }
};
const trades = [];

// Simulate price updates every 5 seconds
const tradingPairs = ['BTC/USD', 'ETH/USD', 'LTC/USD', 'XRP/USD', 'BCH/USD'];
setInterval(() => {
    const updates = tradingPairs.map(pair => ({
        pair,
        price: (Math.random() * 10000).toFixed(2) // Dummy price generator
    }));
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'price_update', data: updates }));
        }
    });
}, 5000);

// WebSocket connection handler
wss.on('connection', ws => {
    console.log('Client connected');

    ws.on('message', async message => {
        const { type, data } = JSON.parse(message);
        console.log('Received message:', { type, data }); // Debug log

        if (type === 'place_order') {
            const { userId, pair, orderType, amount, price, side } = data;

            try {
                // Validate order data
                if (!userId || !pair || !orderType || !amount || (orderType === 'limit' && !price) || !side) {
                    throw new Error('Missing or invalid order parameters: ' + JSON.stringify({ userId, pair, orderType, amount, price, side }));
                }

                // Ensure amount and price are valid numbers
                const orderAmount = parseFloat(amount);
                const orderPrice = orderType === 'limit' ? parseFloat(price) : null;

                if (isNaN(orderAmount) || (orderType === 'limit' && isNaN(orderPrice))) {
                    throw new Error(`Invalid number format: amount=${amount}, price=${price}`);
                }

                if (orderAmount <= 0) {
                    throw new Error('Amount must be greater than 0');
                }

                if (orderType === 'limit' && orderPrice <= 0) {
                    throw new Error('Price must be greater than 0 for limit orders');
                }

                // Validate pair and side
                const validPairs = ['BTC/USD', 'ETH/USD', 'LTC/USD', 'XRP/USD', 'BCH/USD'];
                if (!validPairs.includes(pair)) {
                    throw new Error(`Invalid trading pair: ${pair}`);
                }
                if (!['buy', 'sell'].includes(side)) {
                    throw new Error(`Invalid order side: ${side}`);
                }
                if (!['market', 'limit'].includes(orderType)) {
                    throw new Error(`Invalid order type: ${orderType}`);
                }

                // Insert order into database
                const [result] = await pool.execute(
                    'INSERT INTO Orders (user_id, pair, type, order_type, amount, price) VALUES (?, ?, ?, ?, ?, ?)',
                    [userId, pair, side, orderType, orderAmount, orderPrice]
                );
                const orderId = result.insertId;

                let tradePrice = null; // Default value for tradePrice

                // Simple order matching (market orders execute immediately)
                if (orderType === 'market') {
                    tradePrice = (Math.random() * 10000).toFixed(2); // Dummy execution price
                    await pool.execute(
                        'INSERT INTO Trades (order_id, pair, amount, price) VALUES (?, ?, ?, ?)',
                        [orderId, pair, orderAmount, tradePrice]
                    );
                    await pool.execute('UPDATE Orders SET status = "filled" WHERE id = ?', [orderId]);

                    trades.push({ pair, amount: orderAmount, price: tradePrice, executed_at: new Date() });
                    wss.clients.forEach(client => {  // Broadcast to all clients
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'trade', data: trades }));
                        }
                    });
                } else if (orderType === 'limit') {
                    // Add to order book (limit orders)
                    if (side === 'buy') {
                        orderBook[pair].bids.push({ amount: orderAmount, price: orderPrice });
                        // Sort bids in descending order (highest price first)
                        orderBook[pair].bids.sort((a, b) => b.price - a.price);
                    } else {
                        orderBook[pair].asks.push({ amount: orderAmount, price: orderPrice });
                        // Sort asks in ascending order (lowest price first)
                        orderBook[pair].asks.sort((a, b) => a.price - b.price);
                    }

                    console.log('Updated order book for', pair, ':', orderBook[pair]); // Debug log

                    // Broadcast updated order book to all clients with the pair
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'order_book', data: { pair, bids: orderBook[pair].bids, asks: orderBook[pair].asks } }));
                        }
                    });
                }

                // Update balance (simplified for demo)
                const currency = side === 'buy' ? pair.split('/')[1] : pair.split('/')[0];
                await pool.execute(
                    'UPDATE Balances SET amount = amount - ? WHERE user_id = ? AND currency = ?',
                    [side === 'buy' ? orderAmount * (orderPrice || tradePrice || 0) : orderAmount, userId, currency]
                );
            } catch (err) {
                console.error('Error processing order:', {
                    error: err.message,
                    stack: err.stack,
                    orderData: data // Log the full order data for debugging
                });
                ws.send(JSON.stringify({ type: 'error', message: err.message || 'An unknown error occurred' }));
            }
        }
    });

    // Send initial order book and trades
    ws.send(JSON.stringify({ type: 'order_book', data: orderBook }));
    ws.send(JSON.stringify({ type: 'trade', data: trades }));
});

app.listen(3000, () => console.log('Server running on port 3000'));