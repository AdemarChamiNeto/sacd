import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children, requiredRole = 'cidadao' }) {
  const { currentUser, userProfile, loading, isAuthenticated, hasPermission } = useAuth();

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-slate-100"
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center">
            <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
          </div>
          <p className="mt-4 text-slate-600 font-semibold">Carregando...</p>
        </div>
      </motion.div>
    );
  }

  if (!currentUser || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(requiredRole)) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-slate-100 px-4"
      >
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center border border-rose-100">
          <div className="inline-flex items-center justify-center h-16 w-16 bg-rose-100 rounded-full mb-6">
            <svg className="h-8 w-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2M6.34 18.66a1 1 0 00-1.414-1.414l-.707.707a1 1 0 101.414 1.414l.707-.707m9.172-9.172a1 1 0 00-1.414-1.414l-.707.707a1 1 0 101.414 1.414l.707-.707m2.828 2.828a1 1 0 00-1.414-1.414l-.707.707a1 1 0 101.414 1.414l.707-.707m-9.172 9.172a1 1 0 00-1.414-1.414l-.707.707a1 1 0 101.414 1.414l.707-.707" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">Acesso Negado</h2>

          <p className="text-slate-600 mb-2">
            Você não tem permissão para acessar esta página.
            É necessário ter o perfil de <span className="font-semibold text-slate-800">{requiredRole}</span> ou superior.
          </p>
          <p className="text-sm text-slate-400 mb-8">
            Seu perfil atual: <span className="font-semibold">{userProfile?.role}</span>
          </p>

          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-primary-700 transition-all"
            >
              Voltar para Home
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full bg-slate-100 text-slate-900 px-6 py-3 rounded-2xl font-semibold hover:bg-slate-200 transition-all"
            >
              Dashboard
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
