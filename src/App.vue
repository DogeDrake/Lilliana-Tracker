<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { leerSheet, escribirPartida } from "./services/sheets";

// --- ESTADO ---
const jugadorActivo = ref("jugador1");
const partidas = ref([]);
const cargando = ref(true);
const enviando = ref(false);

// --- FORMULARIO ---
const mazoYo = ref("");
const mazoGanador = ref("");

let ultimaPeticionId = 0;
// --- LÓGICA DE CARGA ---
async function cargarDatos() {
  cargando.value = true;

  // Creamos un ID único para esta petición actual
  const idActual = ++ultimaPeticionId;
  const jugadorAlLanzar = jugadorActivo.value;

  console.log(`%c[Vue] Cargando datos de ${jugadorAlLanzar}...`, "color: #3b82f6");

  try {
    const data = await leerSheet(jugadorAlLanzar);

    // VERIFICACIÓN MÁGICA:
    // Si el idActual no es igual al ultimaPeticionId, significa que 
    // el usuario ha cambiado de pestaña mientras esta petición volaba.
    // Ignoramos el resultado para no sobreescribir con datos viejos.
    if (idActual !== ultimaPeticionId) {
      console.warn(`[Vue] Petición de ${jugadorAlLanzar} descartada (concurrencia).`);
      return;
    }

    partidas.value = Array.isArray(data) ? data : [];
  } catch (error) {
    if (idActual === ultimaPeticionId) {
      console.error("Error:", error);
      partidas.value = [];
    }
  } finally {
    if (idActual === ultimaPeticionId) {
      cargando.value = false;
    }
  }
}

watch(jugadorActivo, () => {
  partidas.value = []; // Limpiamos la tabla inmediatamente al cambiar de pestaña
  cargarDatos();
});

// --- ENVÍO DE DATOS ---
async function handleSumit() {
  if (!mazoYo.value || !mazoGanador.value) return;
  enviando.value = true;

  const timeout = setTimeout(() => {
    if (enviando.value) {
      enviando.value = false;
      alert("Google Sheets está tardando. Los datos podrían haberse guardado, verifica en unos segundos.");
    }
  }, 10000);

  try {
    const res = await escribirPartida(jugadorActivo.value, {
      yo: mazoYo.value,
      ganador: mazoGanador.value
    });

    if (res.success) {
      mazoYo.value = "";
      mazoGanador.value = "";
      clearTimeout(timeout);
      setTimeout(async () => {
        await cargarDatos();
        enviando.value = false;
      }, 2500);
    }
  } catch (err) {
    clearTimeout(timeout);
    enviando.value = false;
    alert("Error de conexión.");
  }
}

const partidasFiltradas = computed(() => {
  return partidas.value.filter(p => {
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
    <div class="app-container">

      <nav class="player-selector">
        <button :class="{ active: jugadorActivo === 'jugador1' }" @click="jugadorActivo = 'jugador1'">
          🧙‍♂️ Alvaro
        </button>
        <button :class="{ active: jugadorActivo === 'jugador2' }" @click="jugadorActivo = 'jugador2'">
          ⚔️ Hector
        </button>
      </nav>

      <header>
        <div class="header-info">
          <h1>{{ jugadorActivo === 'jugador1' ? 'Mazos Alvaro' : 'Mazos Hector' }}</h1>
          <p v-if="!cargando" class="count-badge">{{ partidasFiltradas.length }} duelos registrados</p>
        </div>
        <button @click="cargarDatos" class="btn-refresh" :disabled="cargando">
          <span v-if="!cargando">🔄 Sincronizar</span>
          <span v-else>Cargando...</span>
        </button>
      </header>

      <section class="card-form">
        <h2>Nuevo Registro</h2>
        <div class="form-group">
          <div class="input-field">
            <label>Mazo usado</label>
            <input v-model="mazoYo" placeholder="Ej: Emmara" :disabled="enviando" @keyup.enter="handleSumit" />
          </div>
          <div class="input-field">
            <label>Mazo ganador</label>
            <input v-model="mazoGanador" placeholder="Ej: Kaalia" :disabled="enviando" @keyup.enter="handleSumit" />
          </div>
          <button @click="handleSumit" :disabled="enviando" class="btn-send">
            {{ enviando ? '...' : 'Registrar' }}
          </button>
        </div>
      </section>

      <div class="table-wrapper">
        <div v-if="cargando" class="loading-state">
          <div class="spinner"></div>
          <p>Leyendo grimorio de datos...</p>
        </div>

        <table v-else-if="partidasFiltradas.length > 0">
          <thead>
            <tr>
              <th>G#</th>
              <th>Mazo</th>
              <th>Resultado</th>
              <th>Acc. WR</th>
              <th>WR Global</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, index) in partidasFiltradas" :key="index">
              <td>{{ p.game || index + 1 }}</td>
              <td class="bold">{{ p.deck || p.Deck }}</td>
              <td>
                <span :class="['badge', (p.win == 1) ? 'win' : 'loss']">
                  {{ (p.win == 1) ? 'Victoria' : 'Derrota' }}
                </span>
              </td>
              <td class="mono accent">{{ formatPct(p.acc_wr || p.Acc_wr) }}</td>
              <td class="mono">{{ formatPct(p.wr || p.Wr) }}</td>
            </tr>
          </tbody>
        </table>

        <div v-else class="empty-state">
          <p>No hay registros en este plano.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 1. FONDO Y CONTENEDOR DINÁMICO */
.main-background {
  min-height: 100vh;
  width: 100%;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #f8fafc;
  background: linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.95)),
    url('./assets/Backgound.jpg') center/cover no-repeat fixed;
  padding: 2rem 0;
}

.app-container {
  /* En lugar de un ancho fijo, usamos el 95% de tu pantalla */
  width: 95%;
  max-width: 1600px;
  /* Límite máximo para pantallas ultra-wide */
  margin: 0 auto;
}

/* 2. SELECTOR DE JUGADOR */
.player-selector {
  display: flex;
  gap: 15px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(15px);
  padding: 10px;
  border-radius: 24px;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.player-selector button {
  flex: 1;
  padding: 16px;
  border: none;
  border-radius: 18px;
  background: transparent;
  color: #94a3b8;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1.1rem;
}

.player-selector button.active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
}

header h1 {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 900;
  background: linear-gradient(to right, #ffffff, #60a5fa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.card-form h2 {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #3b82f6;
  margin-bottom: 2rem;
  font-weight: 900;
}

.form-group {
  display: flex;
  /* Espaciado masivo entre inputs para que no se peguen */
  gap: 3rem;
  align-items: flex-end;
}

.input-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  /* Espacio entre etiqueta e input */
}

.input-field label {
  font-size: 0.8rem;
  font-weight: 800;
  color: #94a3b8;
  padding-left: 5px;
}

input:focus {
  outline: none;
  border-color: #3b82f6;
  background: #0f172a;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
}

.btn-send {
  background: #10b981;
  color: white;
  border: none;
  height: 62px;
  /* Botón imponente */
  padding: 0 50px;
  border-radius: 16px;
  font-weight: 900;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn-send:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-3px);
  box-shadow: 0 15px 30px rgba(16, 185, 129, 0.4);
}

