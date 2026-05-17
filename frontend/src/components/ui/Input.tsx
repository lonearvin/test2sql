import React, { type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full bg-gray-50 border border-gray-200 rounded-xl
            px-4 py-3.5 text-gray-800 placeholder:text-gray-400
            transition-all duration-200
            hover:border-gray-300
            focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white
            ${icon ? 'pl-12' : ''}
            ${error ? 'border-red-300 focus:border-red-500' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full bg-gray-50 border border-gray-200 rounded-xl
          px-4 py-3 text-gray-800 placeholder:text-gray-400
          transition-all duration-200 resize-none
          hover:border-gray-300
          focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white
          ${error ? 'border-red-300 focus:border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({
  label,
  error,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`
            w-full bg-gray-50 border border-gray-200 rounded-xl
            px-4 py-3.5 text-gray-800
            transition-all duration-200
            appearance-none cursor-pointer
            hover:border-gray-300
            focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white
            ${error ? 'border-red-300 focus:border-red-500' : ''}
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
};

export { Input, Select };
