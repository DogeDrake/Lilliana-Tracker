<script setup>
import { ref } from 'vue'

const gameStarted = ref(false)
const numPlayers = ref(4)
const startingLife = ref(40)
const players = ref([])
const activeCommanderPanel = ref(null)

const startGame = () => {
    players.value = Array.from({ length: numPlayers.value }, (_, i) => ({
        id: i + 1,
        name: `P${i + 1}`,
        life: startingLife.value,
        poison: 0,
        isMonarch: false,
        commanderDamage: {},
        color: getPlayerColor(i),
        dead: false
    }))
    gameStarted.value = true
}

const getPlayerColor = (i) => {
    const colors = ['#b91c1c', '#1d4ed8', '#047857', '#b45309']
    return colors[i]
}

const checkDeath = (i) => {
    const p = players.value[i]
    const cmdr = Object.values(p.commanderDamage).some(d => d >= 21)
    p.dead = p.life <= 0 || p.poison >= 10 || cmdr
}

const updateLife = (i, a) => {
    players.value[i].life += a
    checkDeath(i)
}

const updatePoison = (i, a) => {
    const p = players.value[i]
    p.poison = Math.max(0, Math.min(10, p.poison + a))
    checkDeath(i)
}

const updateCommanderDamage = (i, opp, a) => {
    const p = players.value[i]
    const cur = p.commanderDamage[opp] || 0
    p.commanderDamage[opp] = Math.max(0, cur + a)
    p.life -= a
    checkDeath(i)
}

const setMonarch = (i) => {
    players.value.forEach((p, x) => p.isMonarch = x === i)
}

const resetGame = () => {
    if (confirm("¿Reiniciar partida?")) gameStarted.value = false
}
</script>

<template>
    <div class="life-counter-root">
        <div v-if="!gameStarted" class="setup-screen">
            <div class="setup-container">
                <h1 class="setup-title">LILLIANA TRACKER</h1>
                <div class="setup-box">
                    <p>Jugadores</p>
                    <div class="selector-row">
                        <button v-for="n in [2, 3, 4]" :key="n" @click="numPlayers = n"
                            :class="{ active: numPlayers === n }">{{ n }}</button>
                    </div>
                    <p>Vida Inicial</p>
                    <div class="selector-row">
                        <button v-for="l in [20, 30, 40]" :key="l" @click="startingLife = l"
                            :class="{ active: startingLife === l }">{{ l }}</button>
                    </div>
                    <button class="start-btn" @click="startGame">EMPEZAR PARTIDA</button>
                </div>
            </div>
        </div>

        <div v-else class="game-board" :class="`players-${numPlayers}`">
            <div v-for="(player, index) in players" :key="player.id" class="player-zone"
                :style="{ '--player-color': !player.dead ? player.color : '#111' }"
                :class="{ 'is-dead': player.dead, 'has-monarch': player.isMonarch }">

                <div class="inner-content-rotator">
                    <div class="interaction-layer">
                        <div class="hitbox minus" @click="updateLife(index, -1)"><span>−</span></div>
                        <div class="hitbox plus" @click="updateLife(index, 1)"><span>+</span></div>
                    </div>

                    <div class="interface-layer">
                        <div class="top-nav">
                            <div class="status-pills">
                                <button class="pill poison-pill" @click.stop="updatePoison(index, 1)"
                                    @contextmenu.prevent="updatePoison(index, -1)">
                                    🧪 {{ player.poison }}
                                </button>
                                <button class="pill cmd-pill" @click.stop="activeCommanderPanel = player.id">⚔️</button>
                            </div>
                            <button class="pill monarch-pill" :class="{ active: player.isMonarch }"
                                @click.stop="setMonarch(index)">
                                👑 <span v-if="player.isMonarch">MONARCA</span>
                            </button>
                        </div>

                        <div class="life-center">
                            <span class="p-tag">{{ player.name }}</span>
                            <span v-if="!player.dead" class="p-life">{{ player.life }}</span>
                            <div v-else class="p-death-msg">
                                💀 <button @click="player.dead = false; player.life = 1">REVIVIR</button>
                            </div>
                        </div>
                        <div class="bottom-safe-area"></div>
                    </div>

                    <div v-if="activeCommanderPanel === player.id" class="cmd-overlay">
                        <div class="cmd-header">
                            <span>Comandante</span>
                            <button class="close-btn" @click="activeCommanderPanel = null">✕</button>
                        </div>
                        <div class="cmd-list">
                            <div v-for="opp in players.filter(p => p.id !== player.id)" :key="opp.id" class="cmd-row">
                                <div class="opp-indicator" :style="{ background: opp.color }"></div>
                                <div class="cmd-actions">
                                    <button @click.stop="updateCommanderDamage(index, opp.id, -1)">−</button>
                                    <span class="cmd-value"
                                        :class="{ danger: (player.commanderDamage[opp.id] || 0) >= 18 }">
                                        {{ player.commanderDamage[opp.id] || 0 }}
                                    </span>
                                    <button @click.stop="updateCommanderDamage(index, opp.id, 1)">+</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <button class="center-menu-btn" @click="resetGame">⚙️</button>
        </div>
    </div>
