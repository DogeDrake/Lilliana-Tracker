<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// --- CONFIGURACIÓN ---
const gameStarted = ref(false)
const numPlayers = ref(4)
const startingLife = ref(40)

// --- ESTADO DEL JUEGO ---
const players = ref([])

const startGame = () => {
    players.value = Array.from({ length: numPlayers.value }, (_, i) => ({
        id: i + 1,
        name: `JUGADOR ${i + 1}`,
        life: startingLife.value,
        color: getPlayerColor(i)
    }))
    gameStarted.value = true
}

const getPlayerColor = (i) => {
    const colors = ['#b91c1c', '#1d4ed8', '#047857', '#b45309']
    return colors[i]
}

const updateLife = (index, amount) => {
    players.value[index].life += amount
}

const resetGame = () => {
    if (confirm("¿Reiniciar partida?")) {
        gameStarted.value = false
    }
}

const goBack = () => router.push('/')
</script>

<template>
    <div class="life-counter-root">
        <div v-if="!gameStarted" class="setup-screen fade-in">
            <div class="setup-container">
                <h2 class="setup-title">LILLIANA TRACKER</h2>
                <div class="setup-group">
                    <label>Jugadores</label>
                    <div class="selector-row">
                        <button v-for="n in [2, 3, 4]" :key="n" @click="numPlayers = n"
                            :class="{ active: numPlayers === n }">{{ n }}</button>
                    </div>
                </div>
                <div class="setup-group">
                    <label>Vidas Iniciales</label>
                    <div class="selector-row">
                        <button v-for="l in [20, 30, 40]" :key="l" @click="startingLife = l"
                            :class="{ active: startingLife === l }">{{ l }}</button>
                    </div>
                </div>
                <div class="setup-actions">
                    <button @click="startGame" class="start-btn">COMENZAR PARTIDA</button>
                    <button @click="goBack" class="back-btn">VOLVER AL INICIO</button>
                </div>
            </div>
        </div>

        <div v-else class="game-board" :class="[`players-${numPlayers}`]">
            <div v-for="(player, index) in players" :key="player.id" class="player-zone"
                :style="{ '--player-color': player.life > 0 ? player.color : '#111' }"
                :class="{ 'is-dead': player.life <= 0 }">

                <div class="player-container-inner">
                    <div class="life-interface-wrapper">

                        <div class="hitbox minus-box" @click="updateLife(index, -1)">
                            <div class="ripple"></div>
                            <span class="hit-symbol">−</span>
                        </div>

                        <div class="life-display-block">
                            <span class="player-name">{{ player.name }}</span>

                            <div v-if="player.life > 0" class="life-text-container">
                                <span class="life-number">{{ player.life }}</span>
                            </div>

                            <div v-else class="dead-ui fade-in">
                                <span class="death-icon">💀</span>
                                <button @click="updateLife(index, 1)" class="undo-btn">DESHACER</button>
                            </div>
                        </div>

                        <div class="hitbox plus-box" @click="updateLife(index, 1)">
                            <div class="ripple"></div>
                            <span class="hit-symbol">+</span>
                        </div>

                    </div>
                </div>
            </div>

            <button @click="resetGame" class="floating-menu-btn">
                <span class="icon">⚙️</span>
            </button>
        </div>
    </div>
</template>

<style scoped>
.life-counter-root {
    width: 100dvw;
    height: 100dvh;
    background: #000;
    color: white;
    overflow: hidden;
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}

.game-board {
    display: grid;
    width: 100%;
    height: 100%;
    position: relative;
}

/* GRIDS */
.players-2 {
    grid-template-rows: 1fr 1fr;
}

.players-2 .player-zone:nth-child(1) .player-container-inner {
    transform: rotate(180deg);
}

.players-3 {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
}

.players-3 .player-zone:nth-child(1) {
    grid-column: span 2;
}

.players-3 .player-zone:nth-child(1) .player-container-inner {
    transform: rotate(180deg);
}

.players-4 {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
}

