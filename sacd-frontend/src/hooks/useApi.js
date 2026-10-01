import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useApi = () => {
  const { currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (method, endpoint, payload = null, options = {}) => {
      const {
        retries = 3,
        retryDelay = 1000,
        timeout = 30000,
        onError = null,
      } = options;

      setLoading(true);
      setError(null);

      let lastError = null;

      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          if (!currentUser) {
            throw new Error('Usuário não autenticado');
          }

          const token = await currentUser.getIdToken();

          const axiosConfig = {
            method,
            url: `${API_URL}${endpoint}`,
            timeout,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          };

          if (payload && ['POST', 'PUT', 'PATCH'].includes(method)) {
            axiosConfig.data = payload;
          }

          const response = await axios(axiosConfig);

          setData(response.data);
          setLoading(false);
          return response.data;

        } catch (err) {
          lastError = err;

          const noRetryErrors = [401, 403, 404, 422];
          if (err.response?.status && noRetryErrors.includes(err.response.status)) {
            break;
          }

          if (attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
            continue;
          }
        }
      }

      const errorMessage = getErrorMessage(lastError);
      setError(errorMessage);
      setLoading(false);

      if (onError) {
        onError(lastError, errorMessage);
      }

      throw lastError;
    },
    [currentUser]
  );

  const get = useCallback(
    (endpoint, options) => execute('GET', endpoint, null, options),
    [execute]
  );

  const post = useCallback(
    (endpoint, payload, options) => execute('POST', endpoint, payload, options),
    [execute]
  );

  const put = useCallback(
    (endpoint, payload, options) => execute('PUT', endpoint, payload, options),
    [execute]
  );

  const delete_ = useCallback(
    (endpoint, options) => execute('DELETE', endpoint, null, options),
    [execute]
  );

  const patch = useCallback(
    (endpoint, payload, options) => execute('PATCH', endpoint, payload, options),
    [execute]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    get,
    post,
    put,
    delete: delete_,
    patch,
    reset,
  };
};

function getErrorMessage(error) {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.response?.statusText) {
    return error.response.statusText;
  }

  if (error.request && !error.response) {
    return 'Sem conexão com o servidor';
  }

  if (error.message) {
    const messages = {
      'Usuário não autenticado': 'Você precisa estar autenticado',
      'Network Error': 'Erro de conexão',
      'timeout of': 'Requisição expirou',
    };

    for (const [key, value] of Object.entries(messages)) {
      if (error.message.includes(key)) {
        return value;
      }
    }

    return error.message;
  }

  return 'Erro desconhecido';
}

export const useFetch = (endpoint, options = {}) => {
  const { get } = useApi();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await get(endpoint, options);
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refaz a busca só quando o endpoint muda
  }, [endpoint]);

  return { data, loading, error };
};

export default useApi;
