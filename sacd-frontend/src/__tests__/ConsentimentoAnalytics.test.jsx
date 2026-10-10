import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

async function montar(ids) {
  vi.resetModules();
  vi.stubEnv('VITE_GA_ID', ids.ga ?? '');
  vi.stubEnv('VITE_CLARITY_ID', ids.clarity ?? '');
  const { default: Consentimento } = await import('../components/ConsentimentoAnalytics');
  const cookies = await import('../services/cookies');
  render(<Consentimento />);
  return cookies;
}

describe('Aviso de cookies (LGPD)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.head.querySelectorAll('script[src]').forEach((s) => s.remove());
  });
  afterEach(() => vi.unstubAllEnvs());

  it('sem IDs configurados não mostra nada', async () => {
    await montar({});
    expect(screen.queryByRole('region', { name: 'Cookies' })).not.toBeInTheDocument();
  });

  it('não carrega o Analytics antes do aceite e carrega depois', async () => {
    await montar({ ga: 'G-TESTE' });
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Aceitar' }));
    expect(document.querySelector('script[src*="googletagmanager"]')).not.toBeNull();
    expect(localStorage.getItem('sacd-consentimento-analytics')).toBe('aceito');
  });

  it('recusar guarda a escolha e não carrega nada', async () => {
    await montar({ clarity: 'abc123' });
    await userEvent.click(screen.getByRole('button', { name: 'Recusar' }));
    expect(screen.queryByRole('region', { name: 'Cookies' })).not.toBeInTheDocument();
    expect(document.querySelector('script[src*="clarity"]')).toBeNull();
    expect(localStorage.getItem('sacd-consentimento-analytics')).toBe('recusado');
  });

  it('o link do rodapé reabre o aviso', async () => {
    localStorage.setItem('sacd-consentimento-analytics', 'recusado');
    const cookies = await montar({ ga: 'G-TESTE' });
    expect(screen.queryByRole('region', { name: 'Cookies' })).not.toBeInTheDocument();
    act(() => cookies.abrirPreferenciasDeCookies());
    expect(screen.getByRole('region', { name: 'Cookies' })).toBeInTheDocument();
  });
});
