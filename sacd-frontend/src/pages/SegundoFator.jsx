import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { signOut, sendEmailVerification } from 'firebase/auth';
import QRCode from 'qrcode';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  iniciarCadastro,
  concluirCadastro,
  codigoValido,
  limparCodigo,
  MENSAGENS_2FA,
  NOME_APP,
} from '../services/segundoFator';

/** Cadastro do app autenticador (2FA por TOTP). Obrigatório antes de usar o sistema. */
function SegundoFator() {
  const navigate = useNavigate();
  const { currentUser, segundoFator, loading } = useAuth();
  const [cadastro, setCadastro] = useState(null); // { segredo, chave, url }
  const [qr, setQr] = useState('');
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [precisaRelogar, setPrecisaRelogar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  // o Firebase exige e-mail confirmado para cadastrar o 2FA
  const [emailConfirmado, setEmailConfirmado] = useState(Boolean(currentUser?.emailVerified));
  const [infoEmail, setInfoEmail] = useState('');

  useEffect(() => {
    if (!currentUser || segundoFator !== 'cadastrar' || !emailConfirmado) return;
    let ativo = true;
    iniciarCadastro(currentUser)
      .then(async (c) => {
        if (!ativo) return;
        setCadastro(c);
        setQr(await QRCode.toDataURL(c.url, { margin: 1, width: 220 }));
      })
      .catch((e) => {
        if (!ativo) return;
        if (e?.code === 'auth/requires-recent-login') setPrecisaRelogar(true);
        setErro(MENSAGENS_2FA[e?.code] || 'Não foi possível iniciar o cadastro do autenticador.');
      });
    return () => { ativo = false; };
  }, [currentUser, segundoFator, emailConfirmado]);

  if (loading) return null;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (segundoFator === 'ok') return <Navigate to="/" replace />;

  const relogar = async () => {
    await signOut(auth);
    navigate('/login', { replace: true });
  };

  const reenviarEmail = async () => {
    try {
      await sendEmailVerification(currentUser);
      setInfoEmail('Enviamos o link de confirmação para o seu e-mail.');
    } catch (e) {
      setInfoEmail(MENSAGENS_2FA[e?.code] || 'Não foi possível enviar o e-mail agora.');
    }
  };

  const jaConfirmei = async () => {
    await currentUser.reload();
    if (currentUser.emailVerified) {
      // token novo com email_verified = true
      await currentUser.getIdToken(true);
      setEmailConfirmado(true);
      setInfoEmail('');
    } else {
      setInfoEmail('Ainda não aparece como confirmado. Abra o link do e-mail e tente de novo.');
    }
  };

  const confirmar = async (e) => {
    e.preventDefault();
    if (!codigoValido(codigo)) {
      setErro('Digite os 6 números que aparecem no app.');
      return;
    }
    setEnviando(true);
    setErro('');
    try {
      await concluirCadastro(currentUser, cadastro.segredo, codigo);
      // A sessão atual foi aberta sem o 2FA: sai e entra de novo já com o código
      await signOut(auth);
      navigate('/login', {
        replace: true,
        state: { aviso: 'Autenticador cadastrado! Agora entre com seu e-mail, senha e o código do app.' },
      });
    } catch (e2) {
      setErro(MENSAGENS_2FA[e2?.code] || 'Não foi possível confirmar o código.');
    } finally {
      setEnviando(false);
    }
  };

  const chaveFormatada = cadastro?.chave?.match(/.{1,4}/g)?.join(' ') ?? '';

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">Proteja sua conta</h1>
        <p className="text-slate-600 text-center mb-6">
          O {NOME_APP} exige verificação em duas etapas. Use um app autenticador
          (Google Authenticator, Microsoft Authenticator, Authy…).
        </p>

        {erro && (
          <p role="alert" className="mb-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 text-sm">
            {erro}
          </p>
        )}

        {!emailConfirmado ? (
          <div className="space-y-4 text-center">
            <p className="text-slate-700">
              Primeiro, confirme seu e-mail: abra o link que enviamos para <strong>{currentUser.email}</strong>.
            </p>
            {infoEmail && <p role="status" className="text-sm text-slate-600">{infoEmail}</p>}
            <button type="button" onClick={jaConfirmei}
              className="w-full py-3 rounded-2xl bg-primary-600 text-white font-semibold hover:bg-primary-700">
              Já confirmei
            </button>
            <button type="button" onClick={reenviarEmail} className="w-full text-sm text-primary-700 hover:underline">
              Reenviar e-mail
            </button>
          </div>
        ) : precisaRelogar ? (
          <button type="button" onClick={relogar}
            className="w-full py-3 rounded-2xl bg-primary-600 text-white font-semibold hover:bg-primary-700">
            Entrar de novo
          </button>
        ) : !cadastro ? (
          <p className="text-center text-slate-500" aria-live="polite">Gerando o código…</p>
        ) : (
          <form onSubmit={confirmar} className="space-y-5">
            <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700">
              <li>Abra o app autenticador e escolha <strong>adicionar conta</strong>.</li>
              <li>Escaneie o QR code (ou digite a chave abaixo).</li>
              <li>Digite o código de 6 números que aparecer.</li>
            </ol>

            {qr && (
              <img src={qr} alt="QR code para cadastrar o SACD no app autenticador"
                width="220" height="220" className="mx-auto rounded-xl border border-slate-200" />
            )}

            <div className="text-center">
              <span className="block text-xs text-slate-500 mb-1">Chave para digitar no app</span>
              <code data-testid="chave-totp" className="font-mono text-sm tracking-wider bg-slate-100 px-3 py-1 rounded-lg select-all">
                {chaveFormatada}
              </code>
            </div>

            <div>
              <label htmlFor="codigo-2fa" className="block text-sm font-medium text-slate-700 mb-1">
                Código do app
              </label>
              <input
                id="codigo-2fa"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                value={codigo}
                onChange={(e) => setCodigo(limparCodigo(e.target.value))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-center text-2xl tracking-[0.4em] outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="000000"
                required
              />
            </div>

            <button type="submit" disabled={enviando}
              className="w-full py-3 rounded-2xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-60">
              {enviando ? 'Confirmando…' : 'Ativar verificação em duas etapas'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default SegundoFator;
