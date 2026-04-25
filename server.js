// server.js — Backend TOKI Multi-País LATAM
// npm install express axios dotenv cors


const express = require('express');
const axios   = require('axios');
const cors    = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const TMDB_KEY   = process.env.TMDB_API_KEY;
const GOOGLE_KEY = process.env.GOOGLE_PLACES_KEY;
const TM_KEY     = process.env.TICKETMASTER_KEY;

// ── Mapa de países LATAM + España ─────────────────────────────────────────────
const PAISES = {
  // América del Sur
  PE: { ciudad: 'Lima',           nombre: 'Perú',         tmCode: 'PE', lat: -12.0464, lng: -77.0428 },
  MX: { ciudad: 'Mexico City',    nombre: 'México',       tmCode: 'MX', lat: 19.4326,  lng: -99.1332 },
  CO: { ciudad: 'Bogota',         nombre: 'Colombia',     tmCode: 'CO', lat: 4.7110,   lng: -74.0721 },
  AR: { ciudad: 'Buenos Aires',   nombre: 'Argentina',    tmCode: 'AR', lat: -34.6037, lng: -58.3816 },
  CL: { ciudad: 'Santiago',       nombre: 'Chile',        tmCode: 'CL', lat: -33.4489, lng: -70.6693 },
  VE: { ciudad: 'Caracas',        nombre: 'Venezuela',    tmCode: 'VE', lat: 10.4806,  lng: -66.9036 },
  EC: { ciudad: 'Quito',          nombre: 'Ecuador',      tmCode: 'EC', lat: -0.1807,  lng: -78.4678 },
  BO: { ciudad: 'La Paz',         nombre: 'Bolivia',      tmCode: 'BO', lat: -16.5000, lng: -68.1193 },
  PY: { ciudad: 'Asuncion',       nombre: 'Paraguay',     tmCode: 'PY', lat: -25.2867, lng: -57.6470 },
  UY: { ciudad: 'Montevideo',     nombre: 'Uruguay',      tmCode: 'UY', lat: -34.9011, lng: -56.1645 },
  // América Central y Caribe
  CR: { ciudad: 'San Jose',       nombre: 'Costa Rica',   tmCode: 'CR', lat: 9.9281,   lng: -84.0907 },
  PA: { ciudad: 'Panama City',    nombre: 'Panamá',       tmCode: 'PA', lat: 8.9936,   lng: -79.5197 },
  GT: { ciudad: 'Guatemala City', nombre: 'Guatemala',    tmCode: 'GT', lat: 14.6349,  lng: -90.5069 },
  HN: { ciudad: 'Tegucigalpa',    nombre: 'Honduras',     tmCode: 'HN', lat: 14.0818,  lng: -87.2068 },
  SV: { ciudad: 'San Salvador',   nombre: 'El Salvador',  tmCode: 'SV', lat: 13.6929,  lng: -89.2182 },
  NI: { ciudad: 'Managua',        nombre: 'Nicaragua',    tmCode: 'NI', lat: 12.1364,  lng: -86.2514 },
  DO: { ciudad: 'Santo Domingo',  nombre: 'Rep. Dom.',    tmCode: 'DO', lat: 18.4861,  lng: -69.9312 },
  CU: { ciudad: 'Havana',         nombre: 'Cuba',         tmCode: 'CU', lat: 23.1136,  lng: -82.3666 },
  PR: { ciudad: 'San Juan',       nombre: 'Puerto Rico',  tmCode: 'US', lat: 18.4655,  lng: -66.1057 },
  // Europa hispana
  ES: { ciudad: 'Madrid',         nombre: 'España',       tmCode: 'ES', lat: 40.4168,  lng: -3.7038  },
  // Latinos en USA
  US: { ciudad: 'Miami',          nombre: 'USA (Latino)', tmCode: 'US', lat: 25.7617,  lng: -80.1918 },
};

const getPais = (code) => PAISES[code?.toUpperCase()] || PAISES['PE'];

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'TOKI Server OK 🚀',
    version: '2.0',
    paises_soportados: Object.keys(PAISES).length,
    latam: true,
  });
});

