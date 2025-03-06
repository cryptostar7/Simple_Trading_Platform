import { CandlestickSeries, createChart, LineSeries } from 'lightweight-charts';
import { useEffect, useRef } from 'react';

export const TradingViewChart = ({ data }) => {
    const chartContainerRef = useRef();
    
    useEffect(() => {
      // Group data into 1-minute candles
      const groupedData = data.reduce((acc, item) => {

        // Get timestamp rounded to the nearest minute
        const timestamp = Math.floor(Date.parse(item.date) / (60 * 1000)) * 60;
        
        if (!acc[timestamp]) {
          acc[timestamp] = {
            time: timestamp,
            open: Number(item.price),
            high: Number(item.price),
            low: Number(item.price),
            close: Number(item.price)
          };
        } else {
          acc[timestamp].high = Math.max(acc[timestamp].high, Number(item.price));
          acc[timestamp].low = Math.min(acc[timestamp].low, Number(item.price));
          acc[timestamp].close = Number(item.price);
        }
        return acc;
      }, {});
  
      // Convert to array and sort
      const candleData = Object.values(groupedData)
        .map(candle => ({
          ...candle,
          time: candle.time // Convert to seconds for TradingView
        }))
        .sort((a, b) => a.time - b.time);
    
  
      const chart = createChart(chartContainerRef.current, {
        width: 1000,
        height: 600,
        layout: {
          background: { color: '#ffffff' },
          textColor: '#333',
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: true,
          tickMarkFormatter: (time) => {
            const date = new Date(time * 1000);

            return date.toLocaleString('en-US', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'UTC'
            });
          }
        }
      });

      const candleSeries = chart.addSeries(CandlestickSeries);
    
      candleSeries.setData(candleData);
        
      return () => chart.remove();
    }, [data]);
  
    return <div ref={chartContainerRef} />;
  };
  
