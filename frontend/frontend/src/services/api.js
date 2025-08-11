import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log(`Making ${config.method.toUpperCase()} request to ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error('API Error:', error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

export const uploadImages = async (formData) => {
  try {
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutes for upload
    });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.error || error.message || 'Upload failed';
    throw new Error(message);
  }
};

export const getVideoStatus = async (videoId) => {
  try {
    const response = await api.get(`/video/${videoId}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.error || error.message || 'Failed to get video status';
    throw new Error(message);
  }
};

export const getAllVideos = async () => {
  try {
    const response = await api.get('/videos');
    return response.data;
  } catch (error) {
    const message = error.response?.data?.error || error.message || 'Failed to get videos';
    throw new Error(message);
  }
};

export const deleteVideo = async (videoId) => {
  try {
    const response = await api.delete(`/video/${videoId}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.error || error.message || 'Failed to delete video';
    throw new Error(message);
  }
};

export const getVideoUrl = (path) => {
  if (!path) return null;
  return `${BASE_URL}${path}`;
};

export default api;