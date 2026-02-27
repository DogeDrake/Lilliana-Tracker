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
          <p class="count-badge">{{ partidasFiltradas.length }} duelos</p>
        </div>
        <button @click="cargarDatos" class="btn-refresh" :disabled="cargando">
          <span :class="{ spinning: cargando }">🔄</span>
        </button>
      </header>

      <section class="card-form">
        <div class="form-group">
          <div class="input-field">
            <label>Mazo usado</label>
            <input v-model="mazoYo" placeholder="Emmara..." :disabled="enviando" @keyup.enter="handleSumit" />
          </div>
          <div class="input-field">
            <label>Mazo ganador</label>
            <input v-model="mazoGanador" placeholder="Kaalia..." :disabled="enviando" @keyup.enter="handleSumit" />
          </div>
          <button @click="handleSumit" :disabled="enviando" class="btn-send">
            {{ enviando ? '...' : 'Registrar' }}
          </button>
        </div>
      </section>

      <div class="table-wrapper">
        <div v-if="cargando" class="skeleton-container">
          <div v-for="i in 5" :key="i" class="skeleton-row"></div>
        </div>

        <table v-else-if="partidasFiltradas.length > 0">
          <thead>
            <tr>
              <th class="col-id">#</th>
              <th>Mazo</th>
              <th class="col-res">Res</th>
              <th class="col-pct">WR</th>
              <th class="hide-mobile col-pct">Global</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, index) in partidasFiltradas" :key="index">
              <td class="mono col-id">{{ p.game || (partidasFiltradas.length - index) }}</td>
              <td class="bold deck-column">{{ p.deck || p.Deck }}</td>
              <td class="col-res">
                <div class="status-cell" :class="(p.win == 1) ? 'win-text' : 'loss-text'">
                  <span :class="['dot', (p.win == 1) ? 'win' : 'loss']"></span>
                  <span>{{ (p.win == 1) ? 'V' : 'D' }}</span>
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

<style>
/* Reset crítico: elimina cualquier borde externo */
body,
html {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  background-color: #0f172a;
}
</style>

<style scoped>
/* 1. ESTRUCTURA DE PANTALLA COMPLETA */
.main-background {
  min-height: 100vh;
  width: 100vw;
  font-family: 'Inter', system-ui, sans-serif;
  color: #f8fafc;
  background: linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.95)),
    url('./assets/Backgound.jpg') center/cover no-repeat fixed;
  padding-bottom: 2rem;
}

.app-container {
  width: 100%;
  max-width: 1250px;
  margin: 0 auto;
}

/* 2. CABECERA Y SELECTOR (SIN MÁRGENES LATERALES EN MÓVIL) */
.player-selector {
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.player-selector button {
  flex: 1;
  padding: 12px;
  border: none;
  background: transparent;
  color: #64748b;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
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
  padding: 1.5rem 1rem;
}

header h1 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 900;
  color: white;
}

/* 3. FORMULARIO COMPACTO */
.card-form {
  background: rgba(30, 41, 59, 0.5);
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.form-group {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  color: white;
}

.btn-send {
  height: 45px;
  background: #10b981;
  border-radius: 8px;
  border: none;
  color: white;
  font-weight: 900;
}

/* 4. TABLA DE ANCHO TOTAL (ZERO MARGINS) */
.table-wrapper {
  width: 100%;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(10px);
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  /* Crucial para evitar scroll */
}

th,
td {
  padding: 12px 8px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.85rem;
}

/* Columnas optimizadas */
.col-id {
  width: 35px;
  color: #64748b;
}

.col-res {
  width: 45px;
}

.col-pct {
  width: 60px;
  text-align: right;
}

.deck-column {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Puntos de victoria/derrota */
.status-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 800;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot.win {
  background: #34d399;
  box-shadow: 0 0 8px #34d399;
}

.dot.loss {
  background: #f87171;
  box-shadow: 0 0 8px #f87171;
}

.win-text {
  color: #34d399;
}

.loss-text {
  color: #f87171;
}

.mono {
  font-family: 'JetBrains Mono', monospace;
}

.accent {
  color: #60a5fa;
  font-weight: bold;
}

/* 5. DISEÑO ESCRITORIO */
@media (min-width: 768px) {
  .app-container {
    padding: 1rem;
    width: 94%;
  }

  .player-selector {
    border-radius: 12px;
    margin-bottom: 1rem;
  }

  .card-form {
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .table-wrapper {
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .form-group {
    grid-template-columns: 1fr 1fr auto;
  }

  header h1 {
    font-size: 2.5rem;
  }

  th,
  td {
    padding: 1rem 1.5rem;
    font-size: 1rem;
  }

  .col-id {
    width: 60px;
  }

  .col-res {
    width: 120px;
  }

  .col-pct {
    width: 100px;
  }

  .status-cell span:last-child::after {
    content: "ictoria";
  }

  /* Truco CSS */
  .loss-text span:last-child::after {
    content: "errota";
  }
}

/* Animaciones */
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
</style>