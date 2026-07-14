// Promo "primeros 100": 10% OFF automático a las primeras inscripciones pagas.
// ⚠️ Editá acá para activar/desactivar, cambiar el cupo o el porcentaje.
//    No aplica a la caminata (es gratis, no consume cupo).
const PROMO = {
  activo:      true,
  porcentaje:  10,   // % de descuento sobre el precio original
  cupoMaximo:  100,  // cantidad de inscripciones con descuento
  ttlMinutos:  20,   // minutos que dura la reserva del cupo al llegar al paso de pago
};

module.exports = PROMO;
