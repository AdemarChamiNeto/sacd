import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function Login() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // LOGIN
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const token = await userCredential.user.getIdToken();

        const response = await axios.get(`${API_URL}/usuarios/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const role = response.data.role;

        if (
          role === 'gerenciador' ||
          role === 'administrador' ||
          role === 'tecnico'
        ) {
          navigate('/dashboard');
        } else {
          navigate('/denuncia');
        }
      } else {
        // CADASTRO
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Atualiza o displayName no Firebase
        await updateProfile(user, {
          displayName: name,
        });

        // Salva o usuário no banco e aguarda o perfil carregar antes de navegar
        try {
          const token = await user.getIdToken();

          await axios.post(
            `${API_URL}/usuarios`,
            {
              nome: name,
              email: email,
              firebaseUid: user.uid,
              role: 'cidadao',
              ativo: true,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          // Força o AuthContext a recarregar o perfil do banco agora que ele existe
          // Passa o user explicitamente pois currentUser no estado pode ainda ser null
          await refreshProfile(user);
        } catch (dbError) {
          console.error('Erro ao salvar usuário no banco de dados:', dbError);
        }

        // Novo usuário sempre entra como cidadão
        navigate('/denuncia');
      }
    } catch (err) {
      console.error('Erro de autenticação:', err.code, err.message);

      const errorMessages = {
        'auth/invalid-email': 'O endereço de e-mail não é válido.',
        'auth/user-disabled': 'O usuário foi desativado.',
        'auth/user-not-found': 'Usuário não encontrado. Verifique seu e-mail.',
        'auth/wrong-password': 'Senha incorreta. Tente novamente.',
        'auth/email-already-in-use': 'Este e-mail já está em uso. Tente fazer login.',
        'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
        'auth/operation-not-allowed': 'Operação não permitida. Contate o suporte.',
        'auth/too-many-requests': 'Muitas tentativas de login. Tente novamente mais tarde.',
      };

      alert(errorMessages[err.code] || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-sm p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 text-center">
          {isLogin ? 'Entrar' : 'Criar conta'}
        </h1>

        <p className="text-slate-600 text-center mb-6">
          {isLogin
            ? 'Acesse sua conta para continuar.'
            : 'Cadastre-se para registrar denúncias.'}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nome
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Seu nome"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="seuemail@exemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors disabled:opacity-60"
          >
            {loading
              ? 'Carregando...'
              : isLogin
              ? 'Entrar'
              : 'Criar conta'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary-700 font-medium hover:underline"
          >
            {isLogin
              ? 'Não tem conta? Cadastre-se'
              : 'Já tem conta? Faça login'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;