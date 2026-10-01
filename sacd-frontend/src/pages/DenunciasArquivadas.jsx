import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Archive, Calendar, Trash2, AlertTriangle, RefreshCw,
  ChevronRight, Search, X,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const DOIS_ANOS_MS = 2 * 365.25 * 24 * 60 * 60 * 1000;

function dataDeletacao(dataArquivamento) {
  if (!dataArquivamento) return null;
  return new Date(new Date(dataArquivamento).getTime() + DOIS_ANOS_MS);
}

function diasRestantes(dataArquivamento) {
  const del = dataDeletacao(dataArquivamento);
  if (!del) return null;
  const diff = del - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function UrgenciaChip() {
  return null;
}

export default function DenunciasArquivadas() {
  const { currentUser, role } = useAuth();
  const [denuncias, setDenuncias]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [erro, setErro]             = useState('');
  const [busca, setBusca]           = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // id da denúncia a deletar
  const [deletando, setDeletando]   = useState(false);

  const podeExcluir = role === 'tecnico';

  const buscarArquivadas = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setErro('');
      const token = await currentUser.getIdToken();
      const res = await axios.get(`${API_URL}/denuncias/arquivadas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDenuncias(res.data || []);
    } catch (e) {
      setErro('Não foi possível carregar as denúncias arquivadas.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { buscarArquivadas(); }, [buscarArquivadas]);

  const handleDelete = async (id) => {
    if (!podeExcluir) return;
    setDeletando(true);
    try {
      const token = await currentUser.getIdToken();
      await axios.delete(`${API_URL}/denuncias/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDenuncias((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setErro('Erro ao excluir a denúncia.');
    } finally {
      setDeletando(false);
      setConfirmDelete(null);
    }
  };

  const filtradas = denuncias.filter((d) =>
    !busca ||
    d.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
    d.bairro?.toLowerCase().includes(busca.toLowerCase()) ||
    String(d.id).includes(busca)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Archive className="h-5 w-5 text-slate-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Denúncias Arquivadas</h1>
          </div>
          <p className="text-sm text-slate-500 ml-14">
            Registros resolvidos e arquivados — retidos indefinidamente
          </p>
        </div>
        <button
          onClick={buscarArquivadas}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por descrição, bairro ou ID..."
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
        />
        {busca && (
          <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {erro && (
        <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {erro}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
        </div>
      )}

      {!loading && !erro && filtradas.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Archive className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {busca ? 'Nenhum resultado para essa busca' : 'Nenhuma denúncia arquivada'}
          </p>
        </div>
      )}

      {!loading && filtradas.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">

          <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {filtradas.length} {filtradas.length === 1 ? 'registro' : 'registros'}
            </span>
            {podeExcluir && (
              <span className="text-xs text-slate-400">Técnico pode excluir permanentemente</span>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            <AnimatePresence>
              {filtradas.map((d) => {
                const dias = diasRestantes(d.dataArquivamento);
                return (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="px-6 py-4 hover:bg-slate-50/60 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-bold text-slate-400">#{d.id}</span>
                          {d.bairro && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                              {d.bairro}
                            </span>
                          )}
                          <UrgenciaChip dias={dias} />
                        </div>
                        <p className="text-sm font-semibold text-slate-800 line-clamp-2 mb-2">{d.descricao}</p>

                        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Criada em {formatDate(d.data)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Archive className="h-3.5 w-3.5" />
                            Arquivada em {formatDate(d.dataArquivamento)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link
                          to={`/denuncias/${d.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-all"
                        >
                          Ver detalhes
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>

                        {podeExcluir && (
                          <button
                            onClick={() => setConfirmDelete(d.id)}
                            title="Excluir permanentemente"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      <AnimatePresence>
        {confirmDelete !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            onClick={() => !deletando && setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            >
              <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center mb-4">
                <Trash2 className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Excluir permanentemente?</h3>
              <p className="text-sm text-slate-500 mb-6">
                A denúncia <span className="font-bold">#{confirmDelete}</span> será excluída definitivamente do banco de dados. Essa ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  disabled={deletando}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={deletando}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deletando ? (
                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
