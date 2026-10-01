import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  AlertTriangle,
  Map as MapIcon,
  Users,
  TrendingDown,
  ShieldCheck,
  ArrowRight,
  Camera,
  Search,
  CheckCircle2
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function formatNum(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.', ',') + 'k';
  return n.toLocaleString('pt-BR');
}

function Home() {
  const [publicStats, setPublicStats] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/stats/public`)
      .then(res => setPublicStats(res.data))
      .catch(() => {}); // retorna os numeros reais no home
  }, []);

  const stats = [
    {
      label: 'Denúncias Ativas',
      value: publicStats ? formatNum(publicStats.ativas) : '—',
      icon: AlertTriangle,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
    },
    {
      label: 'Total de Denúncias',
      value: publicStats ? formatNum(publicStats.total) : '—',
      icon: Search,
      color: 'text-rose-500',
      bg: 'bg-rose-50',
    },
    {
      label: 'Cidadãos Participantes',
      value: publicStats ? formatNum(publicStats.totalUsuarios) : '—',
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: 'Taxa de Resolução',
      value: publicStats ? `${publicStats.taxaResolucao}%` : '—',
      icon: TrendingDown,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex flex-col space-y-24 pb-24">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.primary.100),white)] opacity-40" />
        <div className="absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] bg-white shadow-xl shadow-primary-600/10 ring-1 ring-primary-50 sm:mr-28 lg:mr-0 xl:mr-16 xl:origin-center" />
        
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm font-bold mb-6"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Sistema Oficial de Combate à Dengue</span>
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight mb-6"
              >
                Juntos Contra a <span className="text-primary-600">Dengue</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
              >
                Identifique, monitore e elimine focos de dengue em sua comunidade. Nossa plataforma conecta você diretamente aos agentes de saúde para uma resposta rápida e eficiente.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4"
              >
                <Link to="/denuncia" className="inline-flex items-center justify-center space-x-2 bg-primary-600 text-white px-8 py-4 rounded-2xl text-lg font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 hover:shadow-primary-600/30 hover:-translate-y-0.5 active:translate-y-0">
                  <Camera className="h-5 w-5" />
                  <span>Fazer Denúncia</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link to="/mapa" className="inline-flex items-center justify-center space-x-2 bg-white text-slate-900 border-2 border-slate-200 px-8 py-4 rounded-2xl text-lg font-bold hover:bg-slate-50 hover:border-slate-300 transition-all hover:-translate-y-0.5 active:translate-y-0">
                  <MapIcon className="h-5 w-5" />
                  <span>Ver Mapa de Focos</span>
                </Link>
              </motion.div>
            </div>

            <div className="flex-1 relative">
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="relative z-10"
              >
                <div className="bg-white p-4 rounded-3xl shadow-2xl border border-slate-100 transform rotate-2">
                  <div className="bg-slate-100 aspect-video rounded-2xl flex items-center justify-center text-slate-400 overflow-hidden">
                     <div className="flex flex-col items-center">
                        <ShieldCheck className="h-20 w-20 text-primary-200 mb-2" />
                        <span className="font-bold text-primary-300">PROTEÇÃO ATIVA</span>
                     </div>
                  </div>
                </div>
                <div className="absolute -top-6 -right-6 h-24 w-24 bg-primary-400/20 rounded-full blur-2xl animate-pulse" />
                <div className="absolute -bottom-8 -left-8 h-32 w-32 bg-amber-400/20 rounded-full blur-2xl animate-pulse" />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className="bg-white p-8 rounded-3xl shadow-soft border border-slate-50 hover:border-primary-100 transition-all hover:shadow-xl group text-center"
            >
              <div className={`${stat.bg} ${stat.color} h-12 w-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform mx-auto`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <p className="text-4xl font-extrabold text-slate-900 mb-1">{stat.value}</p>
              <p className="text-slate-500 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="bg-slate-900 py-24 rounded-[3rem] mx-4 overflow-hidden relative">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 bg-primary-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 bg-blue-600/20 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">Como o SACD funciona?</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Tecnologia de ponta a serviço da saúde pública para um monitoramento em tempo real.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: 'Denúncia Geolocalizada',
                desc: 'Tire uma foto do possível foco e nossa plataforma captura automaticamente a localização exata.',
                icon: Camera
              },
              {
                title: 'Análise Inteligente',
                desc: 'Agentes de saúde recebem os dados e priorizam as áreas com maior risco de infestação.',
                icon: Search
              },
              {
                title: 'Acompanhamento',
                desc: 'Receba notificações sobre o status da sua denúncia e as ações tomadas em sua região.',
                icon: CheckCircle2
              }
            ].map((feature, idx) => (
              <div key={idx} className="flex flex-col items-center text-center">
                <div className="bg-primary-600/20 h-16 w-16 rounded-2xl flex items-center justify-center mb-6 border border-primary-500/30">
                  <feature.icon className="h-8 w-8 text-primary-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
