const map = L.map('map').setView([19.4752, -99.2395], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

async function cargarEncuestas() {
  try {
    const response = await fetch('./data/encuestas.geojson');

    if (!response.ok) {
      throw new Error('No se pudo cargar el archivo GeoJSON');
    }

    const data = await response.json();

    document.getElementById('total-encuestas').textContent =
      data.features.length;

    const markers = L.markerClusterGroup();

    const capaEncuestas = L.geoJSON(data, {

      pointToLayer: (feature, latlng) => {

        const color =
          feature.properties.sexo === 'F'
            ? 'rgb(226, 30, 233)'
            : '#2196f3';

        return L.marker(latlng, {
          icon: L.divIcon({
            className: 'custom-marker',
            html: `
              <div style="
                width:16px;
                height:16px;
                border-radius:50%;
                background:${color};
                border:2px solid white;
              "></div>
            `,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })
        });
      },

      onEachFeature: (feature, layer) => {

        const props = feature.properties;

        const popup = `
          <div>
            <b>Encuesta</b><br>
            Edad: ${props.edad}<br>
            Sexo: ${props.sexo}<br>
            Fecha: ${props.fecha}<br>
            Hora: ${props.hora}
          </div>
        `;

        layer.bindPopup(popup);
      }
    });

    markers.addLayer(capaEncuestas);

    map.addLayer(markers);

    map.fitBounds(capaEncuestas.getBounds());

  } catch (error) {
    console.error(error);
  }
}

cargarEncuestas();