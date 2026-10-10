import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import axios from 'axios';
import { auth } from '../firebase';
import { situacaoSegundoFator } from '../services/segundoFator';

const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // 'ok' | 'cadastrar' (sem app autenticador ainda) — ver services/segundoFator.js
  const [segundoFator, setSegundoFator] = useState('ok');
  const [aviso, setAviso] = useState(null);
//busca do perfil do usuario no banco via GET /usuarios/me usando token do firebase para autenticação
  const fetchUserProfile = useCallback(async (user) => {
    if (!user) {
      setUserProfile(null);
      return null;
    }

    try {
      const token = await user.getIdToken();

      const response = await axios.get(`${API_URL}/usuarios/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUserProfile(response.data);
      setError(null);
      return response.data;
    } catch (apiError) {
      console.error('Erro ao buscar perfil na API:', apiError);
      
      if (apiError.response?.status === 401) {
        console.warn('Token inválido ou expirado');
      } else if (apiError.response?.status === 404) {
        console.warn('Usuário não encontrado no banco de dados');
      }
      
      setUserProfile(null);
      setError(apiError.message);
      return null;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
//controle de login/logout em tempo real, atualiza o perfil automaticamente
      if (!user) {
        setCurrentUser(null);
        setUserProfile(null);
        setSegundoFator('ok');
        setLoading(false);
        return;
      }

      // 2FA obrigatório: sem o segundo fator a API recusa tudo, então nem busca o perfil
      const situacao = await situacaoSegundoFator(user);
      if (situacao === 'reautenticar') {
        // acabou de cadastrar o autenticador: a sessão atual não vale, precisa entrar com o código
        setAviso('Entre de novo usando o código do app autenticador.');
        await signOut(auth);
        return;
      }
      setSegundoFator(situacao);
      setCurrentUser(user);
      if (situacao === 'ok') {
        await fetchUserProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchUserProfile]);

  useEffect(() => {
    if (!currentUser || !userProfile) return;
//verificação se ouve alteração no cargo do usuario a cada 30s
    const roleCheckInterval = setInterval(async () => {
      const updatedProfile = await fetchUserProfile(currentUser);
      
      if (updatedProfile && userProfile.role !== updatedProfile.role) {
        console.log(`Role atualizado: ${userProfile.role} → ${updatedProfile.role}`);
        window.dispatchEvent(new CustomEvent('roleChanged', { detail: { oldRole: userProfile.role, newRole: updatedProfile.role } }));
      }
    }, 30000);

    return () => clearInterval(roleCheckInterval);
  }, [currentUser, userProfile, fetchUserProfile]);
//chama o logout
  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      setError(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      setError(error.message);
    }
  };
//força o recarregamento no perfil, para atualizar as informaçoes no cadastro
  const refreshProfile = useCallback(async (userOverride) => {
    const user = userOverride || currentUser;
    if (!user) return null;
    return await fetchUserProfile(user);
  }, [currentUser, fetchUserProfile]);

  const hasPermission = useCallback((requiredRole) => {
    if (!userProfile) return false;
//verifica o cargo do usuario para ver se ele tem o cargo exigido
    const roleHierarchy = {
      'cidadao': 1,
      'fiscal': 1,
      'gerenciador': 2,
      'administrador': 3,
      'tecnico': 4
    };

    const userRoleLevel = roleHierarchy[userProfile.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    return userRoleLevel >= requiredRoleLevel;
  }, [userProfile]);
//expoe as informaçoes do usuario e funçoes de autenticação para o resto da aplicação
  const value = useMemo(() => ({
    currentUser,
    userProfile,
    role: userProfile?.role || null,
    loading,
    error,
    logout,
    refreshProfile,
    hasPermission,
    isAuthenticated: !!currentUser && !!userProfile,
    segundoFator,
    aviso,
    limparAviso: () => setAviso(null),
  }), [currentUser, userProfile, loading, error, refreshProfile, hasPermission, segundoFator, aviso]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
//hook para acessar o contexto e lançar erro caso seja usado fora do provider
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return context;
};
