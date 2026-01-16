import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Loader2, X, Lightbulb, Sparkles, Bot, User } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

// Component to format markdown-style text
const FormattedMessage = ({ content, isUser }) => {
  const formatText = (text) => {
    if (!text) return [];

    const lines = text.split('\n');
    const elements = [];

    lines.forEach((line, lineIndex) => {
      // Headers (# heading)
      if (line.match(/^#{1,3}\s+(.+)/)) {
        const level = line.match(/^(#{1,3})/)[0].length;
        const text = line.replace(/^#{1,3}\s+/, '');
        const fontSize = level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm';
        elements.push(
          <div key={lineIndex} className={`font-bold ${fontSize} mt-2 mb-1 ${isUser ? 'text-white' : 'text-gray-900'}`}>
            {text}
          </div>
        );
        return;
      }

      // Bold text (**text**)
      if (line.includes('**')) {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        elements.push(
          <div key={lineIndex} className="mb-1">
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
              }
              return <span key={i}>{part}</span>;
            })}
          </div>
        );
        return;
      }

      // Bullet points (- item or * item)
      if (line.match(/^[\-\*]\s+(.+)/)) {
        const text = line.replace(/^[\-\*]\s+/, '');
        elements.push(
          <div key={lineIndex} className="flex gap-2 mb-1 ml-2">
            <span className={isUser ? 'text-white/80' : 'text-gray-600'}>•</span>
            <span>{text}</span>
          </div>
        );
        return;
      }

      // Numbered lists (1. item)
      if (line.match(/^\d+\.\s+(.+)/)) {
        const match = line.match(/^(\d+)\.\s+(.+)/);
        elements.push(
          <div key={lineIndex} className="flex gap-2 mb-1 ml-2">
            <span className={`font-medium ${isUser ? 'text-white/80' : 'text-gray-600'}`}>{match[1]}.</span>
            <span>{match[2]}</span>
          </div>
        );
        return;
      }

      // Empty lines
      if (line.trim() === '') {
        elements.push(<div key={lineIndex} className="h-2" />);
        return;
      }

      // Regular text
      elements.push(
        <div key={lineIndex} className="mb-1">
          {line}
        </div>
      );
    });

    return elements;
  };

  return <div className="space-y-0.5">{formatText(content)}</div>;
};

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickStats, setQuickStats] = useState(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadInitialData();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadInitialData = async () => {
    try {
      // Try to load stats and questions
      const statsRes = await fetch(`${API_BASE_URL}/chatbot/quick-stats`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null);

      const questionsRes = await fetch(`${API_BASE_URL}/chatbot/suggested-questions`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null);

      if (statsRes) {
        setQuickStats(statsRes);
      }

      if (questionsRes?.quick_queries) {
        setSuggestedQuestions(questionsRes.quick_queries);
      }

      // Welcome message
      const welcomeMsg = statsRes
        ? `Hello! I'm your AI business assistant.\n\nToday's Summary:\n• Revenue: ₹${statsRes.today.revenue.toLocaleString()}\n• Profit: ₹${statsRes.today.profit.toLocaleString()}\n• Orders: ${statsRes.today.transactions}\n\nWhat would you like to know?`
        : `Hello! I'm your AI business assistant. I can help you analyze your sales, inventory, and business performance. What would you like to know?`;

      setMessages([{
        role: 'assistant',
        content: welcomeMsg,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setMessages([{
        role: 'assistant',
        content: "Hello! I'm your AI business assistant. How can I help you today?",
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const handleSendMessage = async (messageText = null) => {
    const textToSend = messageText || inputMessage.trim();
    if (!textToSend || isLoading) return;

    const userMessage = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setShowSuggestions(false);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          conversation_history: messages
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const aiMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: data.timestamp,
        model: data.model
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'assistant',
        content: "I apologize, but I'm having trouble processing your request right now. This could be because:\n\n1. The AI service is not properly configured\n2. The backend server needs to be restarted\n3. The Google API key might be missing\n\nPlease check the console for more details.",
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuery = (query) => {
    handleSendMessage(query);
  };

  const clearChat = () => {
    setMessages([]);
    setShowSuggestions(true);
    loadInitialData();
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16
          bg-linear-to-br from-slate-600 to-slate-700
          text-white rounded-full shadow-xl
          hover:shadow-slate-500/30 transition-all duration-300 hover:scale-110 z-50 flex items-center justify-center group"
        >
          <MessageCircle size={28} className="group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-105 h-150 bg-white rounded-2xl shadow-2xl 
                        flex flex-col z-50 border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-linear-to-r from-slate-700 to-slate-800 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Bot size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">AI Business Assistant</h3>
                <p className="text-xs text-white/80 flex items-center gap-1">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="p-2 hover:bg-white/20 rounded-lg transition"
                title="Clear chat"
              >
                <Sparkles size={18} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div className={`flex gap-2 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${message.role === 'user'
                    ? 'bg-linear-to-br from-slate-500 to-slate-600'
                    : 'bg-linear-to-br from-gray-700 to-gray-900'
                    }`}>
                    {message.role === 'user' ? <User size={16} className="bg-linear-to-br from-slate-600 to-slate-700
 text-white" /> : <Bot size={16} className="text-white" />}
                  </div>

                  {/* Message Bubble */}
                  <div className={`rounded-2xl px-4 py-2.5 ${message.role === 'user'
                    ? 'bg-linear-to-br from-slate-600 to-slate-700 text-white'
                    : message.isError
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-200'
                    }`}>
                    <div className="text-sm leading-relaxed">
                      <FormattedMessage content={message.content} isUser={message.role === 'user'} />
                    </div>
                    <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-white/70' : 'text-gray-400'
                      }`}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start animate-fadeIn">
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-200">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Suggested Questions */}
            {showSuggestions && messages.length <= 1 && suggestedQuestions.length > 0 && (
              <div className="space-y-2 animate-fadeIn">
                <p className="text-xs text-gray-500 font-medium px-1 flex items-center gap-1">
                  <Lightbulb size={14} />
                  Quick questions:
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickQuery(question)}
                      className="px-3 py-1.5 bg-white hover:bg-purple-50 border border-gray-200 
                               hover:border-slate-300 rounded-full text-xs text-gray-700 
                               hover:text-slate-700 transition-all duration-200 hover:shadow-sm"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Stats Bar - Only show if data is available */}
{quickStats && quickStats.today && (
  <div className="border-t border-gray-200 bg-white p-3">
    <div className="grid grid-cols-3 gap-2 text-center">
      
      {/* Revenue */}
      <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
        <p className="text-xs text-gray-600 font-medium">Revenue</p>
        <p className="text-sm font-bold text-slate-700">
          ₹{quickStats.today.revenue.toLocaleString()}
        </p>
      </div>

      {/* Profit */}
      <div className="bg-teal-50 rounded-lg p-2 border border-teal-200">
        <p className="text-xs text-gray-600 font-medium">Profit</p>
        <p className="text-sm font-bold text-teal-700">
          ₹{quickStats.today.profit.toLocaleString()}
        </p>
      </div>

      {/* Orders */}
      <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
        <p className="text-xs text-gray-600 font-medium">Orders</p>
        <p className="text-sm font-bold text-gray-700">
          {quickStats.today.transactions}
        </p>
      </div>

    </div>
  </div>
)}


          {/* Input Area */}
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything about your business..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl 
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                         disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              />
<button
  onClick={() => handleSendMessage()}
  disabled={!inputMessage.trim() || isLoading}
  className="p-3 bg-linear-to-br from-slate-600 to-slate-700 text-white rounded-xl
             hover:from-slate-700 hover:to-slate-800 transition-all duration-200
             disabled:opacity-50 disabled:cursor-not-allowed
             disabled:hover:from-slate-600 disabled:hover:to-slate-700
             hover:shadow-md hover:scale-105 active:scale-95"
>
  {isLoading ? (
    <Loader2 size={20} className="animate-spin" />
  ) : (
    <Send size={20} />
  )}
</button>

            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Powered by AI • Real-time business insights
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default AIChatbot;