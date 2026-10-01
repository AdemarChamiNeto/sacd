import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const POLL_INTERVAL = 30000;

const STATUS_LABELS = {
  aberta: 'Aberta',
  em_inspecao: 'Em Inspeção',
  resolvida: 'Resolvida',
};
//chaves para o locaslstorage
const lsKeyStatuses = (uid) => `sacd_last_statuses_${uid}`;
const lsKeyNotifs   = (uid) => `sacd_notifications_${uid}`;
//le e salva o status das denuncias para comparar depois e gerar as notificações
function loadStatuses(uid) {
  try {
    const raw = localStorage.getItem(lsKeyStatuses(uid));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveStatuses(uid, statuses) {
  try { localStorage.setItem(lsKeyStatuses(uid), JSON.stringify(statuses)); } catch { /* localStorage indisponível: ignora */ }
}
//le e salva as notificações no localstorage, guardando no maximo 50 notificaçoes
function loadNotifications(uid) {
  try {
    const raw = localStorage.getItem(lsKeyNotifs(uid));
    if (!raw) return [];
    return JSON.parse(raw).map((n) => ({ ...n, hora: new Date(n.hora) }));
  } catch { return []; }
}

function saveNotifications(uid, notifs) {
  try {
    localStorage.setItem(lsKeyNotifs(uid), JSON.stringify(notifs.slice(0, 50)));
  } catch { /* localStorage indisponível: ignora */ }
}

export const useNotifications = () => {
  const { currentUser, role } = useAuth();

  const [notifications, setNotifications] = useState(() => {
    if (typeof window === 'undefined') return [];
    return [];
  });

  const lastStatusesRef = useRef({});
  const initializedRef  = useRef(false);
//quando o usuario loga restaura o statuses e notificaçoes salvas anteriormente
  useEffect(() => {
    if (!currentUser || (role !== 'cidadao' && role !== 'fiscal')) return;
    const uid = currentUser.uid;

    const savedStatuses = loadStatuses(uid);
    if (savedStatuses) {
      lastStatusesRef.current = savedStatuses;
      initializedRef.current  = true;
    }

    const savedNotifs = loadNotifications(uid);
    if (savedNotifs.length > 0) {
      setNotifications(savedNotifs);
    }
  }, [currentUser?.uid, role]);
//buscas as denuncias do usuario e compara o status com o salvo anteriormente, se tiver mudança gera uma nova notificação
  const fetchAndCompare = useCallback(async () => {
    if (!currentUser || (role !== 'cidadao' && role !== 'fiscal')) return;
    const uid = currentUser.uid;

    try {
      const token = await currentUser.getIdToken();
      const res = await axios.get(`${API_URL}/denuncias/minhas`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const denuncias = res.data || [];

      if (!initializedRef.current) {
        const initial = {};
        denuncias.forEach((d) => { initial[d.id] = d.status; });
        lastStatusesRef.current = initial;
        initializedRef.current  = true;
        saveStatuses(uid, initial);
        return;
      }

      const novas = [];
      const updatedStatuses = { ...lastStatusesRef.current };

      denuncias.forEach((d) => {
        const statusAnterior = lastStatusesRef.current[d.id];
        if (statusAnterior !== undefined && statusAnterior !== d.status) {
          novas.push({
            id: Date.now() + d.id,
            denunciaId: d.id,
            descricao: d.descricao,
            statusAnterior,
            statusNovo: d.status,
            lida: false,
            hora: new Date(),
          });
        }
        updatedStatuses[d.id] = d.status;
      });

      lastStatusesRef.current = updatedStatuses;
      saveStatuses(uid, updatedStatuses);

      if (novas.length > 0) {
        setNotifications((prev) => {
          const merged = [...novas, ...prev];
          saveNotifications(uid, merged);
          return merged;
        });
      }
    } catch {
      /* falha de rede: mantém as notificações atuais */
    }
  }, [currentUser, role]);

  useEffect(() => {
    if (!currentUser || (role !== 'cidadao' && role !== 'fiscal')) return;
    
    fetchAndCompare();
    const interval = setInterval(fetchAndCompare, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAndCompare, currentUser, role]);

  const marcarComoLida = useCallback((id) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, lida: true } : n));
      if (currentUser) saveNotifications(currentUser.uid, updated);
      return updated;
    });
  }, [currentUser]);

  const marcarTodasComoLidas = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, lida: true }));
      if (currentUser) saveNotifications(currentUser.uid, updated);
      return updated;
    });
  }, [currentUser]);

  const naoLidas = notifications.filter((n) => !n.lida).length;

  return { notifications, naoLidas, marcarComoLida, marcarTodasComoLidas, STATUS_LABELS };
};
