// Precios oficiales por carrera (ARS). con = con remera, sin = sin remera.
// ⚠️ Deben coincidir con public/config.js (precios) — es lo que ve y paga el corredor.
const PRICES = {
  '15k':      { con: 45000, sin: 40000 }, // 15K Competitiva
  '7k':       { con: 35000, sin: 30000 }, // 5K Participativa
  'caminata': { sin: 0 },                 // 5K Caminata (gratis, sin remera)
};

module.exports = PRICES;
