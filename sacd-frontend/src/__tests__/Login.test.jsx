import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Login from '../pages/Login';
import { useAuth } from '../context/AuthContext';

vi.mock('axios');
vi.mock('../context/AuthContext');
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  sendEmailVerification: vi.fn().mockResolvedValue(),
}));
const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});
vi.mock('../services/segundoFator', async () => {
  const actual = await vi.importActual('../services/segundoFator');
  return { ...actual, situacaoSegundoFator: vi.fn(), resolverDoErro: vi.fn(), concluirLogin: vi.fn() };
});
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { situacaoSegundoFator, resolverDoErro, concluirLogin } from '../services/segundoFator';

const usuario = { getIdToken: vi.fn().mockResolvedValue('token') };

async function preencherLogin() {
  await userEvent.type(screen.getByPlaceholderText('seuemail@exemplo.com'), 'ana@test.com');
  await userEvent.type(screen.getByPlaceholderText('••••••••'), 'senha-forte');
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('Login com 2FA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ aviso: null, limparAviso: vi.fn() });
    window.alert = vi.fn();
  });

  it('pede o código do app quando a conta tem 2FA e entra depois do código', async () => {
    signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/multi-factor-auth-required' });
    resolverDoErro.mockReturnValue({ hints: [] });
    concluirLogin.mockResolvedValue({ user: usuario });
    situacaoSegundoFator.mockResolvedValue('ok');
    axios.get.mockResolvedValue({ data: { role: 'cidadao' } });

    render(<MemoryRouter><Login /></MemoryRouter>);
    await preencherLogin();

    const campo = await screen.findByLabelText('Código do app');
    await userEvent.type(campo, '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/denuncia'));
    expect(concluirLogin).toHaveBeenCalledWith({ hints: [] }, '123456');
    expect(axios.get).toHaveBeenCalledWith(expect.stringMatching(/\/usuarios\/me$/), expect.anything());
  });

  it('código errado mostra a mensagem e não entra', async () => {
    signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/multi-factor-auth-required' });
    resolverDoErro.mockReturnValue({ hints: [] });
    concluirLogin.mockRejectedValue({ code: 'auth/invalid-verification-code' });

    render(<MemoryRouter><Login /></MemoryRouter>);
    await preencherLogin();
    await userEvent.type(await screen.findByLabelText('Código do app'), '000000');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Código incorreto');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('conta sem autenticador vai para o cadastro do 2FA sem chamar a API', async () => {
    signInWithEmailAndPassword.mockResolvedValue({ user: usuario });
    situacaoSegundoFator.mockResolvedValue('cadastrar');

    render(<MemoryRouter><Login /></MemoryRouter>);
    await preencherLogin();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/2fa'));
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('cadastro manda só o nome para a API e segue para o 2FA', async () => {
    createUserWithEmailAndPassword.mockResolvedValue({ user: usuario });
    axios.post.mockResolvedValue({ data: {} });

    render(<MemoryRouter><Login /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /Cadastre-se/ }));
    await userEvent.type(screen.getByPlaceholderText('Seu nome'), 'Ana');
    await userEvent.type(screen.getByPlaceholderText('seuemail@exemplo.com'), 'ana@test.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'senha-forte');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/2fa'));
    expect(axios.post).toHaveBeenCalledWith(expect.stringMatching(/\/usuarios$/), { nome: 'Ana' }, expect.anything());
  });

  it('mostra o aviso vindo do cadastro do autenticador', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { aviso: 'Autenticador cadastrado!' } }]}>
        <Login />
      </MemoryRouter>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Autenticador cadastrado!');
  });
});