/* ROTACIONES MODO MESA */
@media (orientation: portrait) {

    .players-4 .player-zone:nth-child(odd) .player-container-inner,
    .players-3 .player-zone:nth-child(2) .player-container-inner {
        transform: rotate(90deg);
    }

    .players-4 .player-zone:nth-child(even) .player-container-inner,
    .players-3 .player-zone:nth-child(3) .player-container-inner {
        transform: rotate(-90deg);
    }
}

@media (orientation: landscape) {

    .players-4 .player-zone:nth-child(1) .player-container-inner,
    .players-4 .player-zone:nth-child(2) .player-container-inner {
        transform: rotate(180deg);
    }
}

.player-zone {
    position: relative;
    overflow: hidden;
    background-color: var(--player-color);
    border: 0.5px solid rgba(0, 0, 0, 0.15);
    transition: background-color 0.4s ease;
}

.player-container-inner {
    width: 100%;
    height: 100%;
}

.life-interface-wrapper {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
}

/* --- PASTILLAS --- */
.hitbox {
    position: relative;
    width: 28%;
    height: 30%;
    background-color: rgba(255, 255, 255, 0.12);
    border-radius: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    overflow: hidden;
    z-index: 5;
}

.hitbox:active {
    background-color: rgba(255, 255, 255, 0.25);
    transform: scale(0.96);
}

.hit-symbol {
    font-size: clamp(2rem, 5vw, 4rem);
    font-weight: 300;
}

/* --- RIPPLES UNIFICADOS (ANCHOTES Y SIEMPRE IGUALES) --- */
.ripple {
    position: absolute;
    width: 200%;
    /* Muy ancho para cubrir toda la pastilla */
    aspect-ratio: 1;
    background: white;
    opacity: 0;
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0);
    pointer-events: none;
}

.hitbox:active .ripple {
    animation: big-ripple 0.4s ease-out;
}

@keyframes big-ripple {
    0% {
        transform: translate(-50%, -50%) scale(0);
        opacity: 0.3;
    }

    100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 0;
    }
}

/* --- BLOQUE CENTRAL --- */
.life-display-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    pointer-events: none;
    margin: 50px;
    position: relative;
}

.player-name {
    position: absolute;
    top: -10%;
    font-size: 0.7rem;
    font-weight: 800;
    opacity: 0.4;
    text-transform: uppercase;
}

.life-number {
    font-size: clamp(4rem, 22vw, 11rem);
    font-weight: 950;
    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    line-height: 1;
}

/* --- OTROS ELEMENTOS --- */
.floating-menu-btn {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 48px;
    height: 48px;
    background: #000;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
}

.is-dead {
    filter: grayscale(1) brightness(0.12);
}

.dead-ui {
    text-align: center;
    pointer-events: auto;
}

.death-icon {
    font-size: 3.5rem;
    display: block;
    margin-bottom: 0.5rem;
}

.undo-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1.5px solid white;
    color: white;
    padding: 8px 18px;
    border-radius: 20px;
    font-weight: 800;
    font-size: 0.75rem;
}

.setup-screen {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f172a;
}

.setup-container {
    width: 85%;
    max-width: 420px;
    text-align: center;
}

.setup-title {
    font-weight: 950;
    color: #3b82f6;
    margin-bottom: 2rem;
    font-size: 2.2rem;
}

.selector-row {
    display: flex;
    gap: 10px;
    margin-bottom: 2rem;
}

.selector-row button {
    flex: 1;
    padding: 1.2rem;
    border-radius: 12px;
    background: #1e293b;
    color: white;
    border: none;
    font-weight: 800;
}

.selector-row button.active {
    background: #3b82f6;
}

.start-btn {
    width: 100%;
    padding: 1.3rem;
    border-radius: 14px;
    background: #3b82f6;
    color: white;
    border: none;
    font-weight: 900;
}

.fade-in {
    animation: fadeIn 0.4s ease-out forwards;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: scale(0.97);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}
</style>