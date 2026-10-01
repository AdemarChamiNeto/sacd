import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  Camera, 
  MapPin, 
  AlertTriangle, 
  Upload, 
  CheckCircle2, 
  Loader2,
  X,
  Send,
  Info
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function Denuncia() {
  const { currentUser } = useAuth();
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [bairro, setBairro] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [denunciaId, setDenunciaId] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
  }, [currentUser]);

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validação de tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Arquivo muito grande. Máximo 5MB.');
        return;
      }
      
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const getLocation = () => {
    setLoadingLocation(true);
    setError('');
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLoadingLocation(false);
        },
        (err) => {
          console.error('Erro de geolocalização:', err);
          setError('Não foi possível obter a localização. Verifique as permissões do navegador.');
          setLoadingLocation(false);
        }
      );
    } else {
      setError('Geolocalização não é suportada por este navegador.');
      setLoadingLocation(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações
    if (!description.trim()) {
      setError('Por favor, descreva o foco de dengue.');
      return;
    }
    
    if (!location) {
      setError('Por favor, obtenha sua localização antes de enviar a denúncia.');
      return;
    }

    if (!currentUser) {
      setError('Você precisa estar autenticado.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Obter token do Firebase
      const token = await currentUser.getIdToken();

      // Criar denúncia no backend
      const denunciaPayload = {
        descricao: description.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        bairro: bairro.trim() || 'Não especificado',
        status: 'aberta'
      };

      const denunciaResponse = await axios.post(
        `${API_URL}/denuncias`,
        denunciaPayload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const novaDenuncia = denunciaResponse.data;
      setDenunciaId(novaDenuncia.id);

      // Upload de foto
      if (image) {
        try {
          const formData = new FormData();
          formData.append('file', image);
          formData.append('idDenuncia', novaDenuncia.id);

          await axios.post(
            `${API_URL}/denuncias/${novaDenuncia.id}/fotos`,
            formData,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              }
            }
          );
        } catch (fotoError) {
          console.warn('Aviso: Foto não foi salva, mas denúncia foi criada.', fotoError);
        }
      }

      // Sucesso!
      setIsSubmitted(true);
      setDescription('');
      setImage(null);
      setImagePreview(null);
      setLocation(null);
      setBairro('');
      
    } catch (err) {
      console.error('Erro ao enviar denúncia:', err);
      
      if (err.response?.status === 401) {
        setError('Sua sessão expirou. Por favor, faça login novamente.');
      } else if (err.response?.status === 403) {
        setError('Você não tem permissão para criar denúncias.');
      } else if (err.response?.data?.message) {
        setError(`Erro: ${err.response.data.message}`);
      } else {
        setError('Erro ao enviar denúncia. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl mx-auto mt-12 p-12 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 text-center"
      >
        <div className="bg-emerald-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Denúncia Enviada!</h2>
        <p className="text-slate-600 text-lg mb-2 leading-relaxed">
          Obrigado por colaborar. Sua denúncia foi registrada com sucesso.
        </p>
        {denunciaId && (
          <p className="text-slate-500 text-sm mb-8">
            ID da denúncia: <span className="font-mono font-bold">{denunciaId}</span>
          </p>
        )}
        <p className="text-slate-600 text-lg mb-8 leading-relaxed">
          Os agentes de saúde foram notificados e irão verificar o foco.
        </p>
        <button 
          onClick={() => setIsSubmitted(false)}
          className="bg-primary-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-primary-700 transition-all"
        >
          Fazer Outra Denúncia
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-10 text-center">
        <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">Nova Denúncia</h2>
        <p className="text-slate-500 font-medium">Relate um foco de dengue para que possamos agir rapidamente.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-soft border border-slate-100"
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          <div className="space-y-3">
            <label htmlFor="description" className="flex items-center space-x-2 text-sm font-bold text-slate-700 ml-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>O que você encontrou?</span>
            </label>
            <textarea
              id="description"
              rows="4"
              className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium text-slate-900 placeholder:text-slate-400"
              placeholder="Descreva o local e o tipo de foco (ex: pneu com água, caixa d'água destampada, piscina abandonada...)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              required
            ></textarea>
          </div>

          <div className="space-y-3">
            <label htmlFor="bairro" className="flex items-center space-x-2 text-sm font-bold text-slate-700 ml-1">
              <MapPin className="h-4 w-4 text-blue-500" />
              <span>Bairro (Opcional)</span>
            </label>
            <input
              id="bairro"
              type="text"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium text-slate-900 placeholder:text-slate-400"
              placeholder="Ex: Centro, Vila Nova, etc..."
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center space-x-2 text-sm font-bold text-slate-700 ml-1">
              <Camera className="h-4 w-4 text-primary-500" />
              <span>Evidência Visual (Opcional)</span>
            </label>
            
            {!imagePreview ? (
              <div className="relative group">
                <input
                  type="file"
                  id="image"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={loading}
                />
                <label 
                  htmlFor="image"
                  className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 hover:bg-slate-100 hover:border-primary-300 transition-all cursor-pointer group"
                >
                  <div className="bg-white p-3 rounded-2xl shadow-sm group-hover:scale-110 transition-transform mb-3">
                    <Upload className="h-6 w-6 text-slate-400 group-hover:text-primary-500" />
                  </div>
                  <span className="text-sm font-bold text-slate-500 group-hover:text-slate-700">Clique para tirar ou anexar uma foto</span>
                  <span className="text-xs text-slate-400 mt-1">PNG, JPG ou WEBP (Max. 5MB)</span>
                </label>
              </div>
            ) : (
              <div className="relative rounded-3xl overflow-hidden border border-slate-200 aspect-video">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={removeImage}
                  disabled={loading}
                  className="absolute top-4 right-4 bg-slate-900/50 backdrop-blur-md text-white p-2 rounded-xl hover:bg-rose-500 transition-colors disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="flex items-center space-x-2 text-sm font-bold text-slate-700 ml-1">
              <MapPin className="h-4 w-4 text-rose-500" />
              <span>Localização do Foco</span>
            </label>
            
            <div className={`p-6 rounded-3xl border transition-all ${location ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
              {!location ? (
                <div className="flex flex-col items-center text-center">
                  <p className="text-sm text-slate-500 mb-4 font-medium">Precisamos da localização exata para que os agentes possam encontrar o foco.</p>
                  <button
                    type="button"
                    onClick={getLocation}
                    disabled={loadingLocation || loading}
                    className="inline-flex items-center space-x-2 bg-white border border-slate-200 px-6 py-3 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {loadingLocation ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
                    ) : (
                      <MapPin className="h-5 w-5 text-primary-500" />
                    )}
                    <span>{loadingLocation ? 'Obtendo Localização...' : 'Detectar Minha Localização'}</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-emerald-500 p-2 rounded-xl">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-900">Localização Capturada</p>
                      <p className="text-xs text-emerald-700 font-medium">Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setLocation(null)}
                    disabled={loading}
                    className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"
                  >
                    Alterar
                  </button>
                </div>
              )}
            </div>
            
            {error && (
              <div className="flex items-start space-x-2 p-4 bg-rose-50 rounded-2xl border border-rose-100 text-rose-600 text-xs font-bold">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-5 rounded-[2rem] font-bold text-xl hover:bg-primary-700 transition-all shadow-xl shadow-primary-600/30 hover:shadow-primary-600/40 flex items-center justify-center space-x-3 group active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="h-6 w-6 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                  <span>Enviar Denúncia Agora</span>
                </>
              )}
            </button>
            <p className="text-center text-slate-400 text-xs mt-6 font-medium">
              Sua denúncia será tratada com prioridade pelos órgãos de saúde.
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default Denuncia;
