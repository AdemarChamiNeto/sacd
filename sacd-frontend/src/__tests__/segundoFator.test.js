import { describe, it, expect, vi, beforeEach } from 'vitest';

const enrolledFactors = [];
const enroll = vi.fn();
const getSession = vi.fn().mockResolvedValue('sessao');
vi.mock('firebase/auth', () => ({
  multiFactor: vi.fn(() => ({ enrolledFactors, enroll, getSession })),
  getMultiFactorResolver: vi.fn(() => ({ resolver: true })),
  TotpMultiFactorGenerator: {
    FACTOR_ID: 'totp',
    generateSecret: vi.fn().mockResolvedValue({
      secretKey: 'ABCDEFGHIJKLMNOP',
      generateQrCodeUrl: vi.fn((conta, app) => `otpauth://totp/${app}:${conta}?secret=ABCDEFGHIJKLMNOP`),
    }),
    assertionForEnrollment: vi.fn((segredo, codigo) => ({ tipo: 'cadastro', codigo })),
    assertionForSignIn: vi.fn((uid, codigo) => ({ tipo: 'login', uid, codigo })),
  },
}));

import { TotpMultiFactorGenerator } from 'firebase/auth';
import {
  situacaoSegundoFator,
  iniciarCadastro,
  concluirCadastro,
  resolverDoErro,
  concluirLogin,
  limparCodigo,
  codigoValido,
} from '../services/segundoFator';

const usuario = (claims = {}) => ({
  email: 'ana@test.com',
  getIdTokenResult: vi.fn().mockResolvedValue({ claims }),
});

describe('segundoFator', () => {
  beforeEach(() => {
    enrolledFactors.length = 0;
    vi.clearAllMocks();
  });

  it('sessão que usou TOTP está ok', async () => {
    expect(await situacaoSegundoFator(usuario({ firebase: { sign_in_second_factor: 'totp' } }))).toBe('ok');
  });

  it('sem autenticador cadastrado pede cadastro', async () => {
    expect(await situacaoSegundoFator(usuario({ firebase: { sign_in_provider: 'password' } }))).toBe('cadastrar');
  });

  it('com autenticador mas sessão só com senha pede novo login', async () => {
    enrolledFactors.push({ factorId: 'totp' });
    expect(await situacaoSegundoFator(usuario({ firebase: {} }))).toBe('reautenticar');
  });

  it('sem usuário não há o que exigir', async () => {
    expect(await situacaoSegundoFator(null)).toBe('ok');
  });

  it('gera chave e URL otpauth com o nome do app e o e-mail', async () => {
    const c = await iniciarCadastro(usuario());
    expect(c.chave).toBe('ABCDEFGHIJKLMNOP');
    expect(c.url).toBe('otpauth://totp/SACD:ana@test.com?secret=ABCDEFGHIJKLMNOP');
  });

  it('confirma o cadastro só com os dígitos do código', async () => {
    await concluirCadastro(usuario(), { s: 1 }, '123 456');
    expect(TotpMultiFactorGenerator.assertionForEnrollment).toHaveBeenCalledWith({ s: 1 }, '123456');
    expect(enroll).toHaveBeenCalledWith({ tipo: 'cadastro', codigo: '123456' }, 'App autenticador');
  });

  it('só devolve resolver quando o erro pede o segundo fator', () => {
    expect(resolverDoErro({}, { code: 'auth/multi-factor-auth-required' })).toEqual({ resolver: true });
    expect(resolverDoErro({}, { code: 'auth/wrong-password' })).toBeNull();
  });

  it('termina o login com o fator TOTP da conta', async () => {
    const resolver = { hints: [{ factorId: 'phone', uid: 'p' }, { factorId: 'totp', uid: 'f1' }], resolveSignIn: vi.fn().mockResolvedValue('ok') };
    await concluirLogin(resolver, '654321');
    expect(resolver.resolveSignIn).toHaveBeenCalledWith({ tipo: 'login', uid: 'f1', codigo: '654321' });
  });

  it('recusa login se a conta não tem TOTP', async () => {
    const resolver = { hints: [{ factorId: 'phone', uid: 'p' }], resolveSignIn: vi.fn() };
    await expect(concluirLogin(resolver, '654321')).rejects.toMatchObject({ code: 'sacd/sem-totp' });
  });

  it('valida o formato do código', () => {
    expect(limparCodigo(' 12-34 56 9')).toBe('123456');
    expect(codigoValido('123456')).toBe(true);
    expect(codigoValido('12345')).toBe(false);
    expect(codigoValido('abcdef')).toBe(false);
  });
});