/* 5. TABLA EXPANDIDA */
.table-wrapper {
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(12px);
  border-radius: 30px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  background: rgba(0, 0, 0, 0.4);
  padding: 22px 30px;
  text-align: left;
  font-size: 0.85rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

td {
  padding: 22px 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  font-size: 1.1rem;
}

tr:hover td {
  background: rgba(255, 255, 255, 0.03);
}

/* 6. DETALLES VISUALES */
.bold {
  font-weight: 700;
  color: #fff;
}

.mono {
  font-family: 'JetBrains Mono', monospace;
}

.accent {
  color: #60a5fa;
  font-weight: 800;
}

.badge {
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 900;
}

.win {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.loss {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

/* 7. RESPONSIVIDAD */
@media (max-width: 1100px) {
  .form-group {
    gap: 1.5rem;
  }
}

@media (max-width: 850px) {
  .form-group {
    flex-direction: column;
    align-items: stretch;
  }

  header {
    flex-direction: column;
    gap: 2rem;
    text-align: center;
  }
}

/* --- AJUSTES PARA EL FORMULARIO --- */
.card-form {
  background: rgba(30, 41, 59, 0.5);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 2.5rem;
  border-radius: 30px;
  margin-bottom: 3rem;
  box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.6);

  /* CRÍTICO: Asegura que el padding no estire el cuadro */
  box-sizing: border-box;
  max-width: 100%;
}

input {
  width: 100%;
  /* Usamos box-sizing para que el padding 22px se quede DENTRO del 100% */
  box-sizing: border-box;
  padding: 18px 22px;
  background: rgba(15, 23, 42, 0.8);
  border: 2px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  color: white;
  font-size: 1.1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  /* Evita que el zoom automático de iPhone al enfocar rompa el layout */
  appearance: none;
}

/* --- RESPONSIVIDAD MEJORADA --- */
@media (max-width: 850px) {
  .app-container {
    width: 92%;
    /* Un poco más de margen en los bordes del móvil */
  }

  .card-form {
    padding: 1.5rem;
    /* Reducimos padding interno para ganar espacio */
  }

  .form-group {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
    /* Menos espacio entre inputs en móvil */
  }

  header h1 {
    font-size: 1.8rem;
    /* Título un poco más pequeño para que no rompa */
  }

  /* Ajustamos la tabla para que se pueda deslizar lateralmente si es muy ancha */
  .table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  td,
  th {
    padding: 15px 12px;
    /* Reducimos espacio en celdas para móvil */
    font-size: 0.9rem;
  }
}

/* Fix extra para móviles muy pequeños (iPhone SE, etc) */
@media (max-width: 400px) {
  .player-selector {
    flex-direction: column;
    gap: 8px;
  }

  .btn-send {
    padding: 0 20px;
    height: 55px;
  }
}
</style>