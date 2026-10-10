import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  situacaoSegundoFator,
  resolverDoErro,
  concluirLogin,
  codigoValido,
  limparCodigo,
  MENSAGENS_2FA,
} from '../services/segundoFator';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { aviso: avisoContexto, limparAviso } = useAuth();
  const aviso = location.state?.aviso || avisoContexto;

  // segunda etapa do login (código do app autenticador)
  const [resolver2fa, setResolver2fa] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [erro2fa, setErro2fa] = useState('');

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Depois do login completo: 2FA pendente → /2fa; senão vai para a área do papel
  const entrar = async (user) => {
    if ((await situacaoSegundoFator(user)) !== 'ok') {
      navigate('/2fa');
      return;
    }
    const token = await user.getIdToken();
    const response = await axios.get(`${API_URL}/usuarios/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const role = response.data.role;
    if (role === 'gerenciador' || role === 'administrador' || role === 'tecnico') {
      navigate('/dashboard');
    } else {
      navigate('/denuncia');
    }
  };

  // LOGIN (2ª etapa: código do app autenticador)
  const confirmarCodigo = async (e) => {
    e.preventDefault();
    if (!codigoValido(codigo)) {
      setErro2fa('Digite os 6 números que aparecem no app.');
      return;
    }
    setLoading(true);
    setErro2fa('');
    try {
      const credencial = await concluirLogin(resolver2fa, codigo);
      await entrar(credencial.user);
    } catch (err) {
      setErro2fa(MENSAGENS_2FA[err?.code] || 'Não foi possível confirmar o código.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // LOGIN (1ª etapa: e-mail e senha)
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
          const resolver = resolverDoErro(auth, err);
          if (!resolver) throw err;
          // conta com 2FA: pede o código do app
          setResolver2fa(resolver);
          limparAviso?.();
          return;
        }
        await entrar(userCredential.user);
      } else {
        // CADASTRO
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Atualiza o displayName no Firebase
        await updateProfile(user, {
          displayName: name,
        });
        // O Firebase só deixa cadastrar o 2FA com e-mail confirmado
        await sendEmailVerification(user).catch((e) => console.warn('Falha ao enviar verificação:', e?.code));

        // Salva o usuário no banco e aguarda o perfil carregar antes de navegar
        try {
          const token = await user.getIdToken();

          // A API tira uid e e-mail do token; o corpo leva só o nome
          await axios.post(
            `${API_URL}/usuarios`,
            { nome: name },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          // O perfil só é carregado depois do 2FA (sem ele a API responde 403)
        } catch (dbError) {
          console.error('Erro ao salvar usuário no banco de dados:', dbError);
        }

        // Conta nova: cadastrar o app autenticador antes de usar o sistema
        navigate('/2fa');
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

        {aviso && !resolver2fa && (
          <p role="status" className="mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-sm">
            {aviso}
          </p>
        )}

        {resolver2fa ? (
          <form onSubmit={confirmarCodigo} className="space-y-4" aria-label="Verificação em duas etapas">
            <p className="text-slate-600 text-sm">
              Abra o app autenticador e digite o código de 6 números do <strong>SACD</strong>.
            </p>
            {erro2fa && (
              <p role="alert" className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 text-sm">
                {erro2fa}
              </p>
            )}
            <div>
              <label htmlFor="codigo-login" className="block text-sm font-medium text-slate-700 mb-1">
                Código do app
              </label>
              <input
                id="codigo-login"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={7}
                value={codigo}
                onChange={(e) => setCodigo(limparCodigo(e.target.value))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-center text-2xl tracking-[0.4em] outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="000000"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors disabled:opacity-60"
            >
              {loading ? 'Verificando...' : 'Confirmar'}
            </button>
            <button
              type="button"
              onClick={() => { setResolver2fa(null); setCodigo(''); setErro2fa(''); }}
              className="w-full text-sm text-slate-500 hover:underline"
            >
              Voltar
            </button>
          </form>
        ) : (
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
        )}

        {!resolver2fa && (
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
        )}
      </div>
    </div>
  );
}

export default Login;