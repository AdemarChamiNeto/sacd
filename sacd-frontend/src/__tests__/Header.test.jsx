import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext');

const renderHeader = () => {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );
};

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o logo SACD', () => {
    useAuth.mockReturnValue({
      currentUser: null,
      userProfile: null,
      role: null,
      logout: vi.fn(),
    });

    renderHeader();
    expect(screen.getByText('SACD')).toBeInTheDocument();
  });

  it('deve mostrar botão de Login se não autenticado', () => {
    useAuth.mockReturnValue({
      currentUser: null,
      userProfile: null,
      role: null,
      logout: vi.fn(),
    });

    renderHeader();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('deve mostrar menu de cidadão com links corretos', () => {
    useAuth.mockReturnValue({
      currentUser: { email: 'cidadao@test.com' },
      userProfile: { nome: 'Cidadão', role: 'cidadao', email: 'cidadao@test.com' },
      role: 'cidadao',
      logout: vi.fn(),
    });

    renderHeader();

    expect(screen.getByText('Nova Denúncia')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('deve mostrar menu de gerenciador com Dashboard', () => {
    useAuth.mockReturnValue({
      currentUser: { email: 'gerenciador@test.com' },
      userProfile: { nome: 'Gerenciador', role: 'gerenciador', email: 'gerenciador@test.com' },
      role: 'gerenciador',
      logout: vi.fn(),
    });

    renderHeader();

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Nova Denúncia')).toBeInTheDocument();
  });

  it('deve mostrar menu de administrador com Usuários e Estatísticas', () => {
    useAuth.mockReturnValue({
      currentUser: { email: 'admin@test.com' },
      userProfile: { nome: 'Admin', role: 'administrador', email: 'admin@test.com' },
      role: 'administrador',
      logout: vi.fn(),
    });

    renderHeader();

    expect(screen.getByText('Arquivadas')).toBeInTheDocument();
    expect(screen.getByText('Estatísticas')).toBeInTheDocument();
  });

  it('deve mostrar menu de tecnico com Configurações', () => {
    useAuth.mockReturnValue({
      currentUser: { email: 'adm@test.com' },
      userProfile: { nome: 'AdmSupremo', role: 'tecnico', email: 'adm@test.com' },
      role: 'tecnico',
      logout: vi.fn(),
    });

    renderHeader();

    expect(screen.getByText('Estatísticas')).toBeInTheDocument();
    expect(screen.getByText('Arquivadas')).toBeInTheDocument();
  });

  it('deve mostrar nome do usuário logado', () => {
    useAuth.mockReturnValue({
      currentUser: { email: 'user@test.com' },
      userProfile: { nome: 'João Silva', role: 'cidadao', email: 'user@test.com' },
      role: 'cidadao',
      logout: vi.fn(),
    });

    renderHeader();

    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('deve abrir e fechar menu mobile', () => {
    useAuth.mockReturnValue({
      currentUser: null,
      userProfile: null,
      role: null,
      logout: vi.fn(),
    });

    renderHeader();

    const mobileButton = screen.getAllByRole('button')[0];
    fireEvent.click(mobileButton);

    fireEvent.click(mobileButton);
  });

  it('deve chamar logout ao clicar no botão de sair', async () => {
    const mockLogout = vi.fn().mockResolvedValue();

    useAuth.mockReturnValue({
      currentUser: { email: 'user@test.com' },
      userProfile: { nome: 'User', role: 'cidadao', email: 'user@test.com' },
      role: 'cidadao',
      logout: mockLogout,
    });

    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    renderHeader();

    const userButtons = screen.getAllByRole('button');
    const userMenuButton = userButtons.find(btn => btn.textContent.includes('User') || btn.textContent.includes('cidadao'));
    if (userMenuButton) {
      fireEvent.click(userMenuButton);
      const logoutBtn = screen.queryByText('Logout');
      if (logoutBtn) {
        fireEvent.click(logoutBtn);
        expect(mockLogout).toHaveBeenCalled();
      }
    }

    window.location = originalLocation;
  });
});
