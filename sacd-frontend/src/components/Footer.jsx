import React from 'react';
import { Shield, Facebook, Twitter, Instagram, Mail, Phone } from 'lucide-react';

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
            <div className="flex space-x-4">
              <button className="bg-slate-800 p-3 rounded-xl hover:bg-primary-600 hover:text-white transition-all">
                <Facebook className="h-5 w-5" />
              </button>
              <button className="bg-slate-800 p-3 rounded-xl hover:bg-primary-600 hover:text-white transition-all">
                <Twitter className="h-5 w-5" />
              </button>
              <button className="bg-slate-800 p-3 rounded-xl hover:bg-primary-600 hover:text-white transition-all">
                <Instagram className="h-5 w-5" />
              </button>
            </div>
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

          <div>
            <h3 className="text-white font-bold text-lg mb-6">Contato</h3>
            <ul className="space-y-4 font-medium">
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-primary-500" />
                <span>0800 123 4567</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-primary-500" />
                <span>contato@sacd.gov.br</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
          <p>&copy; {new Date().getFullYear()} SACD - Governo Municipal. Todos os direitos reservados.</p>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
