import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3, TrendingUp, Info, ExternalLink,
  ShieldCheck, AlertCircle, Clock, CheckCircle2, Users, Loader2, RefreshCw, PieChart,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function Estatisticas() {
  const { currentUser } = useAuth();

  const [denuncias, setDenuncias]   = useState([]);
  const [usuarios, setUsuarios]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [denRes, usrRes] = await Promise.allSettled([
        axios.get(`${API_URL}/denuncias`, { headers }),
        axios.get(`${API_URL}/usuarios`,  { headers }),
      ]);

      if (denRes.status === 'fulfilled') setDenuncias(denRes.value.data || []);
      if (usrRes.status === 'fulfilled') setUsuarios(usrRes.value.data  || []);
    } catch {
      setError('Não foi possível carregar as estatísticas.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const total      = denuncias.length;
  const abertas    = denuncias.filter(d => d.status === 'aberta').length;
  const emInspecao = denuncias.filter(d => d.status === 'em_inspecao').length;
  const resolvidas = denuncias.filter(d => d.status === 'resolvida').length;
  const totalUsers = usuarios.length;
  const taxaResolucao = total > 0 ? Math.round((resolvidas / total) * 100) : 0;

  const stats = [
    { label: 'Total de Denúncias',  value: loading ? '—' : total,        icon: AlertCircle,   color: 'text-rose-600',    bg: 'bg-rose-50' },
    { label: 'Focos em Inspeção',   value: loading ? '—' : emInspecao,   icon: Clock,         color: 'text-amber-600',   bg: 'bg-amber-50' },
    { label: 'Cidadãos Ativos',     value: loading ? '—' : totalUsers,   icon: Users,         color: 'text-blue-600',    bg: 'bg-blue-50' },
    { label: 'Taxa de Resolução',   value: loading ? '—' : `${taxaResolucao}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  // Status breakdown for bar chart visual
  const statusData = [
    { label: 'Abertas',       value: abertas,    color: 'bg-rose-500',    text: 'text-rose-700' },
    { label: 'Em Inspeção',   value: emInspecao, color: 'bg-amber-500',   text: 'text-amber-700' },
    { label: 'Resolvidas',    value: resolvidas, color: 'bg-emerald-500', text: 'text-emerald-700' },
  ];

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Estatísticas e Relatórios</h2>
          <p className="text-slate-500 font-medium mt-1">Análise em tempo real do controle da dengue em sua região.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
          <button
            onClick={() => window.print()}
            className="bg-primary-600 text-white px-4 py-2.5 rounded-2xl text-sm font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 flex items-center space-x-2"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 font-medium">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-8 rounded-[2.5rem] shadow-soft border border-slate-50 group hover:border-primary-100 transition-all flex flex-col items-center text-center"
              >
                <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl group-hover:scale-110 transition-transform mb-6`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <p className="text-4xl font-extrabold text-slate-900 mb-1">{stat.value}</p>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-[3rem] shadow-soft border border-slate-100 overflow-hidden"
          >
            <div className="p-8 border-b border-slate-50 flex items-center space-x-3">
              <div className="bg-primary-100 p-2 rounded-xl">
                <PieChart className="h-5 w-5 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Dashboard Analítico</h3>
              <span className="ml-auto text-xs font-bold text-slate-400 flex items-center gap-1">
                <Info className="h-4 w-4" />Powered by Power BI
              </span>
            </div>
            <div className="w-full" style={{ height: '85vh' }}>
              <iframe
                title="PowerBisacd"
                width="100%"
                height="100%"
                src="https://app.powerbi.com/reportEmbed?reportId=bde85caa-82af-4090-9bd6-e91d6e40c5bf&autoAuth=true&ctid=35b3ff6d-d573-46f5-95d2-c5089d879e8d"
                frameBorder="0"
                allowFullScreen
                className="w-full"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[3rem] shadow-soft border border-slate-100 overflow-hidden"
          >
            <div className="p-8 border-b border-slate-50 flex items-center space-x-3">
              <div className="bg-primary-100 p-2 rounded-xl">
                <BarChart3 className="h-5 w-5 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Distribuição por Status</h3>
              <span className="ml-auto text-xs font-bold text-slate-400 flex items-center gap-1">
                <Info className="h-4 w-4" />Dados em tempo real
              </span>
            </div>

            <div className="p-8 space-y-6">
              {total === 0 ? (
                <p className="text-center text-slate-400 py-8">Nenhuma denúncia registrada ainda.</p>
              ) : (
                statusData.map((s) => {
                  const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                  return (
                    <div key={s.label}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-bold ${s.text}`}>{s.label}</span>
                        <span className="text-sm font-bold text-slate-600">{s.value} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          className={`${s.color} h-3 rounded-full`}
                        />
                      </div>
                    </div>
                  );
                })
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-500 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4 text-primary-500" />
                  <span>Dados protegidos conforme LGPD</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-bold text-emerald-600">{resolvidas} resolvidas</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}

export default Estatisticas;
