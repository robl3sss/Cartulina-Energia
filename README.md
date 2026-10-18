# Cartulina · Laboratorio de energía

Simulador de apoyo para visualizar una pista dibujada físicamente en cartulina en el Centro Universitario de Occidente (CUNOC), Universidad de San Carlos de Guatemala.

## Uso

Abre `index.html` o visita GitHub Pages. Pulsa **Reproducir** y alterna entre las dos fotografías originales o el perfil a escala. Puedes pausar, seleccionar puntos, cambiar la masa, activar fricción, guardar capturas y descargar resultados.

Las fotografías conservan el sello y la firma originales.

## Modelo

- Alturas de los puntos: 70, 30, 50 y 20 m.
- Posiciones horizontales idealizadas: 0, 30, 60 y 90 m, con tramo final hasta 105 m.
- Masa inicial: 0.05 kg; gravedad: 9.81 m/s²; salida desde el reposo.
- Sin fricción: conservación de energía mecánica.
- Con fricción: fuerza disipativa constante, calibrada mediante la energía disipada entre los puntos 1 y 2 (0.150 J por defecto).
- No se modelan frenos, resistencia del aire ni rotación de las ruedas. Al acabar el tramo se congela la animación conservando la rapidez calculada.

Aplicación estática en HTML, CSS y JavaScript. No requiere instalación ni claves de acceso.
