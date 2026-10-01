import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  AlertCircle, Clock, CheckCircle2, ChevronRight,
  Plus, Loader2, FileText, RefreshCw,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const STATUS_CONFIG = {
  aberta:      { label: 'Aberta',      icon: AlertCircle,  bg: 'bg-rose-100',    text: 'text-rose-700',    border: 'border-rose-200' },
  em_inspecao: { label: 'Em Inspeção', icon: Clock,        bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200' },
  resolvida:   { label: 'Resolvida',   icon: CheckCircle2, bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, icon: FileText, bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

export default function MinhasDenuncias() {
  const { currentUser } = useAuth();
  const [denuncias, setDenuncias] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [expanded, setExpanded]   = useState(true);

  const fetchMinhas = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const res = await axios.get(`${API_URL}/denuncias/minhas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDenuncias(res.data || []);
    } catch {
      setError('Não foi possível carregar suas denúncias.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchMinhas(); }, [fetchMinhas]);

  if (!currentUser) return null;

  const preview = denuncias.slice(0, 4);

  return (
    <div className="w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">

        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-primary-600 transition-colors"
          >
            <FileText className="h-4 w-4 text-primary-600" />
            Minhas Denúncias
            {denuncias.length > 0 && (
              <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-bold">
                {denuncias.length}
              </span>
            )}
            <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchMinhas}
              disabled={loading}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-all text-slate-500"
              title="Atualizar"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              to="/denuncia"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova Denúncia
            </Link>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {loading ? (
                <div className="flex items-center gap-2 py-2 text-slate-400 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando...
                </div>
              ) : error ? (
                <p className="text-xs text-rose-600 py-1">{error}</p>
              ) : denuncias.length === 0 ? (
                <div className="flex items-center gap-3 py-2">
                  <p className="text-sm text-slate-400">Você ainda não fez nenhuma denúncia.</p>
                  <Link to="/denuncia" className="text-sm text-primary-600 font-semibold hover:underline">
                    Fazer primeira denúncia →
                  </Link>
                </div>
              ) : (
                <div className="flex items-start gap-3 overflow-x-auto pb-1 scrollbar-thin">
                  {preview.map((d) => (
                    <motion.div
                      key={d.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex-shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 min-w-[200px] max-w-[240px] text-center"
                    >
                      <p className="text-xs font-bold text-slate-800 line-clamp-1 mb-1">{d.descricao}</p>
                      <div className="flex items-center justify-center gap-2">
                        <StatusBadge status={d.status} />
                        <span className="text-[10px] text-slate-400">
                          {d.dataCriacao
                            ? new Date(d.dataCriacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                            : ''}
                        </span>
                      </div>
                    </motion.div>
                  ))}

                  {denuncias.length > 4 && (
                    <div className="flex-shrink-0 flex items-center self-stretch">
                      <span className="text-xs text-slate-400 font-medium whitespace-nowrap px-2">
                        +{denuncias.length - 4} mais
                      </span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
