import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Sparkles, ArrowLeft, User, Shield, Bell, Palette, Key, LogOut, Check } from 'lucide-react';

export const RegisterPage: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);

    try {
      await register(username, email, password);
      onNavigate('login');
    } catch (err) {
      setError('注册失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card padding={false} className="overflow-hidden">
          <div className="relative p-8 pb-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          <div className="p-8 pt-16">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  创建账户
                </span>
              </h1>
              <p className="text-gray-500 text-lg">开启您的智能SQL之旅</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">用户名</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3.5 text-gray-800 placeholder:text-gray-400 transition-all duration-200 hover:border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">邮箱</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入邮箱"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3.5 text-gray-800 placeholder:text-gray-400 transition-all duration-200 hover:border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">密码</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Key className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3.5 text-gray-800 placeholder:text-gray-400 transition-all duration-200 hover:border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">确认密码</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Key className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3.5 text-gray-800 placeholder:text-gray-400 transition-all duration-200 hover:border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-5 h-5 text-red-500">!</div>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <Button type="submit" size="lg" className="w-full h-12 text-base" isLoading={isLoading}>
                注册账户
              </Button>
            </form>

            <div className="mt-8 text-center">
              <button
                onClick={() => onNavigate('login')}
                className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                返回登录
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  const tabs = [
    { id: 'profile', label: '个人信息', icon: <User className="w-4 h-4" /> },
    { id: 'security', label: '安全设置', icon: <Shield className="w-4 h-4" /> },
    { id: 'notifications', label: '通知', icon: <Bell className="w-4 h-4" /> },
    { id: 'appearance', label: '外观', icon: <Palette className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">设置中心</h1>
          <p className="text-gray-500">管理您的账户和偏好设置</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card padding={false} className="lg:col-span-1 h-fit">
          <div className="p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500/10 to-indigo-600/10 text-blue-700 border border-blue-500/20'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {tab.icon}
                <span className="font-medium">{tab.label}</span>
                {activeTab === tab.id && <Check className="w-4 h-4 ml-auto" />}
              </button>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'profile' && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-800 mb-6">个人信息</h3>
              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <span className="text-white text-2xl font-bold">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-800">{user?.username || 'User'}</h4>
                  <p className="text-gray-500">{user?.email || 'user@example.com'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">用户ID</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-600 font-mono text-sm">
                    {user?.id || 'N/A'}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">角色</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800">
                    {user?.role || 'user'}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-800 mb-6">安全设置</h3>
              <div className="space-y-4">
                <button className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-blue-600" />
                    <div className="text-left">
                      <p className="text-gray-800 font-medium">修改密码</p>
                      <p className="text-sm text-gray-500">更新您的账户密码</p>
                    </div>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                </button>

                <button className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-green-600" />
                    <div className="text-left">
                      <p className="text-gray-800 font-medium">双因素认证</p>
                      <p className="text-sm text-gray-500">启用双重身份验证</p>
                    </div>
                  </div>
                  <span className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded-full">未启用</span>
                </button>
              </div>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-800 mb-6">通知设置</h3>
              <div className="space-y-4">
                {[
                  { label: '查询完成通知', desc: 'SQL查询完成时接收通知', enabled: true },
                  { label: '错误告警', desc: '系统错误时接收告警', enabled: true },
                  { label: '每周报告', desc: '接收每周数据查询报告', enabled: false },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <div>
                      <p className="text-gray-800 font-medium">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                    <button
                      className={`w-12 h-7 rounded-full transition-colors relative ${
                        item.enabled ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                          item.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-800 mb-6">外观设置</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="text-gray-800 font-medium mb-4">主题</p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        setTheme('light');
                        localStorage.setItem('theme', 'light');
                        document.documentElement.classList.remove('dark');
                      }}
                      className={`flex-1 p-4 rounded-xl text-center transition-all ${
                        theme === 'light'
                          ? 'bg-white border-2 border-blue-500' 
                          : 'bg-gray-100 border-2 border-transparent hover:border-gray-300'
                      }`}
                    >
                      <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200" />
                      <span className={`text-sm ${theme === 'light' ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>浅色</span>
                    </button>
                    <button 
                      onClick={() => {
                        setTheme('dark');
                        localStorage.setItem('theme', 'dark');
                        document.documentElement.classList.add('dark');
                      }}
                      className={`flex-1 p-4 rounded-xl text-center transition-all ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-2 border-blue-500' 
                          : 'bg-gray-100 border-2 border-transparent hover:border-gray-300'
                      }`}
                    >
                      <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900" />
                      <span className={`text-sm ${theme === 'dark' ? 'text-white font-medium' : 'text-gray-600'}`}>深色</span>
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card className="border-red-200">
            <h3 className="text-lg font-semibold text-red-600 mb-4">危险区域</h3>
            <Button variant="danger" onClick={logout} className="w-full" icon={<LogOut className="w-5 h-5" />}>
              退出登录
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
