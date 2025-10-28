import { useEffect, useState } from 'react';
import * as Ably from 'ably';

const TestAbly = () => {
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [ably, setAbly] = useState(null);

  useEffect(() => {
    // Initialize Ably with public key from .env
    const ablyClient = new Ably.Realtime({
      key: import.meta.env.VITE_ABLY_KEY,
    });

    // Monitor connection status
    ablyClient.connection.on('connected', () => {
      setConnectionStatus('Connected to Ably');
      console.log('Connected to Ably');
    });

    ablyClient.connection.on('disconnected', () => {
      setConnectionStatus('Disconnected');
      console.log('Disconnected from Ably');
    });

    ablyClient.connection.on('failed', () => {
      setConnectionStatus('Connection failed');
      console.error('Ably connection failed');
    });

    // Subscribe to test channel (Laravel prepends 'public:' to channel names)
    const channel = ablyClient.channels.get('public:test-channel');

    channel.subscribe('test-event', (message) => {
      console.log('Received test event:', message);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          data: message.data,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    });

    setAbly(ablyClient);

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
      ablyClient.close();
    };
  }, []);

  const triggerTestEvent = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/test-ably`);
      const data = await response.json();
      console.log('Test event triggered:', data);
      alert('Test event sent! Check the messages below.');
    } catch (error) {
      console.error('Error triggering test event:', error);
      alert('Error triggering test event. Check console.');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Ably Real-time Test</h1>

      <div
        style={{
          padding: '15px',
          marginBottom: '20px',
          backgroundColor: connectionStatus.includes('Connected') ? '#d4edda' : '#f8d7da',
          border: '1px solid',
          borderColor: connectionStatus.includes('Connected') ? '#c3e6cb' : '#f5c6cb',
          borderRadius: '4px',
        }}
      >
        <strong>Connection Status:</strong> {connectionStatus}
      </div>

      <button
        onClick={triggerTestEvent}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '20px',
        }}
      >
        Trigger Test Event
      </button>

      <div style={{ marginTop: '20px' }}>
        <h2>Received Messages:</h2>
        {messages.length === 0 ? (
          <p style={{ color: '#666' }}>
            No messages yet. Click the button above to send a test event!
          </p>
        ) : (
          <div>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  padding: '10px',
                  marginBottom: '10px',
                  backgroundColor: '#e7f3ff',
                  border: '1px solid #b3d9ff',
                  borderRadius: '4px',
                }}
              >
                <strong>[{msg.timestamp}]</strong>
                <pre style={{ margin: '5px 0 0 0' }}>{JSON.stringify(msg.data, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h3>How to test:</h3>
        <ol>
          <li>Make sure your Laravel backend is running (php artisan serve)</li>
          <li>Check that the connection status above shows "Connected to Ably"</li>
          <li>Click the "Trigger Test Event" button</li>
          <li>You should see a message appear in the "Received Messages" section</li>
        </ol>
        <p style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
          <strong>Technical details:</strong>
          <br />
          - Frontend connects to Ably using public key: {import.meta.env.VITE_ABLY_KEY}
          <br />
          - Listening on channel: public:test-channel
          <br />
          - Event name: test-event
          <br />
          - Backend API: {import.meta.env.VITE_API_URL}/api/test-ably
        </p>
      </div>
    </div>
  );
};

export default TestAbly;
