const WebSocket = require('ws');
const mysql = require('mysql2/promise');
const express = require('express');
const app = express();
const fetchPrices = require('./utils/fetchPrices');
const wss = new WebSocket.Server({ port: 8080 });
require('dotenv').config();

// MySQL connection pool with your credentials
const pool = mysql.createPool({
    host: process.env.MY_SQL_HOST,          // Your hostname
    user: process.env.MY_SQL_USER_NAME,                // Your username
    password: process.env.MY_SQL_PASSWORD, // Your password
    database: 'mydb',        // Your database name
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

const livePrices = {
    'BTC/USD' : 0,
    'ETH/USD' : 0,
    'LTC/USD' : 0,
    'XRP/USD' : 0,
    'BCH/USD' : 0,
}
const trades = [];

// Simulate price updates every 5 seconds
const tradingPairs = ['BTC/USD', 'ETH/USD', 'LTC/USD', 'XRP/USD', 'BCH/USD'];

async function initialize() {
    try {
        const [orders] = await pool.execute(
            'SELECT pair, type, order_type, amount, price, status FROM orders WHERE status != "filled"'
        );

        orders.forEach(order => {
            if (order.type === 'buy') {
                orderBook[order.pair].bids.push({
                    amount: order.amount,
                    price: order.price
                });
            } else {
                orderBook[order.pair].asks.push({
                    amount: order.amount,
                    price: order.price
                });
            }
        });

        const [dbTrades] = await pool.execute(
            'SELECT pair, amount, price, executed_at FROM trades'
        );

        dbTrades.forEach(trade => {
            trades.push({
                pair: trade.pair,
                amount: trade.amount,
                price: trade.price,
                executed_at: trade.executed_at
            });
        });

        await sendChartData();
        console.log("Initialize Success");

    } catch (err) {
        console.log("Initialize Error", err);
    }
}
initialize();

async function sendChartData() {
    const [charts] = await pool.execute(
        'SELECT pair, price, ordered_at FROM orders'
    );
    const chartData = [];
    charts.forEach(data => {
        chartData.push({
            pair: data.pair,
            price: data.price,
            ordered_at: data.ordered_at
        })
    })
    console.log("Chart Data", chartData);

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'chart_data', data: chartData }));
            console.log("Chart Data Sent");
        } else {
            console.log("Clients are not connected");
        }
    })
}

