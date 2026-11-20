import { useState } from 'react';
import { api } from '../api.js';

/** Chat panel that talks to the AI service through the backend (/api/ai/chat). */
export default function AssistantChat() {
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi, I am the MediBridge assistant. Ask me about your policy, claims, documents or your UHT ID journey.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setMessages((m) => [...m, { from: 'me', text }]);
    setInput('');
    setBusy(true);
    try {
      const res = await api('/ai/chat', { method: 'POST', body: { message: text } });
      setMessages((m) => [...m, { from: 'bot', text: res.reply }]);
    } catch (err) {
      setMessages((m) => [...m, { from: 'bot', text: err.message }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card chat">
      <div className="chat-log" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.from}`}>{m.text}</div>
        ))}
        {busy && <div className="bubble bot typing">Thinking…</div>}
      </div>
      <form className="chat-form" onSubmit={send}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. How do I claim reimbursement?"
          aria-label="Message the assistant"
        />
        <button className="btn btn-primary" disabled={busy}>Send</button>
      </form>
    </div>
  );
}
