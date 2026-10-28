import React, { useState, useEffect, useRef } from 'react';
import { apiAskQuestion, type ChatHistoryItem } from '../api/lessonApi';

interface AskBluBotProps {
  currentTopic?: string;
  currentSceneHeading?: string;
  currentSceneNarration?: string;
  language?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'blu';
  text: string;
  timestamp: string;
  model?: string;
  elapsed?: number;
}

const QUICK_PROMPTS = [
  '💡 Explain with an intuitive analogy',
  '🔍 What is the core idea in simple words?',
  '💻 Show a quick 3-line example',
  '⚠️ What common mistake do beginners make?',
];

export const AskBluBot: React.FC<AskBluBotProps> = ({
  currentTopic,
  currentSceneHeading,
  currentSceneNarration,
  language = 'en',
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const toggleOpen = () => {
    if (controlledOnToggle) {
      controlledOnToggle();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'welcome',
      sender: 'blu',
      text: currentTopic
        ? `Hey there! I'm Blu, your AI tutor. Got any doubts about **${currentTopic}**? Ask me anything—I'll explain using our real local neural model!`
        : `Hey there! I'm Blu, your AI tutor. Ask me any question about programming, algorithms, or concepts—powered by our real local Phi-3.5 model!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: 'phi3.5',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setShowTooltip(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build conversation history for context
      const history: ChatHistoryItem[] = messages.slice(-4).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await apiAskQuestion({
        question: q,
        topic: currentTopic,
        scene_heading: currentSceneHeading,
        scene_narration: currentSceneNarration,
        language,
        history,
      });

      const bluMsg: Message = {
        id: `blu-${Date.now()}`,
        sender: 'blu',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: res.model || 'phi3.5',
        elapsed: res.elapsed_seconds,
      };

      setMessages((prev) => [...prev, bluMsg]);
    } catch (err) {
      console.error('Ask Blu error:', err);
      const errorMsg: Message = {
        id: `blu-err-${Date.now()}`,
        sender: 'blu',
        text: `I had trouble connecting to the local engine: ${(err as Error)?.message || 'Unknown error'}. You can try asking again or verify that Ollama is ready.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'blu',
        text: `Chat cleared! What concept would you like to explore next?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: 'phi3.5',
      },
    ]);
  };

  const renderFormattedText = (text: string) => {
    // Quick inline renderer for bold and code blocks
    const parts = text.split(/(```[\s\S]*?```|`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const lang = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : '';
        const codeContent = lang ? lines.slice(1).join('\n') : lines.join('\n');
        return (
          <pre
            key={i}
            style={{
              background: '#0f172a',
              color: '#38bdf8',
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: '"JetBrains Mono", monospace',
              overflowX: 'auto',
              margin: '8px 0',
              lineHeight: 1.4,
              border: '1px solid #1e293b',
            }}
          >
            <code>{codeContent}</code>
          </pre>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            style={{
              background: '#e0f2fe',
              color: '#0369a1',
              padding: '2px 5px',
              borderRadius: '4px',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '12px',
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: '#0f172a' }}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <>
      {/* Floating Trigger Button & Speech Bubble */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          pointerEvents: 'auto',
        }}
      >
        {/* Subtle Welcome Tooltip (shown initially) */}
        {!isOpen && showTooltip && (
          <div
            onClick={toggleOpen}
            style={{
              marginBottom: '10px',
              padding: '8px 14px',
              borderRadius: '12px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
              fontSize: '12px',
              fontWeight: 600,
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              animation: 'floatGentle 3s ease-in-out infinite',
              position: 'relative',
            }}
          >
            <span>💬</span>
            <span>Got questions? Ask Blu AI!</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowTooltip(false);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '0 2px',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Mascot Floating Toggle Button */}
        <button
          type="button"
          id="btn-toggle-ask-blu"
          onClick={toggleOpen}
          aria-label="Open Blu AI Tutor Chat"
          style={{
            width: isOpen ? '44px' : '54px',
            height: isOpen ? '44px' : '54px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            border: '2px solid #ffffff',
            boxShadow: '0 8px 25px rgba(2, 132, 199, 0.4), 0 2px 6px rgba(15, 23, 42, 0.1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: isOpen ? 'scale(0.9)' : 'scale(1)',
          }}
        >
          {isOpen ? (
            <span style={{ fontSize: '18px', color: '#ffffff', fontWeight: 700 }}>✕</span>
          ) : (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              {/* Blu Stylized Face */}
              <circle cx="12" cy="12" r="9.5" fill="#0f172a" />
              <circle cx="8.5" cy="10.5" r="2.2" fill="#38bdf8" />
              <circle cx="15.5" cy="10.5" r="2.2" fill="#38bdf8" />
              <circle cx="9" cy="10.2" r="0.7" fill="#ffffff" />
              <circle cx="16" cy="10.2" r="0.7" fill="#ffffff" />
              <path d="M9.5 15 Q12 17.5 14.5 15" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Main Chat Drawer Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Blu AI Tutor Chatbot"
          style={{
            position: 'fixed',
            bottom: '86px',
            right: '24px',
            width: '390px',
            maxWidth: 'calc(100vw - 32px)',
            height: '560px',
            maxHeight: 'calc(100vh - 110px)',
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 50px -10px rgba(15, 23, 42, 0.18), 0 8px 20px rgba(15, 23, 42, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            overflow: 'hidden',
            fontFamily: '"Noto Sans", system-ui, sans-serif',
            animation: 'fadeInUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #e2e8f0',
              background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" fill="#0f172a" />
                  <circle cx="9" cy="11" r="2.2" fill="#38bdf8" />
                  <circle cx="15" cy="11" r="2.2" fill="#38bdf8" />
                  <path d="M10 15 Q12 17 14 15" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#10b981',
                    border: '1.5px solid #ffffff',
                  }}
                  title="Real model active"
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Blu AI Tutor</span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: '#ecfdf5',
                      color: '#059669',
                      fontWeight: 700,
                      border: '1px solid #a7f3d0',
                    }}
                  >
                    Phi-3.5 Real Model
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                  {currentTopic ? `Context: ${currentTopic}` : 'Offline Coding & Concept Assistant'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={handleClearHistory}
                title="Clear chat history"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '4px',
                  borderRadius: '6px',
                }}
              >
                🧹
              </button>
              <button
                type="button"
                onClick={toggleOpen}
                title="Minimize chat"
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#475569',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Context Banner if inside specific scene */}
          {currentSceneHeading && (
            <div
              style={{
                padding: '6px 14px',
                background: '#f0f9ff',
                borderBottom: '1px solid #e0f2fe',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: '#0369a1',
                fontWeight: 600,
              }}
            >
              <span>📌 Current Slide:</span>
              <span style={{ color: '#0284c7', fontWeight: 700 }}>{currentSceneHeading}</span>
            </div>
          )}

          {/* Message Stream */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: '#f8fafc',
            }}
          >
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '10px 14px',
                      borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isUser ? 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)' : '#ffffff',
                      color: isUser ? '#ffffff' : '#0f172a',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      border: isUser ? 'none' : '1px solid #e2e8f0',
                      boxShadow: isUser
                        ? '0 3px 10px rgba(2, 132, 199, 0.25)'
                        : '0 2px 8px rgba(15, 23, 42, 0.04)',
                      wordBreak: 'break-word',
                    }}
                  >
                    {isUser ? m.text : renderFormattedText(m.text)}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '3px',
                      fontSize: '10px',
                      color: '#94a3b8',
                      padding: '0 4px',
                    }}
                  >
                    <span>{m.timestamp}</span>
                    {!isUser && m.model && (
                      <span
                        style={{
                          background: '#e0f2fe',
                          color: '#0284c7',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          fontWeight: 600,
                        }}
                      >
                        🤖 {m.model} {m.elapsed ? `(${m.elapsed}s)` : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Thinking / Streaming Indicator */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '16px 16px 16px 4px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600 }}>
                    Blu is analyzing with Phi-3.5
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', animation: 'pulse 1s infinite' }} />
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0284c7', animation: 'pulse 1s infinite 0.2s' }} />
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0369a1', animation: 'pulse 1s infinite 0.4s' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div
            style={{
              padding: '8px 12px',
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(prompt)}
                disabled={loading}
                style={{
                  padding: '5px 10px',
                  borderRadius: '14px',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  color: '#334155',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.12s ease',
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              padding: '12px 14px',
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about this lesson..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: '13px',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              }}
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: input.trim() && !loading ? 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)' : '#e2e8f0',
                border: 'none',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 700,
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                boxShadow: input.trim() && !loading ? '0 2px 8px rgba(2, 132, 199, 0.3)' : 'none',
                flexShrink: 0,
              }}
              title="Send question to Blu"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
};
