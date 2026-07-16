import axios from 'axios'

const clienteAxios = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

clienteAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('sofocles_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default clienteAxios