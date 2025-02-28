const socket = new WebSocket('ws://localhost:8080');
socket.onopen = () => {
    console.log("connected server");
}

function fetchPrices() {
    return new Promise((resolve, reject) => {
        const type = 'price_update';
        const data = "";
        const message = JSON.stringify({ type, data });
        
        socket.send(message);
        console.log("message sent to server", message);

        socket.onmessage = (event) => {
            try {
                const response = JSON.parse(event.data);
                console.log("response from server", response);
                resolve(response);
            } catch (err) {
                console.log(err);
                reject(err);
            }
        }
    });
}

export default fetchPrices;
