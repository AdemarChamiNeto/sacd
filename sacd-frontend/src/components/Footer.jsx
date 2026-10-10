import React from 'react';
import { Shield, Mail, Github } from 'lucide-react';
import { abrirPreferenciasDeCookies } from '../services/cookies';

// Contato público vem de variável de ambiente (nada de telefone/e-mail inventado em produção)
const EMAIL_CONTATO = import.meta.env.VITE_CONTATO_EMAIL || '';

function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 rounded-t-[3rem]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-6">
              <div className="bg-primary-600 p-2 rounded-xl">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">SACD</h2>
            </div>
            <p className="text-slate-400 text-lg leading-relaxed max-w-md mb-8">
              Sistema de Apoio ao Controle da Dengue. Unindo tecnologia e participação cidadã para proteger nossa comunidade contra focos de infestação.
            </p>
            <a href="https://github.com/AdemarChamiNeto/sacd" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-slate-800 px-4 py-3 rounded-xl hover:bg-primary-600 hover:text-white transition-all">
              <Github className="h-5 w-5" /> Código no GitHub
            </a>
          </div>

          <div>
            <h3 className="text-white font-bold text-lg mb-6">Links Rápidos</h3>
            <ul className="space-y-4 font-medium">
              <li><a href="/" className="hover:text-primary-400 transition-colors">Início</a></li>
              <li><a href="/denuncia" className="hover:text-primary-400 transition-colors">Fazer Denúncia</a></li>
              <li><a href="/mapa" className="hover:text-primary-400 transition-colors">Mapa de Focos</a></li>
              <li><a href="/estatisticas" className="hover:text-primary-400 transition-colors">Estatísticas</a></li>
            </ul>
          </div>

          {EMAIL_CONTATO && (
            <div>
              <h3 className="text-white font-bold text-lg mb-6">Contato</h3>
              <ul className="space-y-4 font-medium">
                <li className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-primary-500" />
                  <a href={`mailto:${EMAIL_CONTATO}`} className="hover:text-primary-400">{EMAIL_CONTATO}</a>
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
          <p>&copy; {new Date().getFullYear()} SACD · Projeto de TCC em Engenharia de Software</p>
          <div className="flex space-x-6">
            <a href="/privacidade" className="hover:text-white transition-colors">Privacidade</a>
            <button type="button" onClick={abrirPreferenciasDeCookies} className="uppercase tracking-widest hover:text-white transition-colors">
              Cookies
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
