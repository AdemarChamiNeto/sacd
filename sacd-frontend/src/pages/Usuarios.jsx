import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Users, Shield, Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ROLES = ['cidadao', 'fiscal', 'gerenciador', 'administrador', 'tecnico'];

const ROLE_LABELS = {
  cidadao:       'Cidadão',
  fiscal:        'Fiscal',
  gerenciador:   'Gerenciador',
  administrador: 'Administrador',
  tecnico:       'Técnico',
};

const roleBadge = (role) => {
  const map = {
    cidadao:       'bg-slate-100 text-slate-700',
    gerenciador:   'bg-blue-100 text-blue-700',
    administrador: 'bg-purple-100 text-purple-700',
    tecnico:       'bg-rose-100 text-rose-700',
  };
  return map[role] || 'bg-slate-100 text-slate-700';
};

function Usuarios() {
  const { currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(null);
  const [novaRole, setNovaRole] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(null);

  const fetchUsuarios = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const res = await axios.get(`${API_URL}/usuarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsuarios(res.data);
    } catch {
      setError('Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const handleAlterarRole = async (id) => {
    setSalvando(true);
    try {
      const token = await currentUser.getIdToken();
      await axios.put(`${API_URL}/usuarios/permissao/${id}`, JSON.stringify(novaRole), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      setSucesso(id);
      setEditando(null);
      await fetchUsuarios();
      setTimeout(() => setSucesso(null), 3000);
    } catch {
      setError('Erro ao alterar permissão.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-primary-600" />
            Gerenciar Usuários
          </h2>
          <p className="text-slate-500 font-medium mt-1">Visualize e altere as permissões dos usuários do sistema.</p>
        </div>
        <button
          onClick={fetchUsuarios}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </header>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 font-medium">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden"
        >
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {u.nome?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="font-semibold text-slate-900">{u.nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{u.email}</td>
                  <td className="px-6 py-4">
                    {editando === u.id ? (
                      <select
                        value={novaRole}
                        onChange={(e) => setNovaRole(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-primary-500 outline-none"
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${roleBadge(u.role)}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {sucesso === u.id ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                        <CheckCircle2 className="h-4 w-4" /> Atualizado!
                      </span>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editando === u.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAlterarRole(u.id)}
                          disabled={salvando}
                          className="px-3 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-all disabled:opacity-60 flex items-center gap-1"
                        >
                          {salvando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditando(null)}
                          className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditando(u.id); setNovaRole(u.role); }}
                        className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-all flex items-center gap-1 ml-auto"
                      >
                        <Shield className="h-3 w-3" />
                        Alterar Cargo
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {usuarios.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhum usuário encontrado.</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default Usuarios;
