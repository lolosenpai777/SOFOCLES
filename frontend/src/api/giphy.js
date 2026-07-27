// Giphy API Service
const GIPHY_API_KEY = "d698xpOEDn7itI1ZTMbZ7K19BzM6iQZV";
const GIPHY_BASE_URL = "https://api.giphy.com/v1/gifs";

export const buscarGifs = async (query, limit = 20) => {
  try {
    const url = new URL(`${GIPHY_BASE_URL}/search`);
    url.searchParams.append("api_key", GIPHY_API_KEY);
    url.searchParams.append("q", query);
    url.searchParams.append("limit", limit);
    url.searchParams.append("rating", "pg-13");
    url.searchParams.append("lang", "es");

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error("Error al buscar GIFs");

    const data = await response.json();
    return data.data.map((gif) => ({
      id: gif.id,
      title: gif.title,
      url: gif.images.fixed_height.url,
      originalUrl: gif.images.original.url,
      previewUrl: gif.images.preview_gif.url,
    }));
  } catch (error) {
    console.error("Error en buscarGifs:", error);
    return [];
  }
};

export const obtenerGifsTrending = async (limit = 20) => {
  try {
    const url = new URL(`${GIPHY_BASE_URL}/trending`);
    url.searchParams.append("api_key", GIPHY_API_KEY);
    url.searchParams.append("limit", limit);
    url.searchParams.append("rating", "pg-13");

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error("Error al obtener GIFs trending");

    const data = await response.json();
    return data.data.map((gif) => ({
      id: gif.id,
      title: gif.title,
      url: gif.images.fixed_height.url,
      originalUrl: gif.images.original.url,
      previewUrl: gif.images.preview_gif.url,
    }));
  } catch (error) {
    console.error("Error en obtenerGifsTrending:", error);
    return [];
  }
};
