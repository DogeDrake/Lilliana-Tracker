<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { leerSheet, escribirPartida } from "./services/sheets";

const jugadorActivo = ref("jugador1");
const partidas = ref([]);
const cargando = ref(true);
const enviando = ref(false);
const mazoYo = ref("");
const mazoGanador = ref("");

// Sistema de Notificación
const mensajeStatus = ref({ texto: "", tipo: "", visible: false });

function mostrarNotificacion(texto, tipo = "success") {
  mensajeStatus.value = { texto, tipo, visible: true };
  setTimeout(() => { mensajeStatus.value.visible = false; }, 3000);
}

let ultimaPeticionId = 0;

async function cargarDatos() {
  cargando.value = true;
  const idActual = ++ultimaPeticionId;
  const jugadorAlLanzar = jugadorActivo.value;

  try {
    const data = await leerSheet(jugadorAlLanzar);
    if (idActual !== ultimaPeticionId) return;
    partidas.value = Array.isArray(data) ? data : [];
  } catch (error) {
    if (idActual === ultimaPeticionId) {
      mostrarNotificacion("Error al leer el grimorio", "error");
      partidas.value = [];
    }
  } finally {
    if (idActual === ultimaPeticionId) cargando.value = false;
  }
}

watch(jugadorActivo, () => {
  partidas.value = [];
  cargarDatos();
});

async function handleSumit() {
  if (!mazoYo.value || !mazoGanador.value) {
    mostrarNotificacion("Faltan datos del duelo", "error");
    return;
  }
  enviando.value = true;

  try {
    const res = await escribirPartida(jugadorActivo.value, {
      yo: mazoYo.value,
      ganador: mazoGanador.value
    });

    if (res.success) {
      mazoYo.value = "";
      mazoGanador.value = "";
      mostrarNotificacion("Duelo registrado en el plano");
      setTimeout(cargarDatos, 1500);
    }
  } catch (err) {
    mostrarNotificacion("Fallo en la conexión mágica", "error");
  } finally {
    enviando.value = false;
  }
}

const partidasFiltradas = computed(() => {
  return [...partidas.value].reverse().filter(p => {
    const m = p.deck || p.Deck || p.DECK;
    return m && m.toString().trim() !== "";
  });
});

const formatPct = (val) => {
  if (val === undefined || val === null || isNaN(val)) return "0%";
  return (parseFloat(val) * 100).toFixed(1) + "%";
};

onMounted(cargarDatos);
</script>

<template>
  <div class="main-background">
    <Transition name="fade">
      <div v-if="mensajeStatus.visible" :class="['toast', mensajeStatus.tipo]">
        {{ mensajeStatus.texto }}
      </div>
    </Transition>

    <div class="app-container">
      <nav class="player-selector">
        <button :class="{ active: jugadorActivo === 'jugador1' }" @click="jugadorActivo = 'jugador1'">
          <span class="icon">🦶</span> <span class="btn-text">Presi77</span>
        </button>
        <button :class="{ active: jugadorActivo === 'jugador2' }" @click="jugadorActivo = 'jugador2'">
          <span class="icon">🌳</span> <span class="btn-text">Caramanzana</span>
        </button>
      </nav>

      <header class="glass-header">
        <div class="header-info">
          <h1>{{ jugadorActivo === 'jugador1' ? 'Presi77' : 'Caramanzana' }}</h1>
          <p class="count-badge">{{ cargando ? 'Consultando...' : partidasFiltradas.length + ' duelos' }}</p>
        </div>
        <div class="btn-refresh-wrapper">
          <button @click="cargarDatos" class="btn-refresh" :disabled="cargando">
            <span :class="{ spinning: cargando }">🔄</span>
          </button>
        </div>
      </header>

      <section class="card-form">
        <div class="form-group">
          <div class="input-field">
            <label>Mazo usado</label>
            <input v-model="mazoYo" placeholder="Emmara..." :disabled="enviando" @keyup.enter="handleSumit" />
          </div>
          <div class="input-field">
            <label>Mazo ganador</label>
            <input v-model="mazoGanador" placeholder="Otro..." :disabled="enviando" @keyup.enter="handleSumit" />
          </div>
          <button @click="handleSumit" :disabled="enviando" class="btn-send">
            {{ enviando ? '...' : 'Registrar' }}
          </button>
        </div>
      </section>

      <div class="table-wrapper">
        <div v-if="cargando" class="skeleton-container">
          <div v-for="i in 6" :key="i" class="skeleton-row">
            <div class="skeleton-cell col-id"></div>
            <div class="skeleton-cell col-main"></div>
            <div class="skeleton-cell col-res"></div>
            <div class="skeleton-cell col-pct"></div>
          </div>
        </div>

        <table v-else-if="partidasFiltradas.length > 0">
          <thead>
            <tr>
              <th class="col-id">Nº</th>
              <th class="col-main">MAZO</th>
              <th class="col-res">RESULTADO</th>
              <th class="col-pct">WR</th>
              <th class="hide-mobile col-pct">GLOBAL</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, index) in partidasFiltradas" :key="index">
              <td class="mono col-id">#{{ p.game || (partidasFiltradas.length - index) }}</td>
              <td class="bold deck-name truncate">{{ p.deck || p.Deck }}</td>
              <td class="col-res">
                <div class="status-cell">
                  <span :class="['res-indicator', (p.win == 1) ? 'win-style' : 'loss-style']">
                    {{ (p.win == 1) ? 'V' : 'D' }}
                  </span>
                </div>
              </td>
              <td class="mono accent col-pct">{{ formatPct(p.acc_wr || p.Acc_wr) }}</td>
              <td class="mono hide-mobile col-pct">{{ formatPct(p.wr || p.Wr) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 1. ESTRUCTURA GLOBAL Y CONTENEDORES */
.main-background {
  min-height: 100vh;
  width: 100vw;
  font-family: 'Inter', system-ui, sans-serif;
  color: #f8fafc;
  background: linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.95)),
    url('./assets/Backgound.jpg') center/cover no-repeat fixed;
  padding-bottom: 2rem;
  overflow-x: hidden;
}

