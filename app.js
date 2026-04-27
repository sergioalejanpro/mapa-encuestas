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
let seccionesNaucalpanLayer;
let encuestasPorSeccionLayer;
let encuestasLayer;
let heatmapLayer;
let encuestasGeojson;
let sexoFilter = 'ALL';

async function cargarMunicipios() {

  const response = await fetch(CONFIG.municipiosUrl);

  const data = await response.json();

  const naucalpanFeature = data.features.find(
    feature => feature.properties.municipio == 58
  );

  const naucalpanLayer = L.geoJSON(naucalpanFeature);

  map.fitBounds(naucalpanLayer.getBounds());

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

async function cargarSeccionesNaucalpan() {

  const response = await fetch(CONFIG.seccionesNaucalpanUrl);

  const data = await response.json();

  seccionesNaucalpanLayer = L.geoJSON(data, {

    style: (feature) => {

      return {

        color: '#666',
        weight: 1,
        fillOpacity: 0

      };

    },

  onEachFeature: (feature, layer) => {

    layer.bindTooltip('', {

      sticky: true,
      direction: 'top'

    }); 

    layer.on({

      mouseover: (event) => {

        const targetLayer = event.target;

        const seccion = feature.properties.seccion;

        const totalEncuestas =
          contarEncuestasPorSeccion(seccion);

        targetLayer.setTooltipContent(`
          <b>Sección ${seccion}</b><br>
          Encuestas: ${totalEncuestas}
        `);  

        document.getElementById('seccion-info').innerHTML = `
          <b>Sección:</b> ${seccion}<br>
          <b>Encuestas:</b> ${totalEncuestas}
        `;

        targetLayer.setStyle({

          weight: 3,
          color: '#ff9800',
          fillOpacity: 0.25

        });

      },

      mouseout: (event) => {

        seccionesNaucalpanLayer.resetStyle(event.target);

      },

      click: (event) => {

        const seccion = feature.properties.seccion;

        const totalEncuestas =
          contarEncuestasPorSeccion(seccion);

        document.getElementById('seccion-info').innerHTML = `
          <b>Sección:</b> ${seccion}<br>
          <b>Encuestas:</b> ${totalEncuestas}
        `;

        map.fitBounds(event.target.getBounds(), {

          padding: [20, 20]

        });

      }     

    });

  }

  });

}

function renderEncuestasPorSeccion() {

  if (encuestasPorSeccionLayer) {

    map.removeLayer(encuestasPorSeccionLayer);

  }

  const filteredFeatures =
    sexoFilter === 'ALL'

      ? encuestasGeojson.features

      : encuestasGeojson.features.filter(
          feature =>
            feature.properties.sexo === sexoFilter
        );

  const seccionesAgrupadas = {};

  filteredFeatures.forEach(feature => {

    const seccion = feature.properties.seccion;

    if (!seccionesAgrupadas[seccion]) {

      seccionesAgrupadas[seccion] = [];

    }

    seccionesAgrupadas[seccion].push(feature);

  });

  const markers = [];

  seccionesNaucalpanLayer.eachLayer(layer => {

    const feature = layer.feature;

    const seccion =
      feature.properties.seccion;

    const encuestas =
      seccionesAgrupadas[seccion];

    if (!encuestas || encuestas.length === 0) {

      return;

    }

    const center =
      layer.getBounds().getCenter();

    const total =
      encuestas.length;

    const marker = L.marker(center, {

      icon: L.divIcon({

        className: 'seccion-marker',

        html: `
          <div class="marker-circle">
            <div>${seccion}</div>
            <strong>${total}</strong>
          </div>
        `,

        iconSize: [52, 52],
        iconAnchor: [26, 26]

      })

    });

    marker.bindPopup(`
      <b>Sección ${seccion}</b><br>
      Encuestas: ${total}
    `);

    markers.push(marker);

  });

  encuestasPorSeccionLayer =
    L.layerGroup(markers);

  encuestasPorSeccionLayer.addTo(map);

}

function renderEncuestas() {

  if (encuestasLayer) {

    map.removeLayer(encuestasLayer);

  }

  const filteredFeatures =
    sexoFilter === 'ALL'

      ? encuestasGeojson.features

      : encuestasGeojson.features.filter(
          feature =>
            feature.properties.sexo === sexoFilter
        );

  document.getElementById('total-encuestas').textContent =
    filteredFeatures.length;

  const filteredGeojson = {

    type: 'FeatureCollection',

    features: filteredFeatures

  };

  const markers = L.markerClusterGroup();

  const geoJsonLayer = L.geoJSON(filteredGeojson, {

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

    },

  });

  markers.addLayer(geoJsonLayer);

  encuestasLayer = markers;

  encuestasLayer.addTo(map);
  // renderEncuestasPorSeccion();

  seccionesNaucalpanLayer.bringToFront();  

  renderHeatmap();
}


function renderHeatmap() {

  if (heatmapLayer) {

    map.removeLayer(heatmapLayer);

  }

  const filteredFeatures =
    sexoFilter === 'ALL'

      ? encuestasGeojson.features

      : encuestasGeojson.features.filter(
          feature =>
            feature.properties.sexo === sexoFilter
        );

  const heatPoints = filteredFeatures.map(feature => {

    const coordinates =
      feature.geometry.coordinates;

    return [

      coordinates[1],
      coordinates[0],
      1

    ];

  });

  heatmapLayer = L.heatLayer(heatPoints, {

    radius: 25,
    blur: 18,
    maxZoom: 17,
    gradient: {
      0.2: '#4a90e2',
      0.4: '#5c6bc0',
      0.6: '#9c27b0',
      0.8: '#e91e63',
      1.0: '#ff1744'
    },
  });

}

async function cargarEncuestas() {

  const response = await fetch(CONFIG.dataUrl);

  const data = await response.json();

  encuestasGeojson = data;

  renderEncuestas();

}

async function inicializarMapa() {

  try {

    await cargarMunicipios();

    await cargarSeccionesNaucalpan();

    await cargarEncuestas();

    municipiosLayer.addTo(map);

    // encuestasLayer.addTo(map);

    seccionesNaucalpanLayer.addTo(map);

    L.control.layers(

      {},

      {
        'Municipios': municipiosLayer,
        'Encuestas': encuestasLayer,
        'Secciones': seccionesNaucalpanLayer,
        'Mapa de Calor': heatmapLayer        
      },

      {
        collapsed: false
      }

    ).addTo(map);

  } catch (error) {

    console.error(error);

  }

}

function contarEncuestasPorSeccion(seccion) {

  return encuestasGeojson.features.filter(
    feature => feature.properties.seccion == seccion
  ).length;

}

document
  .getElementById('sexo-filter')
  .addEventListener('change', (event) => {

    sexoFilter = event.target.value;

    renderEncuestas();

  });

window.addEventListener('DOMContentLoaded', () => {

  document
    .getElementById('menu-toggle')
    .addEventListener('click', () => {

      document
        .getElementById('sidebar')
        .classList.toggle('open');

    });

});

inicializarMapa();