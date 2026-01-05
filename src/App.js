import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5001/api';

function App() {
  const [telemetryData, setTelemetryData] = useState([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch initial data
    fetchTelemetryData();
    
    // Setup SSE connection
    const eventSource = new EventSource(`${API_BASE}/telemetry/stream`);
    
    eventSource.onopen = () => {
      setConnectionStatus('connected');
      setError(null);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'telemetry_update') {
          setTelemetryData(prev => {
            const existing = prev.find(item => item.id === data.data.id);
            if (existing) {
              return prev.map(item => 
                item.id === data.data.id ? data.data : item
              );
            } else {
              return [data.data, ...prev].slice(0, 1000);
            }
          });
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };
    
    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      setConnectionStatus('error');
      setError('Connection lost. Retrying...');
    };
    
    return () => {
      eventSource.close();
    };
  }, []);

  const fetchTelemetryData = async () => {
    try {
      const response = await fetch(`${API_BASE}/telemetry`);
      if (response.ok) {
        const data = await response.json();
        setTelemetryData(data);
      }
    } catch (err) {
      setError('Failed to fetch telemetry data');
    }
  };

  const startIngestion = async () => {
    try {
      const response = await fetch(`${API_BASE}/start`, { method: 'POST' });
      if (response.ok) {
        setIsIngesting(true);
        setError(null);
      }
    } catch (err) {
      setError('Failed to start ingestion');
    }
  };

  const stopIngestion = async () => {
    try {
      const response = await fetch(`${API_BASE}/stop`, { method: 'POST' });
      if (response.ok) {
        setIsIngesting(false);
        setError(null);
      }
    } catch (err) {
      setError('Failed to stop ingestion');
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Real-Time Telemetry Dashboard</h1>
        
        <div className="controls">
          <button 
            onClick={startIngestion} 
            disabled={isIngesting}
            className={`btn ${isIngesting ? 'btn-disabled' : 'btn-start'}`}
          >
            {isIngesting ? 'Ingesting...' : 'Start Ingestion'}
          </button>
          
          <button 
            onClick={stopIngestion} 
            disabled={!isIngesting}
            className={`btn ${!isIngesting ? 'btn-disabled' : 'btn-stop'}`}
          >
            Stop Ingestion
          </button>
          
          <div className={`status ${connectionStatus}`}>
            SSE: {connectionStatus}
          </div>
        </div>

        {error && <div className="error">{error}</div>}
        
        <div className="stats">
          <span>Records: {telemetryData.length}</span>
          <span>Status: {isIngesting ? 'Active' : 'Stopped'}</span>
        </div>
      </header>

      <main className="telemetry-table-container">
        <table className="telemetry-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Timestamp</th>
              <th>Temperature (°C)</th>
              <th>Position</th>
              <th>Pressure (hPa)</th>
              <th>Humidity (%)</th>
              <th>Velocity (m/s)</th>
              <th>Status</th>
              <th>Battery (%)</th>
            </tr>
          </thead>
          <tbody>
            {telemetryData.map((record) => (
              <tr key={record.id} className="telemetry-row">
                <td>{record.id}</td>
                <td>{formatTimestamp(record.timestamp)}</td>
                <td>{record.temperature?.toFixed(1)}</td>
                <td>{record.position}</td>
                <td>{record.pressure?.toFixed(2)}</td>
                <td>{record.humidity?.toFixed(1)}</td>
                <td>{record.velocity?.toFixed(1)}</td>
                <td>
                  <span className={`status-badge ${record.status?.toLowerCase()}`}>
                    {record.status}
                  </span>
                </td>
                <td>
                  <div className="battery-container">
                    <div 
                      className="battery-level" 
                      style={{ width: `${record.batteryLevel}%` }}
                    ></div>
                    <span className="battery-text">{record.batteryLevel?.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {telemetryData.length === 0 && (
          <div className="no-data">
            No telemetry data available. Start ingestion to see live data.
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
