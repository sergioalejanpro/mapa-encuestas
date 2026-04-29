const map = L.map("map").setView(
  [CONFIG.initialView.lat, CONFIG.initialView.lng],
  CONFIG.initialView.zoom,
);

L.tileLayer(
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",

  {
    attribution: "&copy; OpenStreetMap contributors",
  },
).addTo(map);

let municipiosLayer;
let seccionesNaucalpanLayer;
let encuestasLayer;
let heatmapLayer;
let encuestasGeojson;
let seccionCategoriasLayer;

async function cargarMunicipios() {
  const response = await fetch(CONFIG.municipiosUrl);

  const data = await response.json();

  const naucalpanFeature = data.features.find(
    (feature) => feature.properties.municipio == 58,
  );

  const naucalpanLayer = L.geoJSON(naucalpanFeature);

  map.fitBounds(naucalpanLayer.getBounds());

  municipiosLayer = L.geoJSON(data, {
    style: (feature) => {
      const esNaucalpan = feature.properties.municipio == 58;

      return {
        color: "#222",
        weight: esNaucalpan ? 3 : 1,
        opacity: 1,

        fillColor: esNaucalpan ? "#4a90e2" : "#999",

        fillOpacity: esNaucalpan ? 0.18 : 0.03,
      };
    },

    onEachFeature: (feature, layer) => {
      const props = feature.properties;

      layer.bindPopup(`
        <b>Municipio</b><br>
        ${props.nombre}
      `);
    },
  });
}

async function cargarSeccionesNaucalpan() {
  const response = await fetch(CONFIG.seccionesNaucalpanUrl);

  const data = await response.json();

  seccionesNaucalpanLayer = L.geoJSON(data, {
    style: (feature) => {
      return {
        color: "#666",
        weight: 1,
        fillOpacity: 0,
      };
    },

    onEachFeature: (feature, layer) => {
      layer.bindTooltip("", {
        sticky: true,
        direction: "top",
      });

      layer.on({
        mouseover: (event) => {
          const targetLayer = event.target;

          const seccion = feature.properties.seccion;

          const totalEncuestas = contarEncuestasPorSeccion(seccion);

          targetLayer.setTooltipContent(`
          <b>Sección ${seccion}</b><br>
          Encuestas: ${totalEncuestas}
        `);

          targetLayer.setStyle({
            weight: 3,
            color: "#ff9800",
            fillOpacity: 0.25,
          });
        },

        mouseout: (event) => {
          seccionesNaucalpanLayer.resetStyle(event.target);
        },

        click: (event) => {
          const seccion = feature.properties.seccion;

          const totalEncuestas = contarEncuestasPorSeccion(seccion);

          map.fitBounds(event.target.getBounds(), {
            padding: [20, 20],
          });
        },
      });
    },
  });
}

async function cargarSeccionCategorias() {
  const response = await fetch("data/seccion-categorias.geojson");

  const data = await response.json();

  seccionCategoriasLayer = L.geoJSON(data, {
    style: (feature) => {
      const categoria = feature.properties.categoria;

      let fillColor = "#999";

      if (categoria === "fortaleza") {
        fillColor = "#43a047";
      } else if (categoria === "oportunidad") {
        fillColor = "#fdd835";
      } else if (categoria === "activacion") {
        fillColor = "#e53935";
      }

      return {
        color: "#222",

        weight: 1.5,

        fillColor,

        fillOpacity: 0.2,
      };
    },

    onEachFeature: (feature, layer) => {
      const props = feature.properties;

      layer.bindTooltip(`

        <b>Sección:</b> ${props.seccion}<br>
        <b>Categoría:</b> ${props.categoria}

      `);
    },
  });
}

function renderEncuestas() {
  if (encuestasLayer) {
    map.removeLayer(encuestasLayer);
  }

  const filteredFeatures = encuestasGeojson.features;

  document.getElementById("total-encuestas").textContent =
    filteredFeatures.length;

  const filteredGeojson = {
    type: "FeatureCollection",

    features: filteredFeatures,
  };

  const markers = L.markerClusterGroup();

  const geoJsonLayer = L.geoJSON(filteredGeojson, {
    pointToLayer: (feature, latlng) => {
      const color =
        feature.properties.sexo === "F"
          ? CONFIG.colors.female
          : CONFIG.colors.male;

      return L.marker(latlng, {
        icon: L.divIcon({
          className: "custom-marker",

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
          iconAnchor: [8, 8],
        }),
      });
    },

    onEachFeature: (feature, layer) => {
      const props = feature.properties;

      layer.bindPopup(`
        <b>A quién prefiere ?</b><BR>
        Isaac: ${props.Isaac}%<br>
        Iliana: ${props.Iliana}%<br>
        Karina: ${props.Karina}%<br>
        <hr>
        ${props.folio_encuesta}<br>
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

  const filteredFeatures = encuestasGeojson.features;

  const heatPoints = filteredFeatures.map((feature) => {
    const coordinates = feature.geometry.coordinates;

    return [coordinates[1], coordinates[0], 1];
  });

  heatmapLayer = L.heatLayer(heatPoints, {
    radius: 25,
    blur: 18,
    maxZoom: 17,
    gradient: {
      0.2: "#4a90e2",
      0.4: "#5c6bc0",
      0.6: "#9c27b0",
      0.8: "#e91e63",
      1.0: "#ff1744",
    },
  });
}

async function cargarEncuestas() {
  const response = await fetch(CONFIG.dataUrl);

  const data = await response.json();

  encuestasGeojson = data;

  renderEncuestas();
}

function configurarLayersSidebar() {
  document
    .getElementById("toggle-municipios")
    .addEventListener("change", (event) => {
      if (event.target.checked) {
        municipiosLayer.addTo(map);
      } else {
        map.removeLayer(municipiosLayer);
      }
    });

  document
    .getElementById("toggle-secciones")
    .addEventListener("change", (event) => {
      if (event.target.checked) {
        seccionesNaucalpanLayer.addTo(map);
      } else {
        map.removeLayer(seccionesNaucalpanLayer);
      }
    });

  document
    .getElementById("toggle-heatmap")
    .addEventListener("change", (event) => {
      if (event.target.checked) {
        heatmapLayer.addTo(map);
      } else {
        map.removeLayer(heatmapLayer);
      }
    });

  document
    .getElementById("toggle-encuestas")
    .addEventListener("change", (event) => {
      if (event.target.checked) {
        encuestasLayer.addTo(map);
      } else {
        map.removeLayer(encuestasLayer);
      }
    });

  document
    .getElementById("toggle-seccion-categorias")
    .addEventListener("change", (event) => {
      if (event.target.checked) {
        seccionCategoriasLayer.addTo(map);
      } else {
        map.removeLayer(seccionCategoriasLayer);
      }
    });
}

async function inicializarMapa() {
  try {
    await cargarMunicipios();

    await cargarSeccionesNaucalpan();

    await cargarSeccionCategorias();

    await cargarEncuestas();

    municipiosLayer.addTo(map);

    seccionesNaucalpanLayer.addTo(map);

    seccionCategoriasLayer.addTo(map);

    heatmapLayer.addTo(map);

    configurarLayersSidebar();
  } catch (error) {
    console.error(error);
  }
}

function contarEncuestasPorSeccion(seccion) {
  return encuestasGeojson.features.filter(
    (feature) => feature.properties.seccion == seccion,
  ).length;
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("menu-toggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });
});

inicializarMapa();
