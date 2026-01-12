import React, { useState, useRef, useEffect, useCallback } from 'react';

let memoryStore = {};

async function agentResponse(prompt) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    const response = await fetch('http://localhost:8000/agent/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    
    if (!response.ok) throw new Error('Backend error');
    return await response.json();
  } catch (error) {
    console.log('Backend unavailable, using mock');
    const promptLower = prompt.toLowerCase();
    
    if (promptLower.includes('plus') || promptLower.includes('minus') || promptLower.includes('times')) {
      const numbers = prompt.match(/\d+/g) || [];
      const expr = numbers.length >= 2 ? `${numbers[0]} + ${numbers[1]}` : '0+0';
      const result = eval(expr.replace('plus', '+').replace('minus', '-').replace('times', '*'));
      return {
        original_prompt: prompt,
        chosen_tool: 'calculator',
        tool_input: expr,
        response: { result: Number(result) }
      };
    }
    
    if (promptLower.includes('remember')) {
      const match = prompt.match(/remember\s+(.+?)\s+is\s+(.+)/i);
      if (match) {
        const [, key, value] = match;
        memoryStore[key.trim()] = value.trim();
        return {
          original_prompt: prompt,
          chosen_tool: 'memory_save',
          tool_input: key.trim(),
          response: { status: 'saved', key: key.trim(), value: value.trim() }
        };
      }
    }
    
    if (promptLower.includes('what is my')) {
      const match = prompt.match(/what is my\s+(.+?)(?:\?|$)/i);
      const key = match ? match[1].trim() : 'unknown';
      const value = memoryStore[key] || null;
      return {
        original_prompt: prompt,
        chosen_tool: 'memory_read',
        tool_input: key,
        response: { key, value }
      };
    }
    
    return { error: 'I do not have a tool for that.' };
  }
}

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false); // 🎤 NEW STATE
  const messagesEndRef = useRef(null);

  // ✅ BONUS #1: AUTO-SCROLL (ALREADY WORKING)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 🎤 BONUS #2: VOICE-TO-TEXT
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported. Use Chrome/Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const response = await agentResponse(userMessage);
      setMessages(prev => [...prev, { 
        type: 'agent', 
        content: JSON.stringify(response, null, 2)
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        type: 'agent', 
        content: `Error: ${error.message}` 
      }]);
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        borderBottom: '1px solid #e5e7eb',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '0.5rem'
        }}>
          Baarez AI Agent
        </h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Try: "What is 10 plus 5?" or "Remember my cat's name is Fluffy" 🎤
        </p>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{
              display: 'flex',
              justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start'
            }}>
              <div style={{
                maxWidth: '70%',
                padding: '1rem 1.5rem',
                borderRadius: '1.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                background: msg.type === 'user' ? '#3b82f6' : '#f3f4f6',
                color: msg.type === 'user' ? 'white' : '#1f2937',
                borderBottomRightRadius: msg.type === 'user' ? '0.5rem' : '1.5rem',
                borderBottomLeftRadius: msg.type === 'user' ? '1.5rem' : '0.5rem',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                fontSize: '0.95rem',
                lineHeight: '1.5'
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-start'
            }}>
              <div style={{
                padding: '1rem 1.5rem',
                background: '#f3f4f6',
                borderRadius: '1.5rem',
                borderBottomLeftRadius: '0.5rem',
                maxWidth: '70%',
                opacity: 0.7
              }}>
                Agent is typing...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - 🎤 VOICE BUTTON ADDED */}
      <div style={{
        padding: '2rem',
        background: 'rgba(255,255,255,0.95)',
        borderTop: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', gap: '1rem', maxWidth: '100%' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type or 🎤 speak your message... (Enter to send)"
            style={{
              flex: 1,
              resize: 'none',
              border: '2px solid #d1d5db',
              borderRadius: '1.5rem',
              padding: '1rem 1.5rem',
              fontSize: '1rem',
              lineHeight: '1.5',
              minHeight: '56px',
              maxHeight: '150px'
            }}
            rows="1"
            disabled={loading}
          />
          
          {/* 🎤 VOICE BUTTON - BONUS POINT #2 */}
          <button
            onClick={startListening}
            disabled={loading}
            title="Voice input (Click and speak)"
            style={{
              padding: '1rem',
              background: isListening ? '#ef4444' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '1.5rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '56px',
              opacity: loading ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
          >
            {isListening ? '⛔' : '🎤'}
          </button>
          
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            style={{
              padding: '1rem 2rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '1.5rem',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              opacity: input.trim() && !loading ? 1 : 0.5
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
