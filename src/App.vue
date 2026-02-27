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
          <p class="count-badge">{{ partidasFiltradas.length }} duelos registrados</p>
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
              <th class="col-min">#</th>
              <th>Mazo</th>
              <th>Resultado</th>
              <th class="col-pct">WR</th>
              <th class="hide-mobile col-pct">Global</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, index) in partidasFiltradas" :key="index">
              <td class="mono col-min">#{{ p.game || (partidasFiltradas.length - index) }}</td>
              <td class="bold deck-column">{{ p.deck || p.Deck }}</td>
              <td>
                <div class="status-cell" :class="(p.win == 1) ? 'win-text' : 'loss-text'">
                  <span :class="['dot', (p.win == 1) ? 'win' : 'loss']"></span>
                  <span class="status-label">{{ (p.win == 1) ? 'V' : 'D' }}</span>
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
/* Reset global para eliminar rebordes negros */
body,
html {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  background-color: #0f172a;
  /* Color base para evitar destellos blancos */
}

/* 1. BASE Y FONDO */
.main-background {
  min-height: 100vh;
  width: 100vw;
  /* Ancho completo real */
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #f8fafc;
  background: linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.9)),
    url('./assets/Backgound.jpg') center/cover no-repeat fixed;
  padding: 0 0 4rem 0;
  /* Eliminado padding superior */
}

.app-container {
  width: 100%;
  max-width: 1250px;
  margin: 0 auto;
  padding-top: 1rem;
  box-sizing: border-box;
}

/* 2. TABLA ADAPTATIVA (SIN SCROLL HORIZONTAL) */
.table-wrapper {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 0;
  /* En móvil queda mejor sin bordes curvos a los lados */
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
  backdrop-filter: blur(10px);
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  /* Fuerza a la tabla a no estirarse */
}

th,
td {
  padding: 1rem 0.5rem;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Control de anchos de columnas */
.col-min {
  width: 45px;
}

.col-pct {
  width: 65px;
  text-align: right;
}

.deck-column {
  width: auto;
}

/* 3. ESTADOS Y BOTONES */
.status-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 800;
}

.dot {
  height: 8px;
  width: 8px;
  border-radius: 50%;
  flex-shrink: 0;
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

/* 4. RESPONSIVIDAD EXTREMA */
@media (min-width: 768px) {
  .app-container {
    width: 94%;
  }

  .table-wrapper {
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .status-label::after {
    content: "ictoria";
  }

  /* En PC muestra palabra completa */
  .status-label-loss::after {
    content: "errota";
  }

  th,
  td {
    padding: 1.2rem 1.5rem;
  }

  .col-pct {
    width: 100px;
  }
}

@media (max-width: 767px) {
  header h1 {
    font-size: 1.8rem;
    margin-top: 0.5rem;
  }

  .player-selector {
    margin: 0 10px 1.5rem 10px;
  }

  .card-form {
    margin: 0 10px 1.5rem 10px;
    border-radius: 15px;
  }

  /* Ajuste de texto para que no rompa la tabla */
  .deck-column {
    font-size: 0.85rem;
    max-width: 120px;
  }

  .mono {
    font-size: 0.8rem;
  }

  /* Solo mostramos 'V' o 'D' en móvil */
  .status-label {
    font-size: 0.9rem;
  }
}

/* 1. BASE Y FONDO */
.main-background {
  min-height: 100vh;
  width: 100%;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #f8fafc;
  background: linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.9)),
    url('./assets/Backgound.jpg') center/cover no-repeat fixed;
  padding: 1rem 0 4rem 0;
}

.app-container {
  width: 94%;
  max-width: 1250px;
  /* Pantalla más ancha en PC */
  margin: 0 auto;
}

/* 2. CABECERA Y SELECTOR */
.glass-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1rem;
}

header h1 {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 900;
  background: linear-gradient(to right, #ffffff, #60a5fa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.player-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 2rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 6px;
  border-radius: 16px;
  backdrop-filter: blur(10px);
}

.player-selector button {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: #64748b;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.player-selector button.active {
  background: #3b82f6;
  color: white;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

/* 3. FORMULARIO */
.card-form {
  background: rgba(30, 41, 59, 0.7);
  padding: 1.8rem;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 2rem;
  backdrop-filter: blur(10px);
}

.form-group {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 1.5rem;
  align-items: end;
}

.input-field label {
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 8px;
  padding-left: 4px;
}

input {
  width: 100%;
  box-sizing: border-box;
  padding: 14px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 12px;
  color: white;
  font-size: 1rem;
}

.btn-send {
  height: 48px;
  padding: 0 40px;
  background: #10b981;
  border-radius: 12px;
  border: none;
  color: white;
  font-weight: 900;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-send:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-2px);
}

/* 4. TABLA MINIMALISTA */
.table-wrapper {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
  backdrop-filter: blur(10px);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  padding: 1.2rem 1.5rem;
  color: #94a3b8;
  font-size: 0.75rem;
  text-transform: uppercase;
  background: rgba(0, 0, 0, 0.2);
}

td {
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.deck-column {
  font-weight: 700;
  color: #fff;
}

/* Círculos y Textos de Resultado */
.status-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 0.95rem;
}

.dot {
  height: 10px;
  width: 10px;
  border-radius: 50%;
}

.dot.win {
  background: #34d399;
  box-shadow: 0 0 10px #34d399;
}

.dot.loss {
  background: #f87171;
  box-shadow: 0 0 10px #f87171;
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
  font-weight: 800;
}

/* 5. OTROS */
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 1rem 2rem;
  border-radius: 12px;
  z-index: 1000;
  font-weight: bold;
  backdrop-filter: blur(15px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.toast.success {
  background: rgba(16, 185, 129, 0.9);
}

.toast.error {
  background: rgba(239, 68, 68, 0.9);
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

.skeleton-row {
  height: 60px;
  margin: 15px;
  border-radius: 12px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  from {
    background-position: -200% 0;
  }

  to {
    background-position: 200% 0;
  }
}

/* 6. RESPONSIVIDAD */
@media (max-width: 850px) {
  .form-group {
    grid-template-columns: 1fr;
    gap: 1.2rem;
  }

  .btn-send {
    width: 100%;
    height: 55px;
  }

  .glass-header {
    flex-direction: column;
    text-align: center;
    gap: 1.5rem;
  }
}

@media (max-width: 768px) {
  .main-background {
    background-attachment: scroll;
  }

  .hide-mobile {
    display: none;
  }

  .btn-text {
    display: none;
  }

  .icon {
    font-size: 1.5rem;
  }

  td,
  th {
    padding: 1rem;
  }
}
</style>