setInterval(async () => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'price_update', data: livePrices }))
        } else {
            console.log("Clients are not connected");
        }
    })
}, 5000)

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

                let tradePrice = null; // Default value for tradePrice

                // Simple order matching (market orders execute immediately)
                if (orderType === 'market') {
                    // Insert order into database
                    const [result] = await pool.execute(
                        'INSERT INTO orders (user_id, pair, type, order_type, amount, price, ordered_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [userId, pair, side, orderType, orderAmount, livePrices[pair], new Date()]
                    );
                    const orderId = result.insertId;
                    console.log("Order Id:", orderId);
                    tradePrice = livePrices[pair]; // Dummy execution price
                    await pool.execute('UPDATE orders SET status = "filled" WHERE id = ?', [orderId]);
                    const total_price = tradePrice * orderAmount;
                    trades.push({ pair, amount: orderAmount, price: tradePrice, executed_at: new Date() });
                    await pool.execute(
                        'INSERT INTO trades (order_id, pair, amount, price, executed_at) VALUES (?, ?, ?, ?, ?)',
                        [orderId, pair, orderAmount, total_price, new Date()]
                    );
                    

                    wss.clients.forEach(client => {  // Broadcast to all clients
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'trade', data: trades }));
                        }
                    });
                    sendChartData();

                } else if (orderType === 'limit') {
                    // Insert order into database
                    const [result] = await pool.execute(
                        'INSERT INTO orders (user_id, pair, type, order_type, amount, price, ordered_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [userId, pair, side, orderType, orderAmount, orderPrice, new Date()]
                    );
                    const orderId = result.insertId;
                    console.log("Order Id:", orderId);
                    // Add to order book (limit orders)
                    if (side === 'buy') {
                        // Live Price Update
                        if(livePrices[pair] < orderPrice) {
                            livePrices[pair] = orderPrice;
                            wss.clients.forEach(client => {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({ type: 'price_update', data: livePrices }))
                                    console.log("Sent the price data", livePrices);
                                } else {
                                    console.log("Clients are not connected");
                                }
                            })
                        }

                        // Update the orderbook data
                        const matchingAskIndex = orderBook[pair].asks.findIndex(ask => ask.price === orderPrice);

                        if (matchingAskIndex !== -1) {
                            const matchingAsk = orderBook[pair].asks[matchingAskIndex];
                            if(matchingAsk.amount > orderAmount) {
                                orderBook[pair].asks[matchingAskIndex].amount -= orderAmount;
                                trades.push({
                                    pair, 
                                    amount: orderAmount, 
                                    price: orderPrice, 
                                    executed_at: new Date() 
                                });

                                await pool.execute(
                                    'INSERT INTO trades (order_id, pair, amount, price, executed_at) VALUES (?, ?, ?, ?, ?)',
                                    [orderId, pair, orderAmount, orderPrice, new Date()]
                                );
                            } else if (matchingAsk.amount === orderAmount) {
                                orderBook[pair].asks.splice(matchingAskIndex, 1);
                                trades.push({
                                    pair,
                                    amount: orderAmount,
                                    price: orderPrice,
                                    executed_at: new Date()
                                });
                                await pool.execute(
                                    'INSERT INTO trades (order_id, pair, amount, price, executed_at) VALUES (?, ?, ?, ?, ?)',
                                    [orderId, pair, orderAmount, orderPrice,new Date()]
                                );
                                await pool.execute('UPDATE orders SET status = "filled" WHERE id = ?', [orderId]);
                                
                            } else {
                                orderBook[pair].asks.splice(matchingAskIndex, 1);
                                const remainingAmount = orderAmount - matchingAsk.amount;
                                trades.push({
                                    pair,
                                    amount: matchingAsk.amount,
                                    price: orderPrice,
                                    executed_at: new Date()
                                });

                                await pool.execute(
                                    'INSERT INTO trades (order_id, pair, amount, price, executed_at) VALUES (?, ?, ?, ?, ?)',
                                    [orderId, pair, matchingAsk.amount, orderPrice, new Date()]
                                );

                                orderBook[pair].bids.push({ 
                                    amount: remainingAmount, 
                                    price: orderPrice 
                                });
                                orderBook[pair].bids.sort((a, b) => b.price - a.price);                                
                            }
                        } else {
                            // No matching ask, add as new bid
                            orderBook[pair].bids.push({ amount: orderAmount, price: orderPrice });
                            orderBook[pair].bids.sort((a, b) => b.price - a.price);
                        }

                    } else {
                        const matchingBidIndex = orderBook[pair].bids.findIndex(bid => bid.price === orderPrice);
                        if (matchingBidIndex !== -1) {
                            const matchingBid = orderBook[pair].bids[matchingBidIndex];
                            console.log("<<<<<<Check Point 1>>>>>>>>>");
                            if (matchingBid.amount > orderAmount) {
                                // Update the bid amount
                                orderBook[pair].bids[matchingBidIndex].amount -= orderAmount;
                                
                                // Create trade record for the full order amount
                                trades.push({
                                    pair,
                                    amount: orderAmount,
                                    price: orderPrice,
                                    executed_at: new Date()
                                });
                                await pool.execute(
                                    'INSERT INTO trades (order_id, pair, amount, price, executed_at) VALUES (?, ?, ?, ?, ?)',
                                    [orderId, pair, orderAmount, orderPrice, new Date()]
                                );
                            } else if(matchingBid.amount === orderAmount) {
                                orderBook[pair].bids.splice(matchingBidIndex, 1);
                                trades.push({
                                    pair,
                                    amount: orderAmount,
                                    price: orderPrice,
                                    executed_at: new Date()
                                });
                                await pool.execute(
                                    'INSERT INTO trades (order_id, pair, amount, price, executed_at) VALUES (?, ?, ?, ?, ?)',
                                    [orderId, pair, orderAmount, orderPrice, new Date()]
                                );
                                await pool.execute('UPDATE orders SET status = "filled" WHERE id = ?', [orderId]);

                            } else {
                                orderBook[pair].bids.splice(matchingBidIndex, 1);
                                
                                const remainingAmount = orderAmount - matchingBid.amount;
                                
                                trades.push({
                                    pair,
                                    amount: matchingBid.amount,
                                    price: orderPrice,
                                    executed_at: new Date()
                                });

                                await pool.execute(
                                    'INSERT INTO trades (order_id, pair, amount, price, executed_at) VALUES (?, ?, ?, ?, ?)',
                                    [orderId, pair, matchingBid.amount, orderPrice, new Date()]
                                );

                                orderBook[pair].asks.push({ 
                                    amount: remainingAmount, 
                                    price: orderPrice 
                                });
                                orderBook[pair].asks.sort((a, b) => a.price - b.price);

                            }
                        } else {
                            // No matching bid, add as new ask
                            orderBook[pair].asks.push({ amount: orderAmount, price: orderPrice });
                            orderBook[pair].asks.sort((a, b) => a.price - b.price);
                        }

                    }

                    console.log('Updated order book for', pair, ':', orderBook[pair]); // Debug log

                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'order_book', data: orderBook }));
                        }
                    });

                    wss.clients.forEach(client => {  // Broadcast to all clients
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'trade', data: trades }));
                        }
                    });
                    sendChartData();
                }

                // Update balance (simplified for demo)
                // const currency = side === 'buy' ? pair.split('/')[1] : pair.split('/')[0];
                // await pool.execute(
                //     'UPDATE Balances SET amount = amount - ? WHERE user_id = ? AND currency = ?',
                //     [side === 'buy' ? orderAmount * (orderPrice || tradePrice || 0) : orderAmount, userId, currency]
                // );
            } catch (err) {
                console.error('Error processing order:', {
                    error: err.message,
                    stack: err.stack,
                    orderData: data // Log the full order data for debugging
                });
                ws.send(JSON.stringify({ type: 'error', message: err.message || 'An unknown error occurred' }));
            }
        } else if (data.type === 'chartType_update') {
            const { pair, interval } = data;
            // Implement chart data retrieval logic here
        } else {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message type' }));
        }
    });

    // Send initial order book and trades
    ws.send(JSON.stringify({ type: 'trade', data: trades }));
    ws.send(JSON.stringify({ type: 'order_book', data: orderBook }));
});

app.listen(3001, () => console.log('Server running on port 3001'));