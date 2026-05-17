import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Card, Modal } from '../components/ui/Card';
import { Database, Plus, Edit2, Trash2, Table, Server, Wifi, CheckCircle, XCircle } from 'lucide-react';
import type { DataSource } from '@/types';
import { dataSourceAPI } from '@/api';

const DatasourcePage: React.FC = () => {
  const { token } = useAuth();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentDataSource, setCurrentDataSource] = useState<DataSource | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'mysql',
    host: '',
    port: 3306,
    database: '',
    username: '',
    password: '',
    description: '',
  });
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter(t => t.id !== id)), 3000);
  };

  useEffect(() => {
    fetchDataSources();
  }, []);

  const fetchDataSources = async () => {
    if (!token) return;
    try {
      const response = await dataSourceAPI.getAll();
      setDataSources(response);
    } catch (error) {
      console.error('Failed to fetch data sources:', error);
      addToast('获取数据源失败', 'error');
    }
  };

  const handleSubmit = async () => {
    if (!token) return;
    setIsLoading(true);

    try {
      if (isEdit && currentDataSource) {
        await dataSourceAPI.update(currentDataSource.id, formData);
        addToast('数据源更新成功', 'success');
      } else {
        await dataSourceAPI.create(formData);
        addToast('数据源创建成功', 'success');
      }
      setIsModalOpen(false);
      setIsEdit(false);
      setCurrentDataSource(null);
      setFormData({
        name: '',
        type: 'mysql',
        host: '',
        port: 3306,
        database: '',
        username: '',
        password: '',
        description: '',
      });
      fetchDataSources();
    } catch (error) {
      console.error('Failed to save data source:', error);
      addToast('保存数据源失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm('确定要删除这个数据源吗？')) return;
    try {
      await dataSourceAPI.delete(id);
      addToast('数据源删除成功', 'success');
      fetchDataSources();
    } catch (error) {
      console.error('Failed to delete data source:', error);
      addToast('删除数据源失败', 'error');
    }
  };

  const handleSelectTables = async (dataSource: DataSource) => {
    setCurrentDataSource(dataSource);
    setAvailableTables(['users', 'orders', 'products', 'categories', 'order_items', 'reviews', 'payments']);
    setSelectedTables([]);
  };

  const handleSaveTables = async () => {
    if (!token || !currentDataSource) return;
    try {
      await dataSourceAPI.selectTables(currentDataSource.id, selectedTables);
      addToast('表选择已保存', 'success');
      fetchDataSources();
    } catch (error) {
      console.error('Failed to select tables:', error);
      addToast('保存表选择失败', 'error');
    }
  };

  const openEditModal = (dataSource: DataSource) => {
    setCurrentDataSource(dataSource);
    setIsEdit(true);
    setFormData({
      name: dataSource.name,
      type: dataSource.type,
      host: dataSource.host,
      port: dataSource.port,
      database: dataSource.database,
      username: dataSource.username,
      password: '',
      description: dataSource.description || '',
    });
    setIsModalOpen(true);
  };

  const getDbIcon = (_type: string) => {
    return <Server className="w-5 h-5" />;
  };

  return (
    <div className="relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">数据源管理</h1>
              <p className="text-gray-500">管理和配置您的数据库连接</p>
            </div>
          </div>
          <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="w-5 h-5" />}>
            添加数据源
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dataSources.map((dataSource, index) => (
            <motion.div
              key={dataSource.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <Card className="h-full hover:border-blue-500/20 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      dataSource.is_active
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-red-500/10 text-red-600'
                    }`}>
                      {dataSource.is_active ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 text-lg">{dataSource.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        dataSource.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {dataSource.is_active ? '已连接' : '未连接'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      dataSource.type === 'mysql' ? 'bg-blue-500/10 text-blue-600' : 'bg-indigo-500/10 text-indigo-600'
                    }`}>
                      {getDbIcon(dataSource.type)}
                    </div>
                    <span className="text-gray-600">{dataSource.type.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Wifi className="w-4 h-4" />
                    <span>{dataSource.host}:{dataSource.port}/{dataSource.database}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Server className="w-4 h-4" />
                    <span>{dataSource.username}</span>
                  </div>
                  {dataSource.description && (
                    <p className="text-sm text-gray-500 mt-2 pt-3 border-t border-gray-200">{dataSource.description}</p>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSelectTables(dataSource)}
                    icon={<Table className="w-4 h-4" />}
                    className="flex-1"
                  >
                    选择表
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(dataSource)}
                    icon={<Edit2 className="w-4 h-4" />}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(dataSource.id)}
                    icon={<Trash2 className="w-4 h-4" />}
                    className="hover:text-red-600 hover:bg-red-100"
                  />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {dataSources.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
              <Database className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">暂无数据源</h3>
            <p className="text-gray-500 mb-6">点击下方按钮添加您的第一个数据源</p>
            <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="w-5 h-5" />}>
              添加数据源
            </Button>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setIsEdit(false);
          setCurrentDataSource(null);
          setFormData({
            name: '',
            type: 'mysql',
            host: '',
            port: 3306,
            database: '',
            username: '',
            password: '',
            description: '',
          });
        }}
        title={isEdit ? '编辑数据源' : '添加数据源'}
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} isLoading={isLoading}>
              {isEdit ? '保存修改' : '创建'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <Input
            label="名称"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="输入数据源名称"
          />

          <Select
            label="类型"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            <option value="mysql">MySQL</option>
            <option value="postgresql">PostgreSQL</option>
          </Select>

          <Input
            label="主机地址"
            value={formData.host}
            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
            placeholder="localhost"
          />

          <Input
            label="端口"
            type="number"
            value={formData.port}
            onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 3306 })}
          />

          <Input
            label="数据库名"
            value={formData.database}
            onChange={(e) => setFormData({ ...formData, database: e.target.value })}
            placeholder="database_name"
          />

          <Input
            label="用户名"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="username"
          />

          <Input
            label="密码"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder={isEdit ? '留空则不修改密码' : 'password'}
          />

          <Input
            label="描述"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="可选描述"
          />
        </div>
      </Modal>

      <Modal
        isOpen={!!currentDataSource && availableTables.length > 0}
        onClose={() => {
          setCurrentDataSource(null);
          setAvailableTables([]);
          setSelectedTables([]);
        }}
        title={`选择表 - ${currentDataSource?.name}`}
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => {
              setCurrentDataSource(null);
              setAvailableTables([]);
              setSelectedTables([]);
            }}>
              取消
            </Button>
            <Button onClick={handleSaveTables} disabled={selectedTables.length === 0}>
              保存选择 ({selectedTables.length})
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          {availableTables.map((table) => (
            <label
              key={table}
              className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border ${
                selectedTables.includes(table)
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-500'
                  : 'bg-gray-50 border-transparent hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedTables.includes(table)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedTables([...selectedTables, table]);
                  } else {
                    setSelectedTables(selectedTables.filter((t) => t !== table));
                  }
                }}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-gray-50"
              />
              <Table className="w-5 h-5 text-gray-500" />
              <span className="text-gray-800 font-medium">{table}</span>
            </label>
          ))}
        </div>
      </Modal>

      <div className="fixed bottom-6 right-6 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-xl shadow-lg border animate-slide-up ${
              toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'
            }`}
          >
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DatasourcePage;
