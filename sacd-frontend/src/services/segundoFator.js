// 2FA com app autenticador (TOTP) usando o Firebase Authentication.
// Pré-requisito no projeto do Firebase: Identity Platform + TOTP ativados
// (veja scripts/ativar-totp.mjs e a seção "2FA" do README).
import {
  multiFactor,
  getMultiFactorResolver,
  TotpMultiFactorGenerator,
} from 'firebase/auth';

/** Liga/desliga a exigência no front. Tem que bater com Auth__ExigirSegundoFator da API. */
export const EXIGIR_2FA = (import.meta.env.VITE_EXIGIR_2FA ?? 'true') !== 'false';

export const NOME_APP = 'SACD';

/** O login atual usou o segundo fator? (o Firebase marca isso no token) */
export async function sessaoTemSegundoFator(user) {
  const resultado = await user.getIdTokenResult();
  return Boolean(resultado?.claims?.firebase?.sign_in_second_factor);
}

/** O usuário já cadastrou um app autenticador? */
export function temAutenticadorCadastrado(user) {
  return multiFactor(user).enrolledFactors.some(
    (f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID,
  );
}

/**
 * Situação do 2FA para o usuário logado:
 *  - 'ok':          sessão com segundo fator (ou 2FA desligado);
 *  - 'cadastrar':   ainda não tem autenticador → mandar para /2fa;
 *  - 'reautenticar': tem autenticador, mas esta sessão não usou (ex.: logo depois de cadastrar) → login de novo.
 */
export async function situacaoSegundoFator(user) {
  if (!EXIGIR_2FA || !user) return 'ok';
  if (await sessaoTemSegundoFator(user)) return 'ok';
  return temAutenticadorCadastrado(user) ? 'reautenticar' : 'cadastrar';
}

/** Gera o segredo e a URL otpauth:// para o QR code. */
export async function iniciarCadastro(user) {
  const sessao = await multiFactor(user).getSession();
  const segredo = await TotpMultiFactorGenerator.generateSecret(sessao);
  return {
    segredo,
    chave: segredo.secretKey,
    url: segredo.generateQrCodeUrl(user.email ?? 'usuario', NOME_APP),
  };
}

/** Confirma o cadastro com o código de 6 dígitos que o app mostrou. */
export async function concluirCadastro(user, segredo, codigo) {
  const assercao = TotpMultiFactorGenerator.assertionForEnrollment(segredo, limparCodigo(codigo));
  await multiFactor(user).enroll(assercao, 'App autenticador');
}

/** Se o erro do login pedir o segundo fator, devolve o resolver; senão, null. */
export function resolverDoErro(auth, erro) {
  return erro?.code === 'auth/multi-factor-auth-required' ? getMultiFactorResolver(auth, erro) : null;
}

/** Termina o login com o código do app autenticador. */
export async function concluirLogin(resolver, codigo) {
  const dica = resolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
  if (!dica) throw Object.assign(new Error('Nenhum app autenticador cadastrado.'), { code: 'sacd/sem-totp' });
  const assercao = TotpMultiFactorGenerator.assertionForSignIn(dica.uid, limparCodigo(codigo));
  return resolver.resolveSignIn(assercao);
}

export function limparCodigo(codigo) {
  return String(codigo ?? '').replace(/\D/g, '').slice(0, 6);
}

export function codigoValido(codigo) {
  return /^\d{6}$/.test(limparCodigo(codigo));
}

export const MENSAGENS_2FA = {
  'auth/invalid-verification-code': 'Código incorreto. Confira o app e tente de novo.',
  'auth/totp-challenge-timeout': 'O código expirou. Use o código atual do app.',
  'auth/requires-recent-login': 'Por segurança, entre de novo antes de cadastrar o autenticador.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
  'auth/operation-not-allowed': 'O 2FA não está ativado no Firebase. Avise o administrador.',
  'auth/unverified-email': 'Confirme seu e-mail antes de ativar o 2FA.',
  'sacd/sem-totp': 'Sua conta não tem app autenticador cadastrado. Fale com o suporte.',
};
