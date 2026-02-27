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
              <th class="col-id">#</th>
              <th>MAZO</th>
              <th class="col-res">RES</th>
              <th class="col-pct">WR</th>
              <th class="hide-mobile col-pct">GLOBAL</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, index) in partidasFiltradas" :key="index">
              <td class="mono col-id">#{{ p.game || (partidasFiltradas.length - index) }}</td>
              <td class="bold deck-name">{{ p.deck || p.Deck }}</td>
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
/* 1. FIX DE DESBORDAMIENTO GLOBAL */
*,
*::before,
*::after {
  box-sizing: border-box;
  /* Evita que el padding sume ancho al elemento */
}

body,
html {
  margin: 0;
  padding: 0;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  /* Prohibido el scroll lateral */
  background-color: #0f172a;
}
</style>

<style scoped>
/* 2. ESTRUCTURA */
.main-background {
  min-height: 100vh;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  font-family: 'Inter', system-ui, sans-serif;
  color: #f8fafc;
  background: linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.95)),
    url('./assets/Backgound.jpg') center/cover no-repeat fixed;
  padding-bottom: 2rem;
}

.app-container {
  width: 100%;
  margin: 0;
  padding: 0;
}

/* 3. CABECERAS RESALTADAS */
thead tr {
  background: rgba(0, 0, 0, 0.6);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

th {
  padding: 12px 10px;
  color: #94a3b8;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-bottom: 2px solid #3b82f6;
  text-align: left;
}

/* 4. PLAYER SELECTOR (FIJADO AL ANCHO) */
.player-selector {
  display: flex;
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px;
  backdrop-filter: blur(10px);
}

.player-selector button {
  flex: 1;
  padding: 14px;
  border: none;
  background: transparent;
  color: #64748b;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
}

.player-selector button.active {
  background: #3b82f6;
  color: white;
  border-radius: 4px;
}

/* 5. TABLA AJUSTADA AL MILÍMETRO */
.table-wrapper {
  width: 100%;
  overflow-x: hidden;
  /* Seguridad extra */
  background: rgba(15, 23, 42, 0.4);
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  /* Obliga a las celdas a respetar el ancho del dispositivo */
}

td {
  padding: 12px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Anchos fijos para evitar que la tabla "empuje" hacia la derecha */
.col-id {
  width: 40px;
}

.col-res {
  width: 45px;
}

.col-pct {
  width: 60px;
  text-align: right;
}

.deck-name {
  color: #ffffff;
  font-weight: 700;
}

/* 6. RESPONSIVIDAD */
@media (max-width: 768px) {
  .hide-mobile {
    display: none;
  }

  .btn-text {
    font-size: 0.8rem;
  }

  .glass-header h1 {
    font-size: 1.5rem;
  }
}

@media (min-width: 769px) {
  .app-container {
    width: 96%;
    max-width: 1250px;
    margin: 20px auto;
  }

  .col-id {
    width: 70px;
  }

  .col-res {
    width: 100px;
  }

  .col-pct {
    width: 90px;
  }

  .status-cell span:last-child::after {
    content: "ictoria";
  }

  .loss-text span:last-child::after {
    content: "errota";
  }
}

/* Animaciones y estados */
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 4px;
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