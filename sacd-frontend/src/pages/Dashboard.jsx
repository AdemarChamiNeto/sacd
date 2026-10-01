import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Search, Filter, Eye, Clock, CheckCircle2, AlertCircle,
  TrendingUp, MapPin, Loader2, RefreshCw, Save, X, Archive,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const STATUS_OPTIONS = ['aberta', 'em_inspecao', 'resolvida'];

const STATUS_LABELS = {
  aberta:      'Aberta',
  em_inspecao: 'Em Inspeção',
  resolvida:   'Resolvida',
};

function getStatusBadge(status) {
  switch (status) {
    case 'aberta':
      return (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
          <AlertCircle className="h-3 w-3" /><span>Aberta</span>
        </span>
      );
    case 'em_inspecao':
      return (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
          <Clock className="h-3 w-3" /><span>Em Inspeção</span>
        </span>
      );
    case 'resolvida':
      return (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" /><span>Resolvida</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
          <span>{status}</span>
        </span>
      );
  }
}

function Dashboard() {
  const { currentUser } = useAuth();
  const [denuncias, setDenuncias]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todas');
  const [searchTerm, setSearchTerm]     = useState('');

  // Inline status editing
  const [editando, setEditando]         = useState(null); // denuncia id
  const [novoStatus, setNovoStatus]     = useState('');
  const [salvando, setSalvando]         = useState(false);
  const [arquivando, setArquivando]     = useState(null); // denuncia id sendo arquivada

  const fetchDenuncias = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const res = await axios.get(`${API_URL}/denuncias`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDenuncias(res.data || []);
    } catch {
      setError('Não foi possível carregar as denúncias.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchDenuncias(); }, [fetchDenuncias]);

  const handleAlterarStatus = async (id) => {
    setSalvando(true);
    try {
      const token = await currentUser.getIdToken();
      await axios.put(
        `${API_URL}/denuncias/${id}`,
        { status: novoStatus },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setEditando(null);
      await fetchDenuncias();
    } catch {
      setError('Erro ao alterar status.');
    } finally {
      setSalvando(false);
    }
  };

  const handleArquivar = async (id) => {
    if (!window.confirm('Arquivar esta denúncia? Ela ficará armazenada por 2 anos.')) return;
    setArquivando(id);
    try {
      const token = await currentUser.getIdToken();
      await axios.post(`${API_URL}/denuncias/${id}/arquivar`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchDenuncias();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao arquivar denúncia.');
    } finally {
      setArquivando(null);
    }
  };

  // Derived summary
  const total       = denuncias.length;
  const abertas     = denuncias.filter(d => d.status === 'aberta').length;
  const emInspecao  = denuncias.filter(d => d.status === 'em_inspecao').length;
  const resolvidas  = denuncias.filter(d => d.status === 'resolvida').length;

  const summaryCards = [
    { label: 'Total de Denúncias',  value: total,      icon: TrendingUp,  color: 'text-blue-600',    bg: 'bg-blue-50' },
    { label: 'Aguardando Ação',     value: abertas,    icon: AlertCircle, color: 'text-rose-600',    bg: 'bg-rose-50' },
    { label: 'Em Inspeção',         value: emInspecao, icon: Clock,       color: 'text-amber-600',   bg: 'bg-amber-50' },
    { label: 'Resolvidas',          value: resolvidas, icon: CheckCircle2,color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const denunciasFiltradas = denuncias.filter(d => {
    const matchStatus = filtroStatus === 'todas' || d.status === filtroStatus;
    const term = searchTerm.toLowerCase();
    const matchSearch =
      (d.descricao  || '').toLowerCase().includes(term) ||
      (d.bairro     || '').toLowerCase().includes(term) ||
      (d.logradouro || '').toLowerCase().includes(term);
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Painel de Controle</h2>
          <p className="text-slate-500 font-medium">Gerencie as denúncias e monitore a situação regional.</p>
        </div>
        <button
          onClick={fetchDenuncias}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </header>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 font-medium">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-3xl shadow-soft border border-slate-50 flex flex-col items-center text-center gap-3"
          >
            <div className={`${card.bg} ${card.color} p-3 rounded-2xl`}>
              <card.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">{card.value}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
        {/* Filters */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por descrição ou bairro..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="todas">Todos os Status</option>
              <option value="aberta">Abertas</option>
              <option value="em_inspecao">Em Inspeção</option>
              <option value="resolvida">Resolvidas</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Denúncia</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Localização</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {denunciasFiltradas.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <Link to={`/denuncias/${d.id}`} className="flex flex-col hover:text-primary-600 transition-colors">
                          <span className="text-sm font-bold text-slate-900 line-clamp-1">{d.descricao}</span>
                          <span className="text-xs text-slate-400">#{d.id}</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1 text-slate-600">
                          <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="text-sm font-medium">
                            {d.bairro || d.logradouro || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {editando === d.id ? (
                          <select
                            value={novoStatus}
                            onChange={(e) => setNovoStatus(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2 py-1 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-primary-500 outline-none"
                          >
                            {STATUS_OPTIONS.map(s => (
                              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                        ) : (
                          getStatusBadge(d.status)
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-600">
                          {d.data ? new Date(d.data).toLocaleDateString('pt-BR') : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editando === d.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAlterarStatus(d.id)}
                              disabled={salvando}
                              className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-60"
                              title="Salvar"
                            >
                              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => setEditando(null)}
                              className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                              title="Cancelar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              to={`/denuncias/${d.id}`}
                              className="p-2 hover:bg-primary-50 text-primary-600 rounded-lg transition-colors"
                              title="Ver Detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => { setEditando(d.id); setNovoStatus(d.status); }}
                              className="p-2 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
                              title="Alterar Status"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            {d.status === 'resolvida' && (
                              <button
                                onClick={() => handleArquivar(d.id)}
                                disabled={arquivando === d.id}
                                className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors disabled:opacity-60"
                                title="Arquivar"
                              >
                                {arquivando === d.id
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <Archive className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {denunciasFiltradas.length === 0 && (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-50 text-slate-300 mb-4">
                  <Search className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Nenhuma denúncia encontrada</h3>
                <p className="text-slate-500">Tente ajustar seus filtros de pesquisa.</p>
              </div>
            )}

            <div className="p-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                Mostrando {denunciasFiltradas.length} de {denuncias.length} denúncias
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
