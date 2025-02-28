const socket = new WebSocket('ws://localhost:8080');

function fetchPrices() {
    return new Promise((resolve, reject) => {
        console.log("<<Debug:>>, fetchPrices entered")
        socket.onopen = () => {
            console.log("connected server");
        }
        

        socket.onmessage = (event) => {
            try {
                const response = JSON.parse(event.data);
                if(response.type === 'price_update') {
                    resolve(response);
                }
            } catch (err) {
                console.log(err);
                reject(err);
            }
        }
    });
}

export default fetchPrices;
