import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, Loader2, RefreshCw } from 'lucide-react';

export const LoadingSkeleton = ({ count = 3, className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-20 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-2xl"
        />
      ))}
    </div>
  );
};

export const LoadingSpinner = ({ text = 'Carregando...', fullScreen = false }) => {
  if (fullScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100"
      >
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-semibold">{text}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 text-primary-600 animate-spin mb-3" />
      <p className="text-slate-600 font-medium">{text}</p>
    </div>
  );
};

export const ErrorAlert = ({
  error,
  onRetry,
  title = 'Erro',
  fullScreen = false,
}) => {
  const message = typeof error === 'string' ? error : error?.message || 'Algo deu errado';

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-rose-50 border border-rose-200 rounded-2xl p-6"
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <AlertCircle className="h-6 w-6 text-rose-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-rose-900">{title}</h3>
          <p className="text-rose-700 mt-1 text-sm">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Tentar Novamente</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-slate-100 px-4">
        <div className="max-w-md w-full">{content}</div>
      </div>
    );
  }

  return content;
};

export const EmptyState = ({
  icon: Icon = AlertCircle,
  title = 'Nada aqui',
  description = 'Não há dados para exibir',
  action = null,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="py-12 px-4 text-center"
    >
      <div className="inline-flex items-center justify-center h-16 w-16 bg-slate-100 rounded-2xl mb-4">
        <Icon className="h-8 w-8 text-slate-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 mb-6 max-w-sm">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all"
        >
          {action.icon && <action.icon className="h-5 w-5" />}
          <span>{action.label}</span>
        </button>
      )}
    </motion.div>
  );
};

export const SuccessToast = ({ message = 'Operação realizada com sucesso!', duration = 3000 }) => {
  const [show, setShow] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setShow(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start space-x-3 z-50"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="text-emerald-900 font-medium">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const ErrorToast = ({ message = 'Algo deu errado!', duration = 5000 }) => {
  const [show, setShow] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setShow(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start space-x-3 z-50"
        >
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <p className="text-rose-900 font-medium">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const InfoToast = ({ message = 'Informação importante', duration = 4000 }) => {
  const [show, setShow] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setShow(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3 z-50"
        >
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-blue-900 font-medium">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const StateHandler = ({
  loading,
  error,
  data,
  loadingComponent = <LoadingSpinner />,
  errorComponent,
  emptyComponent,
  children,
  onRetry,
}) => {
  if (loading) {
    return loadingComponent;
  }

  if (error) {
    return errorComponent || <ErrorAlert error={error} onRetry={onRetry} />;
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return emptyComponent || <EmptyState />;
  }

  return children;
};

import { AnimatePresence } from 'framer-motion';

export default {
  LoadingSkeleton,
  LoadingSpinner,
  ErrorAlert,
  EmptyState,
  SuccessToast,
  ErrorToast,
  InfoToast,
  StateHandler,
};
