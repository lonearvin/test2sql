import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataSourceAPI, textToSQLAPI } from '../api';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { 
  Send, 
  Copy, 
  Check, 
  Sparkles, 
  Trash2,
  User,
  Bot,
  MessageSquare,
  Database,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Table,
  AlertTriangle
} from 'lucide-react';
import type { DataSource, ConversationMessage } from '@/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  results?: any[];
  status?: string;
  error?: string;
  timestamp: Date;
}

const QueryPage: React.FC = () => {
  const { token } = useAuth();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter(t => t.id !== id)), 3000);
  };

  useEffect(() => {
    fetchDataSources();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const fetchDataSources = async () => {
    if (!token) return;
    try {
      const response = await dataSourceAPI.getAll();
      setDataSources(response);
      if (response.length > 0) {
        setSelectedDataSource(response[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch data sources:', error);
    }
  };

  const buildConversationHistory = (messages: ChatMessage[]): ConversationMessage[] => {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.role === 'user' 
        ? msg.content 
        : `SQL: ${msg.sql || 'N/A'}\n结果: ${msg.results ? `${msg.results.length} 条记录` : (msg.error || 'N/A')}`
    }));
  };

  const handleSubmit = async () => {
    if (!token || !selectedDataSource || !currentQuestion.trim()) {
      addToast('请选择数据源并输入问题', 'error');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentQuestion.trim(),
      timestamp: new Date()
    };

    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    setCurrentQuestion('');
    setIsLoading(true);

    try {
      const conversationHistory = buildConversationHistory(newMessages);
      
      const response = await textToSQLAPI.query({
        data_source_id: selectedDataSource,
        question: currentQuestion.trim(),
        conversation_history: conversationHistory
      });

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.status === 'success' 
          ? `已为您生成SQL查询，共返回 ${response.results.length} 条记录`
          : response.error_message || '查询失败',
        sql: response.sql || undefined,
        results: response.results,
        status: response.status,
        error: response.error_message || undefined,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, assistantMessage]);

      if (response.status === 'success') {
        addToast('查询成功！', 'success');
      } else {
        addToast(response.error_message || '查询失败', 'error');
      }
    } catch (error) {
      console.error('Query failed:', error);
      addToast('查询失败，请重试', 'error');
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，查询过程中出现了错误，请稍后重试。',
        error: '网络错误',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast('SQL已复制', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearChat = () => {
    setChatMessages([]);
    addToast('对话已清除', 'success');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleResults = (messageId: string) => {
    setExpandedResults(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const getColumns = (results: any[] | undefined) => {
    if (!results || results.length === 0) return [];
    return Object.keys(results[0]);
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
              智能查询
            </h1>
            <p className="text-sm text-gray-500">AI驱动的自然语言转SQL查询</p>
          </div>
        </div>
      </div>

      <Card padding={false} className="flex-1 flex flex-col overflow-hidden shadow-xl border-0">
        <div className="px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-500" />
                <select
                  value={selectedDataSource}
                  onChange={(e) => setSelectedDataSource(e.target.value)}
                  disabled={dataSources.length === 0}
                  className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-w-[200px]"
                >
                  {dataSources.length === 0 ? (
                    <option value="">暂无数据源</option>
                  ) : (
                    dataSources.map((ds) => (
                      <option key={ds.id} value={ds.id}>
                        {ds.name} ({ds.type})
                      </option>
                    ))
                  )}
                </select>
              </div>
              
              {chatMessages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>清空对话</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-white/50 to-blue-50/20"
        >
          {chatMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-lg">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <MessageSquare className="w-10 h-10 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">开始智能对话</h3>
                <p className="text-gray-500 mb-8 leading-relaxed">
                  使用自然语言描述您的数据需求，AI将为您生成精确的SQL查询。支持多轮对话，您可以连续追问以完善查询需求。
                </p>
                
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">试试这样问</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { icon: '📊', text: '查询所有用户' },
                      { icon: '📈', text: '统计订单数量' },
                      { icon: '📦', text: '获取产品列表' }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentQuestion(item.text)}
                        disabled={!selectedDataSource}
                        className="px-4 py-3 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl text-sm text-gray-700 hover:text-blue-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-left flex items-center gap-2"
                      >
                        <span>{item.icon}</span>
                        <span>{item.text}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {!selectedDataSource && (
                  <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-sm font-medium">请先添加并选择数据源</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                
                <div className={`max-w-[75%] ${message.role === 'user' ? 'order-1' : ''}`}>
                  <div 
                    className={`rounded-2xl p-4 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-white border border-gray-100 text-gray-800 shadow-lg'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {message.role === 'user' && <User className="w-5 h-5 mt-0.5 flex-shrink-0 opacity-80" />}
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  </div>

                  {message.sql && (
                    <div className="mt-3 bg-gray-900 rounded-xl overflow-hidden shadow-xl">
                      <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
                        <span className="text-xs font-medium text-gray-400">SQL Query</span>
                        <button
                          onClick={() => handleCopy(message.sql!)}
                          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        >
                          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? '已复制' : '复制'}
                        </button>
                      </div>
                      <pre className="px-4 py-3 text-sm font-mono text-blue-300 overflow-x-auto">
                        {message.sql}
                      </pre>
                    </div>
                  )}

                  {message.results && message.results.length > 0 && (
                    <div className="mt-3 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-lg">
                      <button
                        onClick={() => toggleResults(message.id)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Table className="w-4 h-4 text-indigo-500" />
                          <span className="text-sm font-medium text-gray-700">
                            查询结果
                          </span>
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                            {message.results.length} 条
                          </span>
                        </div>
                        {expandedResults.has(message.id) ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      
                      {expandedResults.has(message.id) && (
                        <div className="border-t border-gray-100">
                          <div className="overflow-x-auto max-h-80">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  {getColumns(message.results).map((col) => (
                                    <th key={col} className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap border-b border-gray-100">
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {message.results.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-b-0">
                                    {getColumns(message.results).map((col) => (
                                      <td key={col} className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {message.error && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-800">查询失败</p>
                          <p className="text-sm text-red-600 mt-1">{message.error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-2 px-1">
                    {formatTimestamp(message.timestamp)}
                  </p>
                </div>

                {message.role === 'user' && (
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg px-6 py-4">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                  <span className="text-sm text-gray-500">AI正在思考中...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-white/80 backdrop-blur-sm">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={selectedDataSource ? "输入您的问题，AI将为您生成SQL..." : "请先选择数据源"}
                disabled={!selectedDataSource || isLoading}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-gray-800 placeholder:text-gray-400 transition-all duration-200 hover:border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                rows={1}
                style={{ minHeight: '56px', maxHeight: '160px' }}
              />
            </div>
            <Button 
              onClick={handleSubmit}
              isLoading={isLoading}
              disabled={!currentQuestion.trim() || !selectedDataSource}
              className="h-14 w-14 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 shadow-lg shadow-blue-500/30 px-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
            <span>按 Enter 发送，Shift + Enter 换行</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              AI已就绪
            </span>
          </div>
        </div>
      </Card>

      <div className="fixed bottom-6 right-6 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-5 py-3 rounded-xl shadow-lg border backdrop-blur-sm animate-slide-up ${
              toast.type === 'success' 
                ? 'bg-green-50/90 border-green-200 text-green-800' 
                : 'bg-red-50/90 border-red-200 text-red-800'
            }`}
          >
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QueryPage;
