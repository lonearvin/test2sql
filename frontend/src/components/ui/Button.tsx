import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  children?: ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconPosition = 'left',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = `
    relative inline-flex items-center justify-center gap-2
    font-medium rounded-xl
    transition-all duration-300 ease-out
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    active:scale-[0.98]
  `;

  const variantStyles: Record<ButtonVariant, string> = {
    primary: `
      bg-gradient-to-r from-blue-500 to-indigo-600
      text-white
      shadow-lg shadow-blue-500/25
      hover:shadow-xl hover:shadow-blue-500/30 hover:from-blue-400 hover:to-indigo-500
      disabled:shadow-none
    `,
    secondary: `
      bg-gradient-to-r from-green-500 to-emerald-600
      text-white
      shadow-lg shadow-green-500/25
      hover:shadow-xl hover:shadow-green-500/30 hover:from-green-400 hover:to-emerald-500
      disabled:shadow-none
    `,
    outline: `
      bg-transparent
      border-2 border-blue-500/50 text-blue-600
      hover:bg-blue-50 hover:border-blue-500
    `,
    ghost: `
      bg-transparent text-gray-700
      hover:bg-gray-100
    `,
    danger: `
      bg-gradient-to-r from-red-500 to-rose-600
      text-white
      shadow-lg shadow-red-500/25
      hover:shadow-xl hover:shadow-red-500/30 hover:from-red-400 hover:to-rose-500
      disabled:shadow-none
    `,
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const iconSizes: Record<ButtonSize, string> = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className={`animate-spin ${iconSizes[size]}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!isLoading && icon && iconPosition === 'left' && (
        <span className={iconSizes[size]}>{icon}</span>
      )}
      {children}
      {!isLoading && icon && iconPosition === 'right' && (
        <span className={iconSizes[size]}>{icon}</span>
      )}
    </button>
  );
};

export default Button;
