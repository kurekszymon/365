import { useEffect, useState } from 'react';
import './App.css';

const params = new URLSearchParams(document.location.search);

type Message = { id: 'string', name: 'string'; };
function App() {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onMessage((data: Message) => {
        console.log('received from electron:', data);
        setMessages(prev => [...prev, data]);
      });
    }
  }, []);

  const handleSendMessage = () => {
    const message = {
      id: crypto.randomUUID(),
      name: (Math.random() + 1).toString(36).substring(7)
    };

    if (window.electronAPI) {
      window.electronAPI.sendMessage(message);
    }
  };

  const handlePing = async () => {
    if (window.versions) {
      const response = await window.versions.ping();
      console.log(response); // 'pong'
    }
  };

  return (
    <>
      <h1>Search params: id - {params.get('id')}</h1>
      <h1>Search params: name - {params.get('name')}</h1>

      {window.versions && (
        <p>
          Chrome: {window.versions.chrome()}, Node: {window.versions.node()}, Electron: {window.versions.electron()}
        </p>
      )}

      <div>
        <h2>Messages</h2>
        {messages.map((message, idx) => (
          <h3 key={idx}>{message.id} - {message.name}</h3>
        ))}
      </div>

      <button onClick={handleSendMessage}>Send Message</button>
      <button onClick={handlePing}>Ping</button>
    </>
  );
}

export default App;
