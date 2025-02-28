import { useEffect, useState } from "react";
const socket = new WebSocket('ws://localhost:8080');

function useLivePrice() {
    const [price, setPrice] = useState(null);
    
    useEffect(() => {
        socket.onmessage = (event) => {
            const response = JSON.parse(event.data);
            setPrice(response.data);
            console.log("Data from Server", response.data);
        }

        // return () => {
        //     socket.close();
        // }
    }, []);
    return price;
        
}

export default useLivePrice;
