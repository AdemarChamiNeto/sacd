import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  LoadingSkeleton,
  LoadingSpinner,
  ErrorAlert,
  EmptyState,
  StateHandler,
} from '../components/UIStates';

describe('LoadingSkeleton', () => {
  it('deve renderizar 3 skeletons por padrão', () => {
    const { container } = render(<LoadingSkeleton />);
    const skeletons = container.querySelectorAll('.rounded-2xl');
    expect(skeletons.length).toBe(3);
  });

  it('deve renderizar o número correto de skeletons', () => {
    const { container } = render(<LoadingSkeleton count={5} />);
    const skeletons = container.querySelectorAll('.rounded-2xl');
    expect(skeletons.length).toBe(5);
  });
});

describe('LoadingSpinner', () => {
  it('deve renderizar texto de carregamento padrão', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('deve renderizar texto customizado', () => {
    render(<LoadingSpinner text="Buscando denúncias..." />);
    expect(screen.getByText('Buscando denúncias...')).toBeInTheDocument();
  });

  it('deve renderizar em modo fullScreen', () => {
    const { container } = render(<LoadingSpinner fullScreen />);
    expect(container.querySelector('.min-h-screen')).toBeInTheDocument();
  });
});

describe('ErrorAlert', () => {
  it('deve renderizar mensagem de erro string', () => {
    render(<ErrorAlert error="Erro de conexão" />);
    expect(screen.getByText('Erro de conexão')).toBeInTheDocument();
  });

  it('deve renderizar mensagem de erro objeto', () => {
    render(<ErrorAlert error={{ message: 'Falha na requisição' }} />);
    expect(screen.getByText('Falha na requisição')).toBeInTheDocument();
  });

  it('deve mostrar botão de retry quando onRetry é passado', () => {
    const mockRetry = vi.fn();
    render(<ErrorAlert error="Erro" onRetry={mockRetry} />);
    expect(screen.getByText('Tentar Novamente')).toBeInTheDocument();
  });

  it('não deve mostrar botão de retry sem onRetry', () => {
    render(<ErrorAlert error="Erro" />);
    expect(screen.queryByText('Tentar Novamente')).not.toBeInTheDocument();
  });

  it('deve renderizar título customizado', () => {
    render(<ErrorAlert error="Erro" title="Ops, algo deu errado!" />);
    expect(screen.getByText('Ops, algo deu errado!')).toBeInTheDocument();
  });

  it('deve chamar onRetry ao clicar no botão', () => {
    const mockRetry = vi.fn();
    render(<ErrorAlert error="Erro" onRetry={mockRetry} />);
    screen.getByText('Tentar Novamente').click();
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});

describe('EmptyState', () => {
  it('deve renderizar título e descrição padrão', () => {
    render(<EmptyState />);
    expect(screen.getByText('Nada aqui')).toBeInTheDocument();
    expect(screen.getByText('Não há dados para exibir')).toBeInTheDocument();
  });

  it('deve renderizar título e descrição customizados', () => {
    render(
      <EmptyState
        title="Nenhuma denúncia encontrada"
        description="Faça sua primeira denúncia agora!"
      />
    );
    expect(screen.getByText('Nenhuma denúncia encontrada')).toBeInTheDocument();
    expect(screen.getByText('Faça sua primeira denúncia agora!')).toBeInTheDocument();
  });

  it('deve renderizar botão de ação quando passado', () => {
    const mockAction = vi.fn();
    render(
      <EmptyState
        action={{ label: 'Nova Denúncia', onClick: mockAction }}
      />
    );
    const btn = screen.getByText('Nova Denúncia');
    expect(btn).toBeInTheDocument();
    btn.click();
    expect(mockAction).toHaveBeenCalled();
  });
});

describe('StateHandler', () => {
  it('deve renderizar loading component quando loading=true', () => {
    render(
      <StateHandler loading={true} error={null} data={[1, 2]}>
        <div>Conteúdo</div>
      </StateHandler>
    );
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo')).not.toBeInTheDocument();
  });

  it('deve renderizar erro quando error está presente', () => {
    render(
      <StateHandler loading={false} error="Falhou" data={null}>
        <div>Conteúdo</div>
      </StateHandler>
    );
    expect(screen.getByText('Falhou')).toBeInTheDocument();
  });

  it('deve renderizar estado vazio quando data é array vazio', () => {
    render(
      <StateHandler loading={false} error={null} data={[]}>
        <div>Conteúdo</div>
      </StateHandler>
    );
    expect(screen.getByText('Nada aqui')).toBeInTheDocument();
  });

  it('deve renderizar children quando há dados', () => {
    render(
      <StateHandler loading={false} error={null} data={[1, 2, 3]}>
        <div>Conteúdo Carregado</div>
      </StateHandler>
    );
    expect(screen.getByText('Conteúdo Carregado')).toBeInTheDocument();
  });
});
