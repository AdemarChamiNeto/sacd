import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Denuncia from '../pages/Denuncia';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

vi.mock('../context/AuthContext');
vi.mock('axios');

const mockUser = {
  email: 'cidadao@test.com',
  getIdToken: vi.fn().mockResolvedValue('mock-token'),
};

describe('Denuncia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ currentUser: mockUser });

    Object.defineProperty(global.navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn((success) =>
          success({ coords: { latitude: -25.4284, longitude: -49.2733 } })
        ),
      },
      writable: true,
    });
  });

  it('deve renderizar o formulário corretamente', () => {
    render(<Denuncia />);

    expect(screen.getByText('Nova Denúncia')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Descreva o local/i)).toBeInTheDocument();
    expect(screen.getByText('Detectar Minha Localização')).toBeInTheDocument();
    expect(screen.getByText('Enviar Denúncia Agora')).toBeInTheDocument();
  });

  it('deve exibir erro se tentar enviar sem descrição', async () => {
    render(<Denuncia />);

    const submitButton = screen.getByText('Enviar Denúncia Agora');
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(screen.getByText('Por favor, descreva o foco de dengue.')).toBeInTheDocument();
  });

  it('deve exibir erro se tentar enviar sem localização', async () => {
    render(<Denuncia />);

    const textarea = screen.getByPlaceholderText(/Descreva o local/i);
    await userEvent.type(textarea, 'Pneu com água parada no quintal');

    const submitButton = screen.getByText('Enviar Denúncia Agora');
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(
      screen.getByText('Por favor, obtenha sua localização antes de enviar a denúncia.')
    ).toBeInTheDocument();
  });

  it('deve capturar localização ao clicar no botão', async () => {
    render(<Denuncia />);

    const locationButton = screen.getByText('Detectar Minha Localização');
    await act(async () => {
      fireEvent.click(locationButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Localização Capturada')).toBeInTheDocument();
    });
  });

  it('deve enviar denúncia com sucesso', async () => {
    axios.post.mockResolvedValueOnce({ data: { id: 123 } });

    render(<Denuncia />);

    await userEvent.type(
      screen.getByPlaceholderText(/Descreva o local/i),
      'Caixa d água destampada'
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Detectar Minha Localização'));
    });

    await waitFor(() => {
      expect(screen.getByText('Localização Capturada')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Enviar Denúncia Agora'));
    });

    await waitFor(() => {
      expect(screen.getByText('Denúncia Enviada!')).toBeInTheDocument();
      expect(screen.getByText(/123/)).toBeInTheDocument();
    });
  });

  it('deve exibir erro 401 ao enviar denúncia', async () => {
    axios.post.mockRejectedValueOnce({ response: { status: 401 } });

    render(<Denuncia />);

    await userEvent.type(
      screen.getByPlaceholderText(/Descreva o local/i),
      'Foco de dengue'
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Detectar Minha Localização'));
    });

    await waitFor(() => {
      expect(screen.getByText('Localização Capturada')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Enviar Denúncia Agora'));
    });

    await waitFor(() => {
      expect(
        screen.getByText('Sua sessão expirou. Por favor, faça login novamente.')
      ).toBeInTheDocument();
    });
  });

  it('deve validar tamanho máximo da imagem', async () => {
    render(<Denuncia />);

    const fileInput = screen.getByLabelText(/Clique para tirar ou anexar uma foto/i);
    const bigFile = new File(['x'.repeat(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(bigFile, 'size', { value: 6 * 1024 * 1024 });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [bigFile] } });
    });

    expect(screen.getByText('Arquivo muito grande. Máximo 5MB.')).toBeInTheDocument();
  });

  it('deve permitir fazer nova denúncia após sucesso', async () => {
    axios.post.mockResolvedValueOnce({ data: { id: 456 } });

    render(<Denuncia />);

    await userEvent.type(
      screen.getByPlaceholderText(/Descreva o local/i),
      'Piscina abandonada'
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Detectar Minha Localização'));
    });

    await waitFor(() => screen.getByText('Localização Capturada'));

    await act(async () => {
      fireEvent.click(screen.getByText('Enviar Denúncia Agora'));
    });

    await waitFor(() => screen.getByText('Denúncia Enviada!'));

    await act(async () => {
      fireEvent.click(screen.getByText('Fazer Outra Denúncia'));
    });

    expect(screen.getByText('Nova Denúncia')).toBeInTheDocument();
  });
});
