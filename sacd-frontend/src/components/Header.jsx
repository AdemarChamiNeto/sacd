import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, LogOut, Home, AlertTriangle, Map,
  BarChart3, Users, ChevronDown, Bell, CheckCheck, Archive,
} from 'lucide-react';

const STATUS_COLORS = {
  aberta:      'text-rose-600 bg-rose-50',
  em_inspecao: 'text-amber-600 bg-amber-50',
  resolvida:   'text-emerald-600 bg-emerald-50',
};

const ROLE_LABELS = {
  cidadao:       'Cidadão',
  fiscal:        'Fiscal',
  gerenciador:   'Gerenciador',
  administrador: 'Administrador',
  tecnico:       'Técnico',
};

function Header() {
  const { currentUser, userProfile, logout, role } = useAuth();
  const { notifications, naoLidas, marcarComoLida, marcarTodasComoLidas, STATUS_LABELS } = useNotifications();

  const [mobileMenuOpen, setMobileMenuOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen]       = useState(false);
  const [notifOpen, setNotifOpen]             = useState(false);
  const location = useLocation();

  const getMenuItems = () => {
    const base = [{ href: '/', label: 'Home', icon: Home }];
    if (!currentUser) return base;

    if (role === 'cidadao' || role === 'fiscal') return [
      ...base,
      { href: '/denuncia', label: 'Nova Denúncia', icon: AlertTriangle },
      { href: '/mapa',     label: 'Mapa',          icon: Map },
    ];

    if (role === 'gerenciador') return [
      ...base,
      { href: '/denuncia',  label: 'Nova Denúncia', icon: AlertTriangle },
      { href: '/mapa',      label: 'Mapa',           icon: Map },
      { href: '/dashboard', label: 'Dashboard',      icon: BarChart3 },
    ];

    if (role === 'administrador') return [
      ...base,
      { href: '/denuncia',     label: 'Nova Denúncia', icon: AlertTriangle },
      { href: '/mapa',         label: 'Mapa',           icon: Map },
      { href: '/dashboard',    label: 'Dashboard',      icon: BarChart3 },
      { href: '/estatisticas', label: 'Estatísticas',   icon: BarChart3 },
      { href: '/arquivadas',   label: 'Arquivadas',     icon: Archive },
    ];

    if (role === 'tecnico') return [
      ...base,
      { href: '/denuncia',     label: 'Nova Denúncia', icon: AlertTriangle },
      { href: '/mapa',         label: 'Mapa',           icon: Map },
      { href: '/dashboard',    label: 'Dashboard',      icon: BarChart3 },
      { href: '/estatisticas', label: 'Estatísticas',   icon: BarChart3 },
      { href: '/arquivadas',   label: 'Arquivadas',     icon: Archive },
    ];

    return base;
  };

  const menuItems = getMenuItems();
  const isActive  = (href) => location.pathname === href;

  const handleLogout = async () => {
    try { await logout(); window.location.href = '/login'; }
    catch (e) { console.error(e); }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="hidden sm:inline text-xl font-bold text-slate-900">SACD</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  isActive(item.href)
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-slateate-600 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-2">

            {currentUser && (role === 'cidadao' || role === 'fiscal') && (
              <div className="relative hidden sm:block">
                <button
                  onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-all relative"
                >
                  <Bell className="h-5 w-5 text-slate-600" />
                  {naoLidas > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-rose-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                      {naoLidas > 9 ? '9+' : naoLidas}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <span className="font-bold text-slate-900 text-sm">Notificações</span>
                        {naoLidas > 0 && (
                          <button
                            onClick={marcarTodasComoLidas}
                            className="text-xs text-primary-600 font-semibold hover:underline flex items-center gap-1"
                          >
                            <CheckCheck className="h-3 w-3" /> Marcar todas como lidas
                          </button>
                        )}
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center text-slate-400 text-sm">
                            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            Nenhuma notificação
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <button
                              key={n.id}
                              onClick={() => marcarComoLida(n.id)}
                              className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${!n.lida ? 'bg-primary-50/40' : ''}`}
                            >
                              {!n.lida && (
                                <span className="inline-block w-2 h-2 rounded-full bg-primary-500 mr-2 mb-0.5" />
                              )}
                              <p className="text-xs font-bold text-slate-900 line-clamp-1">{n.descricao}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Status alterado:
                                <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_COLORS[n.statusAnterior]}`}>
                                  {STATUS_LABELS[n.statusAnterior]}
                                </span>
                                {' → '}
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_COLORS[n.statusNovo]}`}>
                                  {STATUS_LABELS[n.statusNovo]}
                                </span>
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {new Date(n.hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {currentUser && (
              <div className="relative hidden sm:block">
                <button
                  onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }}
                  className="flex items-center space-x-2 px-3 py-2 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {userProfile?.nome?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-semibold text-slate-900 line-clamp-1">{userProfile?.nome || 'Usuário'}</p>
                    <p className="text-xs text-slate-500">{ROLE_LABELS[userProfile?.role] || 'Cidadão'}</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-600 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
                    >
                      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                        <p className="text-sm font-semibold text-slate-900">{userProfile?.nome}</p>
                        <p className="text-xs text-slate-500 mt-1">{userProfile?.email}</p>
                        <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">
                          {ROLE_LABELS[userProfile?.role] || 'Cidadão'}
                        </span>
                      </div>

                      <div className="py-2">
                        {role === 'tecnico' && (
                          <>
                            <Link
                              to="/usuarios"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center space-x-3 px-6 py-3 hover:bg-slate-50 transition-colors"
                            >
                              <Users className="h-4 w-4 text-slate-600" />
                              <span className="text-sm text-slate-700">Gerenciar Usuários</span>
                            </Link>
                            <hr className="my-1" />
                          </>
                        )}

                        <button
                          onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                          className="w-full flex items-center space-x-3 px-6 py-3 hover:bg-rose-50 transition-colors text-rose-600"
                        >
                          <LogOut className="h-4 w-4" />
                          <span className="text-sm font-semibold">Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {!currentUser && (
              <Link to="/login" className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-all">
                Login
              </Link>
            )}

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-all">
              {mobileMenuOpen ? <X className="h-6 w-6 text-slate-600" /> : <Menu className="h-6 w-6 text-slate-600" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-200 bg-slate-50 py-4 space-y-2"
            >
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all ${
                    isActive(item.href) ? 'bg-primary-100 text-primary-700' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              ))}

              {currentUser && (
                <>
                  <hr className="my-2" />
                  <button
                    onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold transition-all"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </>
              )}
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

export default Header;
