import React, { useEffect, useState } from 'react';
import { EVENTO_ABRIR_COOKIES as EVENTO_ABRIR } from '../services/cookies';

// Google Analytics 4 e Microsoft Clarity só carregam DEPOIS do "Aceitar" (LGPD).
// IDs por variável de ambiente no build: VITE_GA_ID e VITE_CLARITY_ID. Vazios = nada carrega e o aviso nem aparece.
const GA_ID = import.meta.env.VITE_GA_ID || '';
const CLARITY_ID = import.meta.env.VITE_CLARITY_ID || '';
const CHAVE = 'sacd-consentimento-analytics';

const ler = () => { try { return localStorage.getItem(CHAVE); } catch { return null; } };
const gravar = (v) => { try { localStorage.setItem(CHAVE, v); } catch { /* modo privado */ } };

let carregado = false;
function carregar() {
  if (carregado) return;
  carregado = true;
  if (GA_ID) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
  }
  if (CLARITY_ID) {
    window.clarity = window.clarity || function clarity() { (window.clarity.q = window.clarity.q || []).push(arguments); };
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.clarity.ms/tag/${encodeURIComponent(CLARITY_ID)}`;
    document.head.appendChild(s);
    window.clarity('consent');
  }
}

export default function ConsentimentoAnalytics() {
  const ativo = Boolean(GA_ID || CLARITY_ID);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (!ativo) return undefined;
    const escolha = ler();
    if (escolha === 'aceito') carregar();
    else if (escolha !== 'recusado') setVisivel(true);
    const abrir = () => setVisivel(true);
    window.addEventListener(EVENTO_ABRIR, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR, abrir);
  }, [ativo]);

  if (!ativo || !visivel) return null;

  const decidir = (valor) => {
    const antes = ler();
    gravar(valor);
    setVisivel(false);
    if (valor === 'aceito') carregar();
    else if (antes === 'aceito') window.location.reload(); // descarrega scripts já ativos
  };

  return (
    <div role="region" aria-label="Cookies"
      className="fixed z-[2000] inset-x-4 bottom-4 mx-auto max-w-3xl bg-white text-slate-800 border border-slate-200 rounded-3xl shadow-xl p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
      <p className="text-sm flex-1">
        Usamos cookies de análise (Google Analytics e Microsoft Clarity) para entender como o site é usado.
        Nada é coletado sem a sua permissão. <a href="/privacidade" className="text-primary-700 underline">Saiba mais</a>
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={() => decidir('recusado')}
          className="px-4 py-2 rounded-2xl border border-slate-300 font-semibold hover:bg-slate-50">Recusar</button>
        <button type="button" onClick={() => decidir('aceito')}
          className="px-4 py-2 rounded-2xl bg-primary-600 text-white font-semibold hover:bg-primary-700">Aceitar</button>
      </div>
    </div>
  );
}
