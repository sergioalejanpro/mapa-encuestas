const map = L.map('map').setView([19.47894, -99.23356], 14);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const marker = L.marker([19.47894, -99.23356]).addTo(map);

marker.bindPopup(`
  <b>Encuesta</b><br>
  Edad: 34<br>
  Sexo: M<br>
  Fecha: 2026-04-26<br>
  Hora: 14:30
`);