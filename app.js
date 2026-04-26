const map = L.map('map').setView(
  [
    CONFIG.initialView.lat,
    CONFIG.initialView.lng
  ],
  CONFIG.initialView.zoom
);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let municipiosLayer;
let encuestasLayer;

async function cargarMunicipios() {

  const response = await fetch(CONFIG.municipiosUrl);

  const data = await response.json();

  municipiosLayer = L.geoJSON(data, {

    style: (feature) => {

      const esNaucalpan = feature.properties.municipio == 58;

      return {

        color: '#222',
        weight: esNaucalpan ? 3 : 1,
        opacity: 1,

        fillColor: esNaucalpan
          ? '#4a90e2'
          : '#999',

        fillOpacity: esNaucalpan
          ? 0.18
          : 0.03

      };

    },

    onEachFeature: (feature, layer) => {

      const props = feature.properties;

      layer.bindPopup(`
        <b>Municipio</b><br>
        ${props.nombre}
      `);

    }

  });

}

async function cargarEncuestas() {

  const response = await fetch(CONFIG.dataUrl);

  const data = await response.json();

  document.getElementById('total-encuestas').textContent =
    data.features.length;

  const markers = L.markerClusterGroup();

  encuestasLayer = L.geoJSON(data, {

    pointToLayer: (feature, latlng) => {

      const color =
        feature.properties.sexo === 'F'
          ? CONFIG.colors.female
          : CONFIG.colors.male;

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

      layer.bindPopup(`
        <b>${props.folio_encuesta}</b><br>
        Edad: ${props.edad}<br>
        Sexo: ${props.sexo}<br>
        Fecha: ${props.fecha}<br>
        Hora: ${props.hora}
      `);

    }

  });

  markers.addLayer(encuestasLayer);

  encuestasLayer = markers;

}

async function inicializarMapa() {

  try {

    await cargarMunicipios();

    await cargarEncuestas();

    municipiosLayer.addTo(map);

    encuestasLayer.addTo(map);

    L.control.layers(

      {},

      {
        'Municipios': municipiosLayer,
        'Encuestas': encuestasLayer
      },

      {
        collapsed: false
      }

    ).addTo(map);

    map.fitBounds(encuestasLayer.getBounds());

  } catch (error) {

    console.error(error);

  }

}

inicializarMapa();