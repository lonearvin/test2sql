import React, { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  padding?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  padding = true,
}) => {
  return (
    <div
      className={`
        bg-white rounded-2xl
        border border-gray-200
        shadow-lg
        ${padding ? 'p-6' : ''}
        ${className}
      `}
    >
      {title && (
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full" />
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) => {
  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`
          relative w-full ${sizeStyles[size]}
          bg-white rounded-2xl
          border border-gray-200
          shadow-2xl
          animate-scale-in
          max-h-[90vh] overflow-hidden flex flex-col
        `}
      >
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full" />
              <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
        {footer && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
  const typeStyles = {
    success: 'border-green-200 bg-green-50',
    error: 'border-red-200 bg-red-50',
    info: 'border-blue-200 bg-blue-50',
  };

  const iconColors = {
    success: 'text-green-500',
    error: 'text-red-500',
    info: 'text-blue-500',
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl
        ${typeStyles[type]}
        shadow-lg
        animate-slide-up
      `}
    >
      {type === 'success' && (
        <svg className={`w-5 h-5 ${iconColors[type]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {type === 'error' && (
        <svg className={`w-5 h-5 ${iconColors[type]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {type === 'info' && (
        <svg className={`w-5 h-5 ${iconColors[type]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      <span className="text-sm text-gray-800 flex-1">{message}</span>
      <button
        onClick={() => onClose(id)}
        className="p-1 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white/50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export { Card, Modal, Toast };