.app-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

/* 2. CABECERA Y SELECTOR */
.player-selector {
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px;
  backdrop-filter: blur(10px);
  margin-bottom: 0.5rem;
  margin-top: 2rem;
}

.player-selector button {
  flex: 1;
  padding: 14px;
  border: none;
  background: transparent;
  color: #64748b;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s ease;
}

.player-selector button.active {
  background: #3b82f6;
  color: white;
  border-radius: 8px;
}

.glass-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.2rem;
}

.header-info h1 {
  margin: 0;
  font-size: 1.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-refresh {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* 3. FORMULARIO */
.card-form {
  background: rgba(30, 41, 59, 0.5);
  padding: 1.2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 1rem;
}

.form-group {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.truncate {
  white-space: nowrap;
  /* Evita que salte a la segunda línea */
  overflow: hidden;
  /* Esconde lo que sobra */
  text-overflow: ellipsis;
  /* Añade los "..." */
}

input {
  width: 100%;
  padding: 14px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  color: white;
  box-sizing: border-box;
}

.btn-send {
  height: 50px;
  background: #10b981;
  border-radius: 8px;
  border: none;
  color: white;
  font-weight: 900;
  cursor: pointer;
}

/* 4. TABLA TÉCNICA (Optimización de espacio) */
.table-wrapper {
  background: rgba(15, 23, 42, 0.4);
  margin: 0 0.5rem;
  border-radius: 8px;
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead tr {
  background: rgba(0, 0, 0, 0.5);
}

th {
  padding: 12px 8px;
  color: #94a3b8;
  font-size: 0.65rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-bottom: 2px solid #3b82f6;
  text-align: left;
}

td {
  padding: 10px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.85rem;
  vertical-align: middle;
}

/* Proporciones de columnas en móvil */
.col-id {
  width: 35px;
  color: #475569;
  font-size: 0.75rem;
}

.col-res {
  width: 35px;
  text-align: center;
}

.col-pct {
  width: 55px;
  text-align: right;
}

.col-main {
  text-align: left;
  padding-left: 10px !important;
}

.deck-name {
  color: #ffffff;
  font-weight: 700;
  white-space: normal;
  word-break: break-word;
}

/* 5. DISEÑO DE RESULTADO (PULIDO Y DISCRETO) */
.status-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.res-indicator {
  font-weight: 900;
  font-size: 0.75rem;
  position: relative;
}

/* El punto de luz al lado del texto */
.res-indicator::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: middle;
}

.win-style {
  color: #34d399;
}

.win-style::before {
  background: #34d399;
  box-shadow: 0 0 8px #34d399;
}

.loss-style {
  color: #f87171;
}

.loss-style::before {
  background: #f87171;
  box-shadow: 0 0 8px #f87171;
}

/* 6. ESCRITORIO */
@media (min-width: 768px) {
  .app-container {
    width: 95%;
  }

  .form-group {
    grid-template-columns: 1fr 1fr auto;
    align-items: end;
  }

  .header-info h1 {
    font-size: 2.2rem;
  }
  .res-indicator {
    font-size: 0.85rem;
  }

  .win-style::after {
    content: 'ICTORIA';
  }

  .loss-style::after {
    content: 'ERROTA';
  }

    /* En escritorio quitamos el truncado para que se vea todo */
    .truncate {
      white-space: normal;
      overflow: visible;
      text-overflow: clip;
    }
  
    .col-id {
      width: 70px;
    }
  
    .col-res {
      width: 110px;
    }
  
    .col-pct {
      width: 90px;
    }
  
    /* Aquí sí mostramos la columna global */
    .hide-mobile.col-pct {
      display: table-cell;
    }
}

/* UTILIDADES Y ANIMACIONES */
.mono {
  font-family: 'JetBrains Mono', monospace;
}

.accent {
  color: #60a5fa;
  font-weight: bold;
}

.spinning {
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}


</style>