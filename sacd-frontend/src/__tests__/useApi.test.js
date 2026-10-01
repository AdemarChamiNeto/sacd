import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

vi.mock('../context/AuthContext');
vi.mock('axios');

const mockUser = {
  getIdToken: vi.fn().mockResolvedValue('mock-firebase-token'),
};

describe('useApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ currentUser: mockUser });
  });

  it('deve iniciar com estado padrão', () => {
    const { result } = renderHook(() => useApi());

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('deve fazer GET com sucesso', async () => {
    const mockData = [{ id: 1, descricao: 'Teste' }];
    axios.mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useApi());

    await act(async () => {
      await result.current.get('/denuncias');
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('deve fazer POST com payload', async () => {
    const mockResponse = { id: 1, descricao: 'Nova denúncia' };
    axios.mockResolvedValue({ data: mockResponse });

    const { result } = renderHook(() => useApi());

    const payload = { descricao: 'Nova denúncia', latitude: -25.4, longitude: -49.2 };

    await act(async () => {
      await result.current.post('/denuncias', payload);
    });

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        data: payload,
      })
    );
    expect(result.current.data).toEqual(mockResponse);
  });

  it('deve fazer PUT corretamente', async () => {
    axios.mockResolvedValue({ data: { status: 'resolvida' } });

    const { result } = renderHook(() => useApi());

    await act(async () => {
      await result.current.put('/denuncias/1', { status: 'resolvida' });
    });

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('deve fazer DELETE corretamente', async () => {
    axios.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useApi());

    await act(async () => {
      await result.current.delete('/denuncias/1');
    });

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('deve tratar erro 401 sem retry', async () => {
    axios.mockRejectedValue({ response: { status: 401, statusText: 'Unauthorized' } });

    const { result } = renderHook(() => useApi());

    await act(async () => {
      try {
        await result.current.get('/denuncias');
      } catch {
        /* erro esperado */
      }
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.loading).toBe(false);
    expect(axios).toHaveBeenCalledTimes(1);
  });

  it('deve tratar erro 403 sem retry', async () => {
    axios.mockRejectedValue({ response: { status: 403 } });

    const { result } = renderHook(() => useApi());

    await act(async () => {
      try {
        await result.current.get('/denuncias');
      } catch {
        /* erro esperado */
      }
    });

    expect(axios).toHaveBeenCalledTimes(1);
  });

  it('deve mostrar loading durante requisição', async () => {
    let resolveRequest;
    axios.mockReturnValue(new Promise((res) => { resolveRequest = res; }));

    const { result } = renderHook(() => useApi());

    act(() => {
      result.current.get('/denuncias');
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveRequest({ data: [] });
    });

    expect(result.current.loading).toBe(false);
  });

  it('deve resetar estado corretamente', async () => {
    axios.mockResolvedValue({ data: [{ id: 1 }] });

    const { result } = renderHook(() => useApi());

    await act(async () => {
      await result.current.get('/denuncias');
    });

    expect(result.current.data).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('deve lançar erro se currentUser for null', async () => {
    useAuth.mockReturnValue({ currentUser: null });

    const { result } = renderHook(() => useApi());

    await act(async () => {
      try {
        await result.current.get('/denuncias');
      } catch (err) {
        expect(err.message).toBe('Usuário não autenticado');
      }
    });
  });

  it('deve incluir token de autorização no header', async () => {
    axios.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useApi());

    await act(async () => {
      await result.current.get('/denuncias');
    });

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-firebase-token',
        }),
      })
    );
  });
});