// ── Lista de países disponibles ───────────────────────────────────────────────
app.get('/paises', (req, res) => {
  const lista = Object.entries(PAISES).map(([code, data]) => ({
    code,
    nombre: data.nombre,
    ciudad: data.ciudad,
  }));
  res.json({ ok: true, data: lista });
});

// ── 🎬 Cartelera de cine (global por idioma) ──────────────────────────────────
app.get('/cine', async (req, res) => {
  const { pais = 'PE' } = req.query;
  const paisData = getPais(pais);

  try {
    const response = await axios.get(
      'https://api.themoviedb.org/3/movie/now_playing',
      {
        params: {
          api_key: TMDB_KEY,
          language: 'es-419',  // Español latinoamericano
          region: paisData.tmCode,
          page: 1,
        },
      }
    );

    const peliculas = response.data.results.slice(0, 10).map((p) => ({
      id:          p.id,
      titulo:      p.title,
      titulo_orig: p.original_title,
      sinopsis:    p.overview?.substring(0, 200) || 'Sin descripción',
      poster:      p.poster_path
        ? `https://image.tmdb.org/t/p/w500${p.poster_path}`
        : null,
      fondo:       p.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${p.backdrop_path}`
        : null,
      rating:      p.vote_average?.toFixed(1),
      votos:       p.vote_count,
      fecha:       p.release_date,
      popularidad: Math.round(p.popularity),
      adulto:      p.adult,
    }));

    res.json({
      ok: true,
      pais: paisData.nombre,
      ciudad: paisData.ciudad,
      data: peliculas,
    });
  } catch (error) {
    console.error('Error cine:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ── 🎵 Conciertos y eventos (por país) ───────────────────────────────────────
app.get('/eventos', async (req, res) => {
  const { pais = 'PE' } = req.query;
  const paisData = getPais(pais);

  try {
    const response = await axios.get(
      'https://app.ticketmaster.com/discovery/v2/events.json',
      {
        params: {
          apikey: TM_KEY,
          city: paisData.ciudad,
          countryCode: paisData.tmCode,
          size: 15,
          sort: 'date,asc',
          locale: 'es',
        },
      }
    );

    const eventos = (response.data._embedded?.events || []).map((e) => ({
      id:       e.id,
      nombre:   e.name,
      fecha:    e.dates?.start?.localDate,
      hora:     e.dates?.start?.localTime?.substring(0, 5),
      venue:    e._embedded?.venues?.[0]?.name,
      ciudad:   e._embedded?.venues?.[0]?.city?.name,
      imagen:   e.images?.find(i => i.ratio === '16_9')?.url || e.images?.[0]?.url,
      url:      e.url,
      precio:   e.priceRanges?.[0]
        ? `${e.priceRanges[0].currency} ${e.priceRanges[0].min} - ${e.priceRanges[0].max}`
        : 'Ver precios',
      genero:   e.classifications?.[0]?.genre?.name,
      tipo:     e.classifications?.[0]?.segment?.name,
    }));

    res.json({
      ok: true,
      pais: paisData.nombre,
      ciudad: paisData.ciudad,
      data: eventos,
    });
  } catch (error) {
    console.error('Error eventos:', error.message);
    res.json({
      ok: true,
      pais: paisData.nombre,
      data: [],
      mensaje: 'No hay eventos disponibles para esta ciudad',
    });
  }
});

// ── 🍽️ Restaurantes cercanos (por GPS) ───────────────────────────────────────
app.get('/restaurantes', async (req, res) => {
  const { pais = 'PE', lat, lng, radio = 2000 } = req.query;
  const paisData = getPais(pais);
  const latFinal = lat || paisData.lat;
  const lngFinal = lng || paisData.lng;

  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      {
        params: {
          location: `${latFinal},${lngFinal}`,
          radius: radio,
          type: 'restaurant',
          language: 'es',
          key: GOOGLE_KEY,
        },
      }
    );

    const lugares = response.data.results.slice(0, 12).map((l) => ({
      id:        l.place_id,
      nombre:    l.name,
      direccion: l.vicinity,
      rating:    l.rating,
      reseñas:   l.user_ratings_total,
      abierto:   l.opening_hours?.open_now,
      foto:      l.photos?.[0]?.photo_reference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${l.photos[0].photo_reference}&key=${GOOGLE_KEY}`
        : null,
      precio:    l.price_level,
      lat:       l.geometry.location.lat,
      lng:       l.geometry.location.lng,
      tipos:     l.types?.slice(0, 3),
    }));

    res.json({
      ok: true,
      pais: paisData.nombre,
      data: lugares,
    });
  } catch (error) {
    console.error('Error restaurantes:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ── ☕ Cafés ───────────────────────────────────────────────────────────────────
app.get('/cafes', async (req, res) => {
  const { pais = 'PE', lat, lng } = req.query;
  const paisData = getPais(pais);
  const latFinal = lat || paisData.lat;
  const lngFinal = lng || paisData.lng;

  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      {
        params: {
          location: `${latFinal},${lngFinal}`,
          radius: 1500,
          keyword: 'cafe coffee',
          language: 'es',
          key: GOOGLE_KEY,
        },
      }
    );

    const cafes = response.data.results.slice(0, 10).map((l) => ({
      id:        l.place_id,
      nombre:    l.name,
      direccion: l.vicinity,
      rating:    l.rating,
      abierto:   l.opening_hours?.open_now,
      foto:      l.photos?.[0]?.photo_reference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${l.photos[0].photo_reference}&key=${GOOGLE_KEY}`
        : null,
      precio:    l.price_level,
      lat:       l.geometry.location.lat,
      lng:       l.geometry.location.lng,
    }));

    res.json({ ok: true, pais: paisData.nombre, data: cafes });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ── 🛍️ Centros comerciales ────────────────────────────────────────────────────
app.get('/compras', async (req, res) => {
  const { pais = 'PE', lat, lng } = req.query;
  const paisData = getPais(pais);
  const latFinal = lat || paisData.lat;
  const lngFinal = lng || paisData.lng;

  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      {
        params: {
          location: `${latFinal},${lngFinal}`,
          radius: 5000,
          type: 'shopping_mall',
          language: 'es',
          key: GOOGLE_KEY,
        },
      }
    );

    const malls = response.data.results.slice(0, 8).map((l) => ({
      id:        l.place_id,
      nombre:    l.name,
      direccion: l.vicinity,
      rating:    l.rating,
      abierto:   l.opening_hours?.open_now,
      lat:       l.geometry.location.lat,
      lng:       l.geometry.location.lng,
    }));

    res.json({ ok: true, pais: paisData.nombre, data: malls });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ── 🎭 Vida nocturna ──────────────────────────────────────────────────────────
app.get('/noche', async (req, res) => {
  const { pais = 'PE', lat, lng } = req.query;
  const paisData = getPais(pais);
  const latFinal = lat || paisData.lat;
  const lngFinal = lng || paisData.lng;

  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      {
        params: {
          location: `${latFinal},${lngFinal}`,
          radius: 3000,
          type: 'night_club',
          language: 'es',
          key: GOOGLE_KEY,
        },
      }
    );

    const clubs = response.data.results.slice(0, 8).map((l) => ({
      id:        l.place_id,
      nombre:    l.name,
      direccion: l.vicinity,
      rating:    l.rating,
      abierto:   l.opening_hours?.open_now,
      lat:       l.geometry.location.lat,
      lng:       l.geometry.location.lng,
    }));

    res.json({ ok: true, pais: paisData.nombre, data: clubs });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ── 🌳 Parques y lugares al aire libre ────────────────────────────────────────
app.get('/parques', async (req, res) => {
  const { pais = 'PE', lat, lng } = req.query;
  const paisData = getPais(pais);
  const latFinal = lat || paisData.lat;
  const lngFinal = lng || paisData.lng;

  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      {
        params: {
          location: `${latFinal},${lngFinal}`,
          radius: 3000,
          type: 'park',
          language: 'es',
          key: GOOGLE_KEY,
        },
      }
    );

    const parques = response.data.results.slice(0, 8).map((l) => ({
      id:        l.place_id,
      nombre:    l.name,
      direccion: l.vicinity,
      rating:    l.rating,
      lat:       l.geometry.location.lat,
      lng:       l.geometry.location.lng,
    }));

    res.json({ ok: true, pais: paisData.nombre, data: parques });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 TOKI Server corriendo en puerto ${PORT}`);
  console.log(`🌎 Soporta ${Object.keys(PAISES).length} países LATAM`);
});
