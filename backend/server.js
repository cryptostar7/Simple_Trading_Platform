const WebSocket = require('ws');
const express = require('express');
const fetchPrices = require('./utils/fetchPrices');
require('dotenv').config();

const wss = new WebSocket.Server({ port: 8080 });
const app = express();

wss.on('connection', ws => {
    console.log('Websocket connection established');

    ws.on('message', async message => {
        const {type, data} = JSON.parse(message);
        console.log('Received message:', {type, data});

        if(type === 'price_update') {
            const prices = await fetchPrices();
            ws.send(JSON.stringify({type: 'price_update', data: prices}));
            console.log('Sent price update:', prices);
        }
    })
})
