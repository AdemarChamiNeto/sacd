import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
  };
});

const ChildComponent = () => <div data-testid="child">Conteúdo Protegido</div>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve mostrar loading enquanto carrega', () => {
    useAuth.mockReturnValue({
      currentUser: null,
      userProfile: null,
      loading: true,
      isAuthenticated: false,
      hasPermission: vi.fn().mockReturnValue(false),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="cidadao">
          <ChildComponent />
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('deve redirecionar para login se não autenticado', () => {
    useAuth.mockReturnValue({
      currentUser: null,
      userProfile: null,
      loading: false,
      isAuthenticated: false,
      hasPermission: vi.fn().mockReturnValue(false),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="cidadao">
          <ChildComponent />
        </ProtectedRoute>
      </MemoryRouter>
    );

    const navigate = screen.getByTestId('navigate');
    expect(navigate).toHaveAttribute('data-to', '/login');
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('deve renderizar filho se autenticado e com permissão', () => {
    useAuth.mockReturnValue({
      currentUser: { email: 'user@test.com' },
      userProfile: { role: 'cidadao' },
      loading: false,
      isAuthenticated: true,
      hasPermission: vi.fn().mockReturnValue(true),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="cidadao">
          <ChildComponent />
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('deve mostrar "Acesso Negado" se não tem permissão suficiente', () => {
    useAuth.mockReturnValue({
      currentUser: { email: 'cidadao@test.com' },
      userProfile: { role: 'cidadao' },
      loading: false,
      isAuthenticated: true,
      hasPermission: vi.fn().mockReturnValue(false),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="gerenciador">
          <ChildComponent />
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Acesso Negado')).toBeInTheDocument();
    expect(screen.getByText(/gerenciador/i)).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('deve mostrar o role atual do usuário na tela de acesso negado', () => {
    useAuth.mockReturnValue({
      currentUser: { email: 'cidadao@test.com' },
      userProfile: { role: 'cidadao' },
      loading: false,
      isAuthenticated: true,
      hasPermission: vi.fn().mockReturnValue(false),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="administrador">
          <ChildComponent />
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('cidadao')).toBeInTheDocument();
    expect(screen.getByText('administrador')).toBeInTheDocument();
  });

  it('deve renderizar gerenciador em rota de gerenciador', () => {
    useAuth.mockReturnValue({
      currentUser: { email: 'gerenciador@test.com' },
      userProfile: { role: 'gerenciador' },
      loading: false,
      isAuthenticated: true,
      hasPermission: vi.fn().mockReturnValue(true),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="gerenciador">
          <ChildComponent />
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
