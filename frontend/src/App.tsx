import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import LoginPage from '@/pages/LoginPage';
import { RegisterPage, SettingsPage } from '@/pages/PageComponents';
import { DashboardPage } from '@/pages/DashboardPage';
import DatasourcePage from '@/pages/DatasourcePage';
import QueryPage from '@/pages/QueryPage';
import './index.css';

type PageType = 'login' | 'register' | 'dashboard' | 'datasource' | 'query' | 'settings';

interface AppContentProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}

const AppContent = ({ currentPage, onNavigate }: AppContentProps) => {
  const { logout } = useAuth();

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return <LoginPage onNavigate={(page) => onNavigate(page as PageType)} />;
      case 'register':
        return <RegisterPage onNavigate={(page) => onNavigate(page as PageType)} />;
      case 'dashboard':
        return <DashboardPage />;
      case 'datasource':
        return <DatasourcePage />;
      case 'query':
        return <QueryPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <>
      {currentPage === 'login' || currentPage === 'register' ? (
        renderPage()
      ) : (
        <div className="min-h-screen bg-gray-50">
          <Sidebar 
            currentPage={currentPage} 
            onNavigate={onNavigate} 
            onLogout={logout}
          />
          <main className="ml-64 p-8 min-h-screen">
            {renderPage()}
          </main>
        </div>
      )}
    </>
  );
};

const AppWithAuth = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('login');
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      setCurrentPage('dashboard');
    }
  }, [isAuthenticated, loading]);

  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('access_token');
      if (!token && currentPage !== 'login' && currentPage !== 'register') {
        setCurrentPage('login');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentPage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return <AppContent currentPage={currentPage} onNavigate={setCurrentPage} />;
};

const App = () => {
  return (
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  );
};

export default App;
