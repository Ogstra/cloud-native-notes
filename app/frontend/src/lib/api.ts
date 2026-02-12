import axios from 'axios';

const getBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) {
        return envUrl;
    }

    if (typeof window !== 'undefined') {
        const { protocol, hostname } = window.location;
        return `${protocol}//${hostname}:3000`;
    }

    return 'http://localhost:3000';
};

const api = axios.create({
    baseURL: getBaseUrl(),
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const isAuthRequest = typeof window !== 'undefined'
                && window.location.pathname.startsWith('/login');
            if (isAuthRequest) {
                return Promise.reject(error);
            }
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
