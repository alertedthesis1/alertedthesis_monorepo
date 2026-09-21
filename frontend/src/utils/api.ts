import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const studentAPI = {
  getAll: (limit = 100, offset = 0) =>
    api.get('/students', { params: { limit, offset } }),
  getById: (id: number) => api.get(`/students/${id}`),
  create: (data: any) => api.post('/students', data),
  update: (id: number, data: any) => api.put(`/students/${id}`, data),
};

export const riskAPI = {
  getScores: (limit = 100) => api.get('/risk-scores', { params: { limit } }),
  getStudentRisk: (studentId: number) => api.get(`/risk-scores/${studentId}`),
  predictRisk: (studentId: number) => api.post(`/risk-scores/predict/${studentId}`),
};

export const analyticsAPI = {
  getTrends: (period = 'month') => api.get('/analytics/trends', { params: { period } }),
  getInterventions: () => api.get('/analytics/interventions'),
  getAccuracy: () => api.get('/analytics/model-accuracy'),
};

export default api;