</template>

<style scoped>
.life-counter-root {
    width: 100dvw;
    height: 100dvh;
    background: #000;
    color: #fff;
    overflow: hidden;
    position: fixed;
    inset: 0;
    font-family: system-ui, -apple-system, sans-serif;
}

.game-board {
    display: grid;
    width: 100%;
    height: 100%;
    position: relative;
}

.players-2 {
    grid-template-rows: 1fr 1fr;
}

.players-3,
.players-4 {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
}

.players-3 .player-zone:first-child {
    grid-column: span 2;
}

.player-zone {
    position: relative;
    background: var(--player-color);
    overflow: hidden;
    border: 0.5px solid rgba(0, 0, 0, 0.2);
}

.inner-content-rotator {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
}

@media (orientation: portrait) {

    .players-4 .player-zone:nth-child(1) .inner-content-rotator,
    .players-4 .player-zone:nth-child(3) .inner-content-rotator,
    .players-3 .player-zone:nth-child(2) .inner-content-rotator {
        width: 50dvh;
        height: 50dvw;
        transform: translate(-50%, -50%) rotate(90deg);
    }

    .players-4 .player-zone:nth-child(2) .inner-content-rotator,
    .players-4 .player-zone:nth-child(4) .inner-content-rotator,
    .players-3 .player-zone:nth-child(3) .inner-content-rotator {
        width: 50dvh;
        height: 50dvw;
        transform: translate(-50%, -50%) rotate(-90deg);
    }

    .players-2 .player-zone:first-child .inner-content-rotator,
    .players-3 .player-zone:first-child .inner-content-rotator {
        transform: translate(-50%, -50%) rotate(180deg);
    }
}

@media (orientation: landscape) {

    .players-4 .player-zone:nth-child(1) .inner-content-rotator,
    .players-4 .player-zone:nth-child(2) .inner-content-rotator,
    .players-2 .player-zone:first-child .inner-content-rotator,
    .players-3 .player-zone:first-child .inner-content-rotator {
        transform: translate(-50%, -50%) rotate(180deg);
    }
}

.interface-layer {
    position: relative;
    z-index: 10;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    padding: 12px;
    pointer-events: none;
    box-sizing: border-box;
}

.top-nav {
    display: flex;
    justify-content: space-between;
    pointer-events: auto;
}

.status-pills {
    display: flex;
    gap: 8px;
}

.pill {
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    border-radius: 8px;
    padding: 6px 12px;
    font-weight: 800;
    font-size: 0.85rem;
    backdrop-filter: blur(8px);
}

