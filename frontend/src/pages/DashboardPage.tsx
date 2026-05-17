import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { 
  Database, 
  FileText, 
  Zap, 
  ArrowRight,
  Plus,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { DataSource, QueryHistory } from '@/types';
import { dataSourceAPI, textToSQLAPI } from '@/api';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend }) => {
  return (
    <Card className="h-full hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {trend !== undefined && (
            <p className={`text-sm mt-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? '+' : ''}{trend}% 较上周
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color.replace('text-', 'bg-')}/10`}>
          <span className={color}>{icon}</span>
        </div>
      </div>
    </Card>
  );
};

export const DashboardPage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const { token, user } = useAuth();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [recentQueries, setRecentQueries] = useState<QueryHistory[]>([]);
  const [totalQueries, setTotalQueries] = useState(0);
  const [successCount, setSuccessCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!token) return;
    try {
      const [sources, history, stats] = await Promise.all([
        dataSourceAPI.getAll(),
        textToSQLAPI.getHistory(),
        textToSQLAPI.getStats()
      ]);
      setDataSources(sources);
      setRecentQueries(history);
      setTotalQueries(stats.total_queries);
      setSuccessCount(stats.success_count);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">仪表盘</h1>
          <p className="text-gray-500 mt-1">欢迎回来，{user?.username}！查看您的数据概览</p>
        </div>
        <Button icon={<Plus className="w-5 h-5" />} onClick={() => onNavigate('datasource')}>
          添加数据源
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="数据源"
          value={dataSources.length}
          icon={<Database className="w-6 h-6" />}
          color="text-blue-600"
        />
        <StatCard
          title="查询次数"
          value={totalQueries}
          icon={<FileText className="w-6 h-6" />}
          color="text-indigo-600"
        />
        <StatCard
          title="成功次数"
          value={successCount}
          icon={<CheckCircle className="w-6 h-6" />}
          color="text-green-600"
        />
        <StatCard
          title="失败次数"
          value={totalQueries - successCount}
          icon={<XCircle className="w-6 h-6" />}
          color="text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">最近查询历史</h3>
            </div>
            <div className="space-y-3">
              {recentQueries.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">暂无查询记录</p>
                  <p className="text-sm text-gray-400 mt-1">开始使用智能查询功能</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">问题</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">SQL</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">状态</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentQueries.map((query) => (
                        <tr key={query.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-2">
                            <p className="text-sm text-gray-800 max-w-xs truncate">{query.question}</p>
                          </td>
                          <td className="py-3 px-2">
                            <p className="text-xs text-blue-600 font-mono max-w-xs truncate">{query.sql || 'N/A'}</p>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                              query.status === 'success' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : query.status === 'processing'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {query.status === 'success' && <CheckCircle className="w-3.5 h-3.5" />}
                              {query.status === 'failed' && <XCircle className="w-3.5 h-3.5" />}
                              {query.status === 'processing' && (
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              )}
                              {query.status === 'success' ? '成功' : query.status === 'processing' ? '处理中' : '失败'}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-sm text-gray-500">{formatTime(query.created_at)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-0">
            <div className="p-6 text-white">
              <Zap className="w-8 h-8 mb-4" />
              <h3 className="text-xl font-semibold mb-2">开始智能查询</h3>
              <p className="text-blue-100 text-sm mb-4">使用自然语言描述您的数据需求，AI将为您生成精确的SQL查询</p>
              <Button 
                variant="ghost" 
                className="bg-white text-blue-600 hover:bg-blue-50"
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={() => onNavigate('query')}
              >
                立即体验
              </Button>
            </div>
          </Card>

          <Card padding={false}>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-800">数据源列表</h3>
              </div>
              <div className="space-y-2">
                {dataSources.length === 0 ? (
                  <div className="text-center py-6">
                    <Database className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">暂无数据源</p>
                    <p className="text-xs text-gray-400 mt-1">点击上方按钮添加</p>
                  </div>
                ) : (
                  dataSources.map((ds) => (
                    <div
                      key={ds.id}
                      className="p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-800">{ds.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          ds.is_active 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {ds.is_active ? '已连接' : '未连接'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{ds.type} · {ds.host}:{ds.port}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => onNavigate('query')}
          className="text-left bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">智能查询</h4>
              <p className="text-sm text-gray-600">用自然语言向数据提问</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => onNavigate('datasource')}
          className="text-left bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 hover:shadow-lg hover:border-green-300 transition-all cursor-pointer"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Database className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">数据源管理</h4>
              <p className="text-sm text-gray-600">配置和管理数据库连接</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => onNavigate('query')}
          className="text-left bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-200 rounded-2xl p-6 hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">查询历史</h4>
              <p className="text-sm text-gray-600">查看历史查询和结果</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
