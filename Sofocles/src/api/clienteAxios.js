import axios from 'axios';

// Creamos una instancia personalizada de Axios
const clienteAxios = axios.create({
  // Aquí pones la URL local donde corre tu backend (por ejemplo, puerto 5000, 3000 o 8080)
  baseURL: 'http://localhost:5173/api', 
  timeout: 10000, // Si el servidor tarda más de 10s, cancela la petición para que no se quede colgado
  headers: {
    'Content-Type': 'application/json',
    // Aquí puedes meter más cosas en el futuro, como tokens de autorización (JWT)
  }
});

export default clienteAxios;