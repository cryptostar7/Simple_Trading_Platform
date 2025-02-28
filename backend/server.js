const WebSocket = require('ws');
const express = require('express');
const fetchPrices = require('./utils/fetchPrices');
require('dotenv').config();

const wss = new WebSocket.Server({ port: 8080 });
const app = express();

setInterval(async () => {
    const datas = await fetchPrices();
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'price_update', data: datas }))
            // client.send(JSON.stringify({ type: 'price_update', data: test_var }))
            console.log("Sent the price data", datas);

        } else {
            console.log("Clients are not connected");
        }
    })
}, 15000)

// wss.on('connection', ws => {
//     console.log('Websocket connection established');

//     ws.on('message', async message => {
//         const {type, data} = JSON.parse(message);
//         console.log('Received message:', {type, data});
//     })
// })
