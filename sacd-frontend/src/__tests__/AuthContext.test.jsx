import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import axios from 'axios';

// Mocks
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('axios');

// Componente auxiliar para testar o contexto
const TestComponent = () => {
  const { currentUser, loading, role, isAuthenticated, hasPermission } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{currentUser?.email || 'null'}</span>
      <span data-testid="role">{role || 'null'}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="has-gerenciador">{String(hasPermission('gerenciador'))}</span>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve iniciar com loading true', () => {
    onAuthStateChanged.mockImplementation(() => () => {});

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  it('deve definir loading false quando não há usuário', async () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return () => {};
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('deve buscar perfil do usuário ao autenticar', async () => {
    const mockUser = {
      email: 'test@example.com',
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    };

    const mockProfile = {
      nome: 'Test User',
      email: 'test@example.com',
      role: 'cidadao',
    };

    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return () => {};
    });

    axios.get.mockResolvedValue({ data: mockProfile });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('user').textContent).toBe('test@example.com');
    expect(screen.getByTestId('role').textContent).toBe('cidadao');
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
  });

  it('deve lidar com erro ao buscar perfil', async () => {
    const mockUser = {
      email: 'test@example.com',
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    };

    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return () => {};
    });

    axios.get.mockRejectedValue({ response: { status: 404 } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('role').textContent).toBe('null');
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('deve verificar hierarquia de permissões corretamente', async () => {
    const mockUser = {
      email: 'gerenciador@example.com',
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    };

    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return () => {};
    });

    axios.get.mockResolvedValue({
      data: { nome: 'Gerenciador', email: 'gerenciador@example.com', role: 'gerenciador' },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('role').textContent).toBe('gerenciador');
    });

    expect(screen.getByTestId('has-gerenciador').textContent).toBe('true');
  });

  it('deve fazer logout corretamente', async () => {
    const mockUser = {
      email: 'test@example.com',
      getIdToken: vi.fn().mockResolvedValue('token'),
    };

    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return () => {};
    });

    axios.get.mockResolvedValue({ data: { nome: 'Test', role: 'cidadao' } });
    signOut.mockResolvedValue();

    const LogoutComponent = () => {
      const { logout, isAuthenticated } = useAuth();
      return (
        <div>
          <span data-testid="authenticated">{String(isAuthenticated)}</span>
          <button onClick={logout}>Logout</button>
        </div>
      );
    };

    const { getByText } = render(
      <AuthProvider>
        <LogoutComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    await act(async () => {
      getByText('Logout').click();
    });

    expect(signOut).toHaveBeenCalled();
  });

  it('deve lançar erro se useAuth for usado fora do AuthProvider', () => {
    const ErrorComponent = () => {
      useAuth();
      return null;
    };

    expect(() => render(<ErrorComponent />)).toThrow(
      'useAuth deve ser usado dentro de um AuthProvider'
    );
  });
});
