const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000;

const CLIENT_ID = "b8fa8d9bed0948b7a45f7d1b87a75340";
const CLIENT_SECRET = "e2d74c0753fa482a92352276C38672Ef";

const API_URL = `https://apitransporte.buenosaires.gob.ar/subtes/forecastGTFS?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`;


// 🔹 Formatear hora Argentina 24hs
const formatearHora = (timestamp) =>
  new Date(timestamp * 1000).toLocaleTimeString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

// 🔹 Obtener datos de API
const getData = async () => {
  const response = await axios.get(API_URL, {
    headers: { Accept: "application/json" }
  });

  return response.data.Entity;
};



// ===============================
// 🚇 1️⃣ Listar estaciones
// ===============================
app.get("/estaciones", async (req, res) => {
  try {
    const data = await getData();
    const estacionesSet = new Set();

    data.forEach(entidad => {
      entidad.Linea.Estaciones.forEach(est => {
        estacionesSet.add(est.stop_name);
      });
    });

    res.json([...estacionesSet].sort());

  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      error: "Error obteniendo estaciones",
      detalle: error.message
    });
  }
});



// ===============================
// 🚇 2️⃣ Próximos 3 servicios
// ===============================
app.get("/proximos/:estacion", async (req, res) => {
  try {
    const estacionBuscada = req.params.estacion.toLowerCase();
    const data = await getData();

    // ⚠ IMPORTANTE → trabajar en segundos
    const ahora = Math.floor(Date.now() / 1000);

    let llegadas = [];

    data.forEach(entidad => {
      entidad.Linea.Estaciones.forEach(est => {
        if (est.stop_name.toLowerCase() === estacionBuscada) {

          if (est.arrival.time > ahora) {
            llegadas.push({
              linea: entidad.Linea.Route_Id,
              trip: entidad.Linea.Trip_Id,
              llegada_timestamp: est.arrival.time,
              llegada: formatearHora(est.arrival.time),
              demora_minutos: Math.floor(est.arrival.delay / 60)
            });
          }

        }
      });
    });

// ordenar por llegada
llegadas.sort((a, b) => a.llegada_timestamp - b.llegada_timestamp);

// eliminar duplicados por timestamp
const unicos = [];
const timestampsVistos = new Set();

llegadas.forEach(item => {
  if (!timestampsVistos.has(item.llegada_timestamp)) {
    timestampsVistos.add(item.llegada_timestamp);
    unicos.push(item);
  }
});

res.json(unicos.slice(0, 3));


  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      error: "Error obteniendo próximos servicios",
      detalle: error.message
    });
  }
});

app.get("/card/:estacion", async (req, res) => {
  try {
    const estacionBuscada = req.params.estacion.toLowerCase();
    const data = await getData();
    const ahora = Math.floor(Date.now() / 1000);
const estacionesSet = new Set();
    data.forEach(entidad => {
      entidad.Linea.Estaciones.forEach(est => {
        estacionesSet.add(est.stop_name);
      });
    });
    const estaciones = [...estacionesSet].sort();
    let llegadas = [];

    data.forEach(entidad => {
      entidad.Linea.Estaciones.forEach(est => {
        if (est.stop_name.toLowerCase() === estacionBuscada) {
          if (est.arrival.time > ahora) {
            const minutos = Math.floor((est.arrival.time - ahora) / 60);

const cabecera = entidad.Linea.Estaciones[
  entidad.Linea.Estaciones.length - 1
].stop_name;

llegadas.push({
  linea: entidad.Linea.Route_Id,
  llegada: formatearHora(est.arrival.time),
  minutos,
  sentido: entidad.Linea.Direction_ID,
  cabecera
});


          }
        }
      });
    });

    llegadas.sort((a, b) => a.minutos - b.minutos);
const sentido0 = llegadas
  .filter(s => s.sentido === 0)
  .slice(0, 3);

const sentido1 = llegadas
  .filter(s => s.sentido === 1)
  .slice(0, 3);
const cabecera0 = sentido0[0]?.cabecera || "Sin servicio";
const cabecera1 = sentido1[0]?.cabecera || "Sin servicio";

    const top3 = llegadas.slice(0, 3);

    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Subte - ${req.params.estacion}</title>
<style>
body {
  font-family: Arial;
  background: linear-gradient(135deg,#1e1e2f,#121220);
  display:flex;
  justify-content:center;
  align-items:center;
  height:100vh;
  margin:0;
  color:white;
}
.card {
  background:#1f1f2e;
  padding:25px;
  border-radius:20px;
  width:400px;
  box-shadow:0 10px 30px rgba(0,0,0,0.5);
}
.title {
  font-size:22px;
  text-align:center;
  margin-bottom:15px;
}
.section {
  margin-top:15px;
}
.section h3 {
  font-size:14px;
  opacity:0.7;
  margin-bottom:10px;
}
.service {
  display:flex;
  justify-content:space-between;
  padding:8px 0;
}
.min {
  font-weight:bold;
  color:#00ff99;
}
</style>
</head>
<body>
  <!-- SELECTOR DE ESTACIÓN -->
  <select onchange="cambiarEstacion(this.value)">
    ${estaciones.map(e => `
      <option value="${e}" 
        ${e.toLowerCase() === req.params.estacion.toLowerCase() ? "selected" : ""}>
        ${e}
      </option>
    `).join("")}
  </select>
<div class="card">
  <div class="title">🚇 ${req.params.estacion}</div>

  <div class="section">
    <h3>→ Hacia ${cabecera0}</h3>
    ${sentido0.map(s => `
      <div class="service">
        <div>${s.llegada}</div>
        <div class="min">${s.minutos} min</div>
      </div>
    `).join("") || "Sin servicios"}
  </div>

  <div class="section">
    <h3>→ Hacia ${cabecera1}</h3>
    ${sentido1.map(s => `
      <div class="service">
        <div>${s.llegada}</div>
        <div class="min">${s.minutos} min</div>
      </div>
    `).join("") || "Sin servicios"}
  </div>

</div>

<script>
function cambiarEstacion(est) {
  window.location.href = "/card/" + encodeURIComponent(est);
}
</script>
</body>
</html>
`);


  } catch (error) {
    res.status(500).send("Error generando card");
  }
});



app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
