import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  AlertTriangle,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Corrigir ícones do Leaflet (bug comum)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function Mapa() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const heatLayerRef = useRef(null);
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();

  const [denuncias, setDenuncias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDenuncia, setSelectedDenuncia] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todas');
  const [, setUserLocation] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [raioAtivo, setRaioAtivo] = useState(false);
  const [raioMetros, setRaioMetros] = useState(500);
  const [denunciasRaio, setDenunciasRaio] = useState(null);

  // Verificar se é gerenciador/fiscal ou cidadão
  const isGerenciador = role && ['gerenciador', 'administrador', 'tecnico'].includes(role);
  const isCidadao = role === 'cidadao';

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current) return;

    const defaultLatLng = [-23.5505, -46.6333]; // São Paulo
    const map = L.map(mapRef.current).setView(defaultLatLng, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Tentar obter localização do usuário
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          setUserLocation({ lat: userLat, lng: userLng });

          // Adicionar marcador do usuário
          L.circleMarker([userLat, userLng], {
            radius: 8,
            fillColor: '#3b82f6',
            color: '#1e3a8a',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          })
            .addTo(map)
            .bindPopup('<p className="font-bold">Você está aqui</p>');

          map.setView([userLat, userLng], 14);
        },
        (err) => console.warn('Não foi possível obter localização:', err)
      );
    }

    return () => {
      map.remove();
    };
  }, []);

  // Buscar denúncias da API
  const fetchDenuncias = async () => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      const token = await currentUser.getIdToken();

      // Cidadão vê suas próprias denúncias
      // Gerenciador+ vê todas
      const endpoint = isCidadao ? '/denuncias/minhas' : '/denuncias';

      const response = await axios.get(`${API_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      setDenuncias(response.data || []);
    } catch (err) {
      console.error('Erro ao buscar denúncias:', err);

      if (err.response?.status === 401) {
        setError('Sua sessão expirou. Faça login novamente.');
      } else if (err.response?.status === 403) {
        setError('Você não tem permissão para acessar as denúncias.');
      } else {
        setError('Erro ao carregar denúncias. Tente novamente.');
      }

      setDenuncias([]);
    } finally {
      setLoading(false);
    }
  };

  // Busca por raio usando PostGIS (Fiscal e superiores)
  const buscarPorRaio = async () => {
    if (!currentUser || !mapInstanceRef.current) return;
    const centro = mapInstanceRef.current.getCenter();
    try {
      const token = await currentUser.getIdToken();
      const response = await axios.get(`${API_URL}/stats/denuncias-por-raio`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { lat: centro.lat, lng: centro.lng, metros: raioMetros },
      });
      setDenunciasRaio(response.data);
      setRaioAtivo(true);
    } catch (err) {
      console.error('Erro ao buscar por raio:', err);
    }
  };

  const limparRaio = () => {
    setDenunciasRaio(null);
    setRaioAtivo(false);
  };

  // Atualizar marcadores no mapa
  useEffect(() => {
    if (!mapInstanceRef.current || !denuncias.length) return;

    // Limpar marcadores antigos
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Filtrar denúncias por status
    const denunciasFiltradas =
      filtroStatus === 'todas'
        ? denuncias
        : denuncias.filter((d) => d.status === filtroStatus);

    if (!denunciasFiltradas.length) return;

    // Cores para diferentes status
    const statusColors = {
      aberta: '#ef4444',
      em_inspecao: '#f59e0b',
      resolvida: '#10b981',
    };

    // Adicionar novos marcadores
    denunciasFiltradas.forEach((denuncia) => {
      const color = statusColors[denuncia.status] || '#6b7280';

      const marker = L.circleMarker([denuncia.latitude, denuncia.longitude], {
        radius: 10,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      }).addTo(mapInstanceRef.current);

      // Popup ao clicar no marcador
      marker.bindPopup(
        `<div class="w-48">
          <h3 class="font-bold text-slate-900 mb-2">${denuncia.descricao}</h3>
          <p class="text-xs text-slate-600 mb-2">
            <span class="font-semibold">Status:</span>
            <span class="ml-1 px-2 py-1 rounded-full text-white text-xs" style="background-color: ${color}">
              ${denuncia.status.replace('_', ' ')}
            </span>
          </p>
          ${denuncia.bairro ? `<p class="text-xs text-slate-600 mb-2"><span class="font-semibold">Bairro:</span> ${denuncia.bairro}</p>` : ''}
          <p class="text-xs text-slate-500">
            ${new Date(denuncia.data).toLocaleDateString('pt-BR')}
          </p>
        </div>`
      );

      // Ao clicar no marcador, selecionar no painel
      marker.on('click', () => {
        setSelectedDenuncia(denuncia);
      });

      markersRef.current.push(marker);
    });

    // Ajustar zoom para mostrar todos os marcadores
    if (markersRef.current.length > 0) {
      const group = new L.featureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  }, [denuncias, filtroStatus]);

  // Carregar denúncias ao abrir o componente
  useEffect(() => {
    fetchDenuncias();
  }, [currentUser]);

  // Atualizar heatmap
  useEffect(() => {
    if (!mapInstanceRef.current || !denuncias.length) return;

    // Remove heatmap anterior
    if (heatLayerRef.current) {
      heatLayerRef.current.remove();
      heatLayerRef.current = null;
    }

    if (showHeatmap) {
      // Esconde marcadores
      markersRef.current.forEach((m) => m.setStyle({ opacity: 0, fillOpacity: 0 }));

      const points = denuncias
        .filter((d) => d.latitude && d.longitude)
        .map((d) => [d.latitude, d.longitude, 1]);

      heatLayerRef.current = L.heatLayer(points, {
        radius: 30,
        blur: 20,
        maxZoom: 17,
        gradient: { 0.2: '#3b82f6', 0.5: '#f59e0b', 0.8: '#ef4444' },
      }).addTo(mapInstanceRef.current);
    } else {
      // Mostra marcadores novamente
      markersRef.current.forEach((m) => m.setStyle({ opacity: 1, fillOpacity: 0.8 }));
    }
  }, [showHeatmap, denuncias]);

  // Ao selecionar no painel, centralizar no mapa e abrir popup
  const handleSelectFromPanel = (denuncia) => {
    setSelectedDenuncia(denuncia);

    // Centralizar no mapa
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([denuncia.latitude, denuncia.longitude], 15);
    }

    // Encontrar e abrir o marcador
    const marker = markersRef.current.find(
      (m) => m.getLatLng().lat === denuncia.latitude && m.getLatLng().lng === denuncia.longitude
    );
    if (marker) {
      marker.openPopup();
    }
  };

  // Redirecionar para detalhes da denúncia
  const handleViewDetails = (denuncia) => {
    navigate(`/denuncias/${denuncia.id}`);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <MapPin className="h-8 w-8 text-primary-600" />
              <h1 className="text-3xl font-bold text-slate-900">Mapa de Denúncias</h1>
            </div>
            <div className="flex items-center gap-3">
              {isGerenciador && (
                <button
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all border ${
                    showHeatmap
                      ? 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{showHeatmap ? 'Mapa de Calor' : 'Marcadores'}</span>
                </button>
              )}
              <button
                onClick={fetchDenuncias}
                disabled={loading}
                className="inline-flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-primary-700 transition-all disabled:opacity-60"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">Filtrar:</span>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg bg-white text-sm font-medium text-slate-700 focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="todas">Todas as denúncias</option>
              <option value="aberta">Abertas</option>
              <option value="em_inspecao">Em inspeção</option>
              <option value="resolvida">Resolvidas</option>
            </select>
            <span className="text-sm text-slate-600">
              Total: <span className="font-bold">{denuncias.length}</span>
            </span>

            {/* Busca por raio (PostGIS) — Fiscal e superiores */}
            {!isCidadao && (
              <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-200">
                <span className="text-sm font-semibold text-slate-700">Raio:</span>
                <select
                  value={raioMetros}
                  onChange={(e) => setRaioMetros(Number(e.target.value))}
                  className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm font-medium text-slate-700 outline-none"
                >
                  <option value={250}>250 m</option>
                  <option value={500}>500 m</option>
                  <option value={1000}>1 km</option>
                  <option value={2000}>2 km</option>
                  <option value={5000}>5 km</option>
                </select>
                <button
                  onClick={buscarPorRaio}
                  className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all"
                >
                  Buscar no centro
                </button>
                {raioAtivo && (
                  <button
                    onClick={limparRaio}
                    className="px-3 py-2 bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-300 transition-all"
                  >
                    Limpar ({denunciasRaio?.total ?? 0} encontradas)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mapa - sempre em tela cheia ou com painel */}
        <div className={`flex-1 relative ${isGerenciador ? 'basis-2/3' : 'basis-full'}`}>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-slate-100/50 backdrop-blur-sm flex items-center justify-center z-10"
            >
              <div className="bg-white px-6 py-4 rounded-xl shadow-lg flex items-center space-x-3">
                <Loader2 className="h-6 w-6 text-primary-600 animate-spin" />
                <span className="font-semibold text-slate-900">Carregando denúncias...</span>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-4 left-4 right-4 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start space-x-3 z-10 max-w-md"
            >
              <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm font-semibold text-rose-900">{error}</span>
            </motion.div>
          )}

          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* Painel Lateral - Apenas para Gerenciador+ */}
        {isGerenciador && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-1/3 bg-white border-l border-slate-200 overflow-y-auto flex flex-col"
          >
            {/* Header do Painel */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 sticky top-0 z-20">
              <h2 className="text-lg font-bold text-slate-900">Denúncias</h2>
              <p className="text-xs text-slate-600 mt-1">
                {denuncias.length} denúncia{denuncias.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Lista de Denúncias */}
            <div className="flex-1 overflow-y-auto">
              {denuncias.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                  <p className="font-medium">Nenhuma denúncia</p>
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {denuncias.map((denuncia) => (
                    <motion.div
                      key={denuncia.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => handleSelectFromPanel(denuncia)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedDenuncia?.id === denuncia.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Status Badge */}
                      <div className="flex items-start justify-between mb-2">
                        <span
                          className="px-2 py-1 rounded-full text-white text-xs font-semibold capitalize"
                          style={{
                            backgroundColor:
                              denuncia.status === 'aberta'
                                ? '#ef4444'
                                : denuncia.status === 'em_inspecao'
                                  ? '#f59e0b'
                                  : '#10b981',
                          }}
                        >
                          {denuncia.status.replace('_', ' ')}
                        </span>
                        {selectedDenuncia?.id === denuncia.id && (
                          <ChevronRight className="h-5 w-5 text-primary-600" />
                        )}
                      </div>

                      {/* Descrição */}
                      <p className="text-sm font-medium text-slate-900 line-clamp-2 mb-2">
                        {denuncia.descricao}
                      </p>

                      {/* Bairro */}
                      {denuncia.bairro && (
                        <p className="text-xs text-slate-600 mb-2">
                          📍 {denuncia.bairro}
                        </p>
                      )}

                      {/* Data */}
                      <p className="text-xs text-slate-500 mb-3">
                        {new Date(denuncia.data).toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>

                      {/* Botão Ver Detalhes */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(denuncia);
                        }}
                        className="w-full py-2 text-xs font-semibold text-primary-600 hover:text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition-all"
                      >
                        Ver Detalhes →
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default Mapa;
