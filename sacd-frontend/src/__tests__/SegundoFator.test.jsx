import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SegundoFator from '../pages/SegundoFator';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext');
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,QR') } }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn(), sendEmailVerification: vi.fn() }));
const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate, Navigate: ({ to }) => <div data-testid="navigate" data-to={to} /> };
});
vi.mock('../services/segundoFator', async () => {
  const actual = await vi.importActual('../services/segundoFator');
  return {
    ...actual,
    iniciarCadastro: vi.fn().mockResolvedValue({ segredo: { s: 1 }, chave: 'ABCDEFGHIJKLMNOP', url: 'otpauth://x' }),
    concluirCadastro: vi.fn(),
  };
});
import { concluirCadastro } from '../services/segundoFator';
import { signOut } from 'firebase/auth';

const renderizar = () => render(<MemoryRouter><SegundoFator /></MemoryRouter>);

describe('Página de cadastro do 2FA', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra o QR code e a chave em grupos de 4', async () => {
    useAuth.mockReturnValue({ currentUser: { email: 'a@a.com', emailVerified: true }, segundoFator: 'cadastrar', loading: false });
    renderizar();
    expect(await screen.findByAltText(/QR code/)).toHaveAttribute('src', 'data:image/png;base64,QR');
    expect(screen.getByTestId('chave-totp').textContent).toBe('ABCD EFGH IJKL MNOP');
  });

  it('não aceita código com menos de 6 números', async () => {
    useAuth.mockReturnValue({ currentUser: { email: 'a@a.com', emailVerified: true }, segundoFator: 'cadastrar', loading: false });
    renderizar();
    await userEvent.type(await screen.findByLabelText('Código do app'), '123');
    await userEvent.click(screen.getByRole('button', { name: /Ativar/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('6 números');
    expect(concluirCadastro).not.toHaveBeenCalled();
  });

  it('com código certo cadastra, sai e manda para o login', async () => {
    useAuth.mockReturnValue({ currentUser: { email: 'a@a.com', emailVerified: true }, segundoFator: 'cadastrar', loading: false });
    renderizar();
    await userEvent.type(await screen.findByLabelText('Código do app'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /Ativar/ }));
    await waitFor(() => expect(concluirCadastro).toHaveBeenCalledWith(expect.anything(), { s: 1 }, '123456'));
    expect(signOut).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/login', expect.objectContaining({ state: expect.objectContaining({ aviso: expect.stringMatching(/cadastrado/) }) }));
  });

  it('pede para confirmar o e-mail antes', () => {
    useAuth.mockReturnValue({ currentUser: { email: 'a@a.com', emailVerified: false }, segundoFator: 'cadastrar', loading: false });
    renderizar();
    expect(screen.getByText(/confirme seu e-mail/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Código do app')).not.toBeInTheDocument();
  });

  it('quem já está com 2FA vai para a home', () => {
    useAuth.mockReturnValue({ currentUser: { email: 'a@a.com', emailVerified: true }, segundoFator: 'ok', loading: false });
    renderizar();
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
  });
});
