import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, MapPin, Calendar, Clock, CheckCircle2, AlertCircle,
  Archive, Loader2, Save, X, Camera, AlertTriangle,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const UPLOADS_BASE = window.location.port === '80' || window.location.port === ''
  ? ''   
  : API_URL.replace(/\/api$/, '');

const STATUS_CONFIG = {
  aberta:      { label: 'Aberta',       icon: AlertCircle,  bg: 'bg-rose-100',    text: 'text-rose-700',    border: 'border-rose-200' },
  em_inspecao: { label: 'Em Inspeção',  icon: Clock,        bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200' },
  resolvida:   { label: 'Resolvida',    icon: CheckCircle2, bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
};

const STATUS_OPTIONS = ['aberta', 'em_inspecao', 'resolvida'];
const STATUS_LABELS  = { aberta: 'Aberta', em_inspecao: 'Em Inspeção', resolvida: 'Resolvida' };

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, icon: AlertCircle, bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon className="h-4 w-4" />
      {cfg.label}
    </span>
  );
}

export default function DenunciaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();

  const [denuncia, setDenuncia]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [editandoStatus, setEditandoStatus] = useState(false);
  const [novoStatus, setNovoStatus] = useState('');
  const [salvando, setSalvando]     = useState(false);
  const [arquivando, setArquivando] = useState(false);
  const [msgSucesso, setMsgSucesso] = useState('');

  const isGerenciador = ['gerenciador', 'administrador', 'tecnico'].includes(role);

  const fetchDenuncia = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const res = await axios.get(`${API_URL}/denuncias/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDenuncia(res.data);
    } catch (err) {
      setError(err.response?.status === 404 ? 'Denúncia não encontrada.' : 'Erro ao carregar denúncia.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, id]);

  useEffect(() => { fetchDenuncia(); }, [fetchDenuncia]);

  const handleAlterarStatus = async () => {
    setSalvando(true);
    try {
      const token = await currentUser.getIdToken();
      await axios.put(`${API_URL}/denuncias/${id}`, { status: novoStatus }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEditandoStatus(false);
      setMsgSucesso('Status atualizado com sucesso!');
      setTimeout(() => setMsgSucesso(''), 3000);
      await fetchDenuncia();
    } catch {
      setError('Erro ao atualizar status.');
    } finally {
      setSalvando(false);
    }
  };

  const handleArquivar = async () => {
    if (!window.confirm('Arquivar esta denúncia? Ela ficará armazenada por 2 anos e depois será deletada automaticamente.')) return;
    setArquivando(true);
    try {
      const token = await currentUser.getIdToken();
      await axios.post(`${API_URL}/denuncias/${id}/arquivar`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMsgSucesso('Denúncia arquivada com sucesso!');
      setTimeout(() => navigate(-1), 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao arquivar denúncia.');
    } finally {
      setArquivando(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
    </div>
  );

  if (error && !denuncia) return (
    <div className="max-w-2xl mx-auto mt-12">
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-rose-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Não foi possível carregar</h2>
        <p className="text-rose-700 text-sm mb-6">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-6 py-2 bg-white border border-rose-200 text-rose-700 font-semibold rounded-xl hover:bg-rose-50 transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
      </div>
    </div>
  );

  if (!loading && !denuncia) return (
    <div className="max-w-2xl mx-auto mt-12">
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Denúncia não encontrada</h2>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
      </div>
    </div>
  );

  const dataFormatada = denuncia?.data
    ? new Date(denuncia.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto pb-16 space-y-6"
    >

      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Denúncia #{denuncia?.id}
            </p>
            <h1 className="text-2xl font-extrabold text-slate-900 leading-snug">
              {denuncia?.descricao}
            </h1>
          </div>
          <StatusBadge status={denuncia?.status} />
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-slate-400" />
            {dataFormatada}
          </span>
          {(denuncia?.bairro) && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-slate-400" />
              {denuncia.bairro}
            </span>
          )}
          {denuncia?.latitude && (
            <span className="flex items-center gap-1.5 font-mono text-xs">
              <MapPin className="h-4 w-4 text-slate-400" />
              {Number(denuncia.latitude).toFixed(5)}, {Number(denuncia.longitude).toFixed(5)}
            </span>
          )}
        </div>

        {msgSucesso && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            {msgSucesso}
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-semibold">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>

      {isGerenciador && !denuncia?.arquivada && (
        <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Ações</h2>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-slate-600">Status atual:</span>
            <StatusBadge status={denuncia?.status} />

            {!editandoStatus ? (
              <button
                onClick={() => { setEditandoStatus(true); setNovoStatus(denuncia?.status); }}
                className="ml-auto px-4 py-2 text-sm font-bold bg-primary-50 text-primary-700 border border-primary-200 rounded-xl hover:bg-primary-100 transition-all"
              >
                Alterar Status
              </button>
            ) : (
              <div className="ml-auto flex items-center gap-2">
                <select
                  value={novoStatus}
                  onChange={(e) => setNovoStatus(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <button
                  onClick={handleAlterarStatus}
                  disabled={salvando}
                  className="p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-60"
                >
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </button>
                <button onClick={() => setEditandoStatus(false)} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {denuncia?.status === 'resolvida' && (
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-bold text-slate-700">Arquivar denúncia</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Denúncias arquivadas são mantidas por 2 anos e depois deletadas automaticamente.
                  </p>
                </div>
                <button
                  onClick={handleArquivar}
                  disabled={arquivando}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded-xl hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-all disabled:opacity-60"
                >
                  {arquivando
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Archive className="h-4 w-4" />}
                  Arquivar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {denuncia?.arquivada && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700">
          <Archive className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Esta denúncia está arquivada</p>
            {denuncia.dataArquivamento && (
              <p className="text-xs mt-0.5">
                Arquivada em {new Date(denuncia.dataArquivamento).toLocaleDateString('pt-BR')} ·
                Será deletada em {new Date(new Date(denuncia.dataArquivamento).setFullYear(new Date(denuncia.dataArquivamento).getFullYear() + 2)).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        </div>
      )}

      {denuncia?.fotos?.length > 0 && (
        <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-6">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Camera className="h-4 w-4" /> Evidências Fotográficas ({denuncia.fotos.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {denuncia.fotos.map((foto) => {
              const src = foto.urlArquivo?.startsWith('http')
                ? foto.urlArquivo
                : `${UPLOADS_BASE}${foto.urlArquivo}`;
              return (
                <a key={foto.id} href={src} target="_blank" rel="noopener noreferrer">
                  <img
                    src={src}
                    alt={foto.nomeArquivo || `Foto ${foto.id}`}
                    className="w-full aspect-square object-cover rounded-2xl border border-slate-100 hover:opacity-90 transition-opacity"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </a>
              );
            })}
          </div>
        </div>
      )}

      {(!denuncia?.fotos || denuncia.fotos.length === 0) && (
        <div className="bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-8 text-center">
          <Camera className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Nenhuma foto enviada para esta denúncia.</p>
        </div>
      )}
    </motion.div>
  );
}