.monarch-pill.active {
    background: #eab308;
    color: #000;
    border-color: #fff;
}

.life-center {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.p-tag {
    font-size: 0.7rem;
    font-weight: 900;
    opacity: 0.4;
    letter-spacing: 2px;
}

.p-life {
    font-size: clamp(3rem, 18vh, 10rem);
    font-weight: 900;
    line-height: 1;
}

.interaction-layer {
    position: absolute;
    inset: 0;
    display: flex;
    z-index: 5;
}

.hitbox {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    opacity: 0;
}

/* --- CORRECCIÓN DEL FLEX PARA EL DAÑO DE COMANDANTE --- */
.cmd-actions button:active {
    background: #fff;
    transform: scale(0.95);
}

/* --------------------------------------------------- */

.center-menu-btn {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #000;
    border: 2px solid rgba(255, 255, 255, 0.4);
    color: white;
    z-index: 100;
}

.setup-screen {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f172a;
}

.setup-box {
    background: rgba(255, 255, 255, 0.05);
    padding: 24px;
    border-radius: 24px;
    width: 280px;
    text-align: center;
}

.setup-box p {
    font-size: 0.8rem;
    text-transform: uppercase;
    margin: 16px 0 8px;
    opacity: 0.6;
    font-weight: 800;
}

.selector-row {
    display: flex;
    gap: 8px;
}

.selector-row button {
    flex: 1;
    padding: 12px;
    border-radius: 10px;
    border: none;
    background: #1e293b;
    color: white;
    font-weight: 800;
}

.selector-row button.active {
    background: #3b82f6;
}

.start-btn {
    width: 100%;
    margin-top: 24px;
    padding: 16px;
    border-radius: 12px;
    background: #3b82f6;
    border: none;
    color: white;
    font-weight: 900;
    font-size: 1rem;
}

.is-dead {
    filter: grayscale(1) brightness(0.2);
}

.danger {
    color: #ff4444;
    text-shadow: 0 0 10px rgba(255, 68, 68, 0.4);
}

/* --- OVERLAY DINÁMICO: EVITA EL DESBORDE EN PARTIDAS DE 4 --- */
.cmd-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.96);
    /* Un pelín más oscuro para legibilidad */
    z-index: 50;
    display: flex;
    flex-direction: column;
    padding: 6px;
    /* Reducido para ganar espacio */
    box-sizing: border-box;
}

.cmd-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2px 6px;
    margin-bottom: 4px;
    height: 24px;
    /* Altura fija pequeña para el encabezado */
}

.cmd-header span {
    font-weight: 900;
    font-size: 0.65rem;
    /* Más pequeño para que no empuje las filas */
    text-transform: uppercase;
    opacity: 0.6;
}

.close-btn {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: #fff;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

.cmd-list {
    flex: 1;
    /* Ocupa todo el espacio restante */
    display: flex;
    flex-direction: column;
    gap: 4px;
    /* Espacio mínimo entre filas */
    overflow: hidden;
    /* Evita scroll indeseado */
}

.cmd-row {
    flex: 1;
    /* Las filas se estiran equitativamente */
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.04);
    padding: 0 10px;
    border-radius: 8px;
    min-height: 0;
    /* Permite que la fila encoja si es necesario */
}

.cmd-actions {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 100%;
}

.cmd-actions button {
    width: clamp(32px, 8vh, 48px);
    /* Tamaño dinámico según el alto de pantalla */
    height: clamp(32px, 8vh, 48px);
    border-radius: 8px;
    border: none;
    font-weight: 900;
    font-size: 1.2rem;
    background: #fff;
    color: #000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.cmd-value {
    font-weight: 900;
    font-size: clamp(1rem, 5vh, 1.4rem);
    min-width: 35px;
    text-align: center;
}

.opp-indicator {
    width: 6px;
    height: 70%;
    /* No ocupa todo el alto para verse más estilizado */
    border-radius: 3px;
}
</style>