import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Database, Lock, User } from 'lucide-react';

const LoginPage: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError('用户名或密码错误');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/25">
                <Database className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">欢迎回来</h2>
              <p className="text-slate-500">登录 Text2SQL 开始使用</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">用户名</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">密码</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-5 h-5 text-red-500">!</div>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 text-base bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 shadow-lg shadow-blue-500/25 transition-all duration-300 text-white font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <>
                    <span>登录系统</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-slate-500 text-sm">
                还没有账户？
                <button
                  onClick={() => onNavigate('register')}
                  className="ml-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                >
                  立即注册
                </button>
              </p>
            </div>
          </div>

          <div className="px-8 py-4 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center justify-center gap-5 text-xs text-slate-500">
              <span>MySQL</span>
              <span className="w-1 h-1 bg-slate-400 rounded-full" />
              <span>PostgreSQL</span>
              <span className="w-1 h-1 bg-slate-400 rounded-full" />
              <span>Redis</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
