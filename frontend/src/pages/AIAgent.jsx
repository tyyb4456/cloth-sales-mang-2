import { useState, useEffect, useRef } from 'react';
import { 
  Send, Mic, Sparkles, TrendingUp, Package, 
  AlertCircle, X, Zap, MessageSquare, BarChart3,
  DollarSign, Users, ShoppingCart, Plus, Loader2,
  ChevronRight, Coffee
} from 'lucide-react';
import api from '../api/api';

// Skeleton Components
const SkeletonMessage = () => (
  <div className="flex justify-start mb-4 animate-pulse">
    <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl px-4 py-3 max-w-2xl">
      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-48 mb-2"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
    </div>
  </div>
);

const SkeletonSuggestion = () => (
  <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse">
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
  </div>
);

export default function AIAgentPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [conversationId, setConversationId] = useState(null);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load suggestions on mount
  useEffect(() => {
    loadSuggestions();
    sendWelcomeMessage();
  }, []);

  const sendWelcomeMessage = () => {
    setMessages([{
      role: 'ai',
      text: "Hi! I'm your AI Sales Manager. I have full access to your business data and can help you with:\n\n• Sales tracking and recording\n• Inventory management\n• Business analytics\n• Customer loans\n• Expense tracking\n• And much more!\n\nTry asking me something like:\n\"How is my business doing today?\"\n\"Add a new sale\"\n\"Which items are low on stock?\"",
      timestamp: new Date()
    }]);
  };

  const loadSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const response = await api.get('/ai-agent/suggestions');
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const sendMessage = async (messageText = null) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage = {
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setShowQuickActions(false);

    try {
      const response = await api.post('/ai-agent/chat', {
        message: textToSend,
        conversation_id: conversationId
      });

      const data = response.data;

      // Update conversation ID
      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
      }

      const aiMessage = {
        role: 'ai',
        text: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Reload suggestions after AI response
      loadSuggestions();
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        role: 'ai',
        text: '❌ Sorry, I encountered an error. Please try again or check your connection.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    { 
      label: 'Business Summary', 
      icon: TrendingUp, 
      prompt: 'Give me a quick summary of my business performance today',
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
    },
    { 
      label: 'Add Sale', 
      icon: ShoppingCart, 
      prompt: 'I want to record a new sale',
      color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    },
    { 
      label: 'Inventory Status', 
      icon: Package, 
      prompt: 'Show me my current inventory status and which items are low on stock',
      color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
    },
    { 
      label: 'Pending Loans', 
      icon: DollarSign, 
      prompt: 'Show me all pending customer loans',
      color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
    },
    { 
      label: 'Sales Analytics', 
      icon: BarChart3, 
      prompt: 'Give me sales analytics for this week',
      color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400'
    },
    { 
      label: 'Add Inventory', 
      icon: Plus, 
      prompt: 'I want to add new inventory from a supplier',
      color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
    }
  ];

  const getSuggestionColor = (type) => {
    switch(type) {
      case 'urgent': return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'warning': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">

        {/* 📱 HEADER */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Sparkles className="text-white w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
                AI Sales Manager
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Your intelligent business assistant
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Online & Ready</span>
            </div>
            {conversationId && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Session active
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          
          {/* 📱 SIDEBAR - Quick Actions & Suggestions */}
          <div className="lg:col-span-1 space-y-4">
            
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="text-blue-600 dark:text-blue-400 w-5 h-5" />
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">Quick Actions</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(action.prompt)}
                    disabled={loading}
                    className={`p-3 rounded-lg ${action.color} hover:opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left group`}
                  >
                    <action.icon className="w-5 h-5 mb-2 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-medium">{action.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Suggestions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="text-orange-600 dark:text-orange-400 w-5 h-5" />
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">Smart Alerts</h3>
              </div>

              {loadingSuggestions ? (
                <div className="space-y-2">
                  <SkeletonSuggestion />
                  <SkeletonSuggestion />
                </div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-6">
                  <Coffee className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    All good! No alerts right now.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-l-4 ${getSuggestionColor(suggestion.type)}`}
                    >
                      <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-1">
                        {suggestion.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {suggestion.message}
                      </p>
                      <button
                        onClick={() => sendMessage(suggestion.action)}
                        disabled={loading}
                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium disabled:opacity-50"
                      >
                        Take Action <ChevronRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 📱 CHAT AREA */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-[600px] sm:h-[700px]">
              
              {/* Chat Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <MessageSquare className="text-white w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-100">AI Assistant</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Powered by GPT-4</p>
                    </div>
                  </div>
                  {messages.length > 1 && (
                    <button
                      onClick={() => {
                        setMessages([]);
                        setConversationId(null);
                        sendWelcomeMessage();
                        loadSuggestions();
                      }}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                    >
                      <X size={16} /> Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {messages.length === 0 && !loading && (
                  <SkeletonMessage />
                )}

                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-2xl rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm sm:text-base break-words">
                        {message.text}
                      </div>
                      <div
                        className={`text-xs mt-2 ${
                          message.role === 'user'
                            ? 'text-blue-100'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-end gap-2 sm:gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me anything about your business..."
                      className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      rows={2}
                      disabled={loading}
                    />
                    <button
                      onClick={() => sendMessage()}
                      disabled={loading || !input.trim()}
                      className="absolute bottom-3 right-3 p-2 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                    </button>
                  </div>

                  <button
                    className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Voice input (coming soon)"
                  >
                    <Mic size={20} />
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>💡 Try: "How is my business doing?" or "Add a sale"</span>
                  <span className="hidden sm:block">Press Enter to send</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}