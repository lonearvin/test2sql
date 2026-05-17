import React from 'react';
import {
  Database,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LayoutDashboard
} from 'lucide-react';
import Button from '../ui/Button';

type PageType = 'dashboard' | 'datasource' | 'query' | 'settings';

interface SidebarProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const menuItems: { id: PageType; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: '仪表盘', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'query', label: '智能查询', icon: <Sparkles className="w-5 h-5" /> },
  { id: 'datasource', label: '数据源', icon: <Database className="w-5 h-5" /> },
  { id: 'settings', label: '设置中心', icon: <Settings className="w-5 h-5" /> },
];

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, onLogout, collapsed, onToggleCollapse }) => {

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen
        bg-white
        border-r border-gray-200
        flex flex-col
        transition-all duration-300 ease-out
        ${collapsed ? 'w-20' : 'w-64'}
        z-40
      `}
    >
      <div className="h-20 flex items-center justify-between px-5 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-lg">Text2SQL</h1>
              <p className="text-xs text-gray-500">智能数据查询</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25 mx-auto">
            <FileText className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      <nav className="flex-1 py-6 px-3">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl
                  transition-all duration-200 ease-out
                  group relative overflow-hidden
                  ${
                    currentPage === item.id
                      ? 'bg-gradient-to-r from-blue-500/10 to-indigo-600/10 text-gray-800 border border-blue-500/20'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }
                `}
              >
                {currentPage === item.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full" />
                )}
                <span className={currentPage === item.id ? 'text-blue-600' : 'group-hover:text-gray-800'}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
                {currentPage === item.id && !collapsed && (
                  <div className="ml-auto">
                    <div className="w-2 h-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full" />
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-3 border-t border-gray-200">
        <Button
          variant="ghost"
          onClick={onLogout}
          className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>退出登录</span>}
        </Button>
      </div>

      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-24 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-100 hover:border-blue-500/30 transition-all duration-200 shadow-lg"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        )}
      </button>
    </aside>
  );
};

export default Sidebar;
