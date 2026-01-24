/**
 * Alert 컴포넌트
 */
import { HTMLAttributes, forwardRef } from 'react';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className = '', variant = 'info', children, ...props }, ref) => {
    const variants = {
      info: 'bg-blue-50 text-blue-800 border-blue-200',
      success: 'bg-green-50 text-green-800 border-green-200',
      warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      error: 'bg-red-50 text-red-800 border-red-200',
    };

    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={`flex items-start p-4 rounded-md border ${variants[variant]} ${className}`}
        {...props}
      >
        <span className="mr-3 text-lg">{icons[variant]}</span>
        <div className="flex-1">{children}</div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';
