<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// --- CONFIGURACIÓN ---
const gameStarted = ref(false)
const numPlayers = ref(4)
const startingLife = ref(40)
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
    if (confirm("¿Reiniciar partida?")) gameStarted.value = false
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
                    <div class="hitbox minus-box" @click="updateLife(index, -1)">
                        <div class="ripple"></div>
                        <span class="hit-symbol">−</span>
                    </div>

                    <div class="hitbox plus-box" @click="updateLife(index, 1)">
                        <div class="ripple"></div>
                        <span class="hit-symbol">+</span>
                    </div>

                    <div class="life-display-block">
                        <span class="player-name">{{ player.name }}</span>
                        <div v-if="player.life > 0">
                            <span class="life-number">{{ player.life }}</span>
                        </div>
                        <div v-else class="dead-ui fade-in">
                            <span class="death-icon">💀</span>
                            <button @click="updateLife(index, 1)" class="undo-btn">DESHACER</button>
                        </div>
                    </div>
                </div>
            </div>

            <button @click="resetGame" class="floating-menu-btn">⚙️</button>
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
    font-family: 'Inter', system-ui;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.game-board {
    display: grid;
    width: 100%;
    height: 100%;
    position: relative;
}

/* GRID CONFIG */
.players-2 {
    grid-template-rows: 1fr 1fr;
}

.players-2 .player-zone:nth-child(1) .player-container-inner {
    transform: rotate(180deg);
}

.players-3,
.players-4 {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
}

.players-3 .player-zone:nth-child(1) {
    grid-column: span 2;
}

.players-3 .player-zone:nth-child(1) .player-container-inner {
    transform: rotate(180deg);
}

/* ROTACIONES MODO MESA */
@media (orientation:portrait) {

    .players-4 .player-zone:nth-child(odd) .player-container-inner,
    .players-3 .player-zone:nth-child(2) .player-container-inner {
        transform: rotate(90deg);
    }

    .players-4 .player-zone:nth-child(even) .player-container-inner,
    .players-3 .player-zone:nth-child(3) .player-container-inner {
        transform: rotate(-90deg);
    }
}

/* ZONA JUGADOR */
.player-zone {
    position: relative;
    overflow: hidden;
    background: var(--player-color);
    border: 0.5px solid rgba(0, 0, 0, 0.2);
    transition: background 0.4s;
}

.player-container-inner {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    /* Centrado absoluto del contenido */
}

/* HITBOXES REFORMADAS (POSICIÓN ABSOLUTA) */
.hitbox {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 30%;
    /* antes 38% */
    height: 50%;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    overflow: hidden;
    z-index: 5;
    transition: transform 0.1s, background 0.2s;
}

.minus-box {
    left: -10%;
}

.plus-box {
    right: -10%;
}

.hitbox:active {
    transform: translateY(-50%) scale(0.92);
    background: rgba(255, 255, 255, 0.25);
}

.hit-symbol {
    font-size: clamp(2.5rem, 5vw, 4rem);
    font-weight: 300;
    pointer-events: none;
}

/* BLOQUE CENTRAL */
.life-display-block {
    text-align: center;
    pointer-events: none;
    z-index: 1;
}

.player-name {
    display: block;
    font-size: 0.7rem;
    font-weight: 800;
    opacity: 0.4;
    margin-bottom: 5px;
    text-transform: uppercase;
}

.life-number {
    font-size: clamp(4.5rem, 18vw, 10rem);
    font-weight: 950;
    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    line-height: 0.9;
}

/* OTROS */
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
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
}

.is-dead {
    filter: grayscale(1) brightness(0.15);
}

.dead-ui {
    text-align: center;
    pointer-events: auto;
}

.death-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
    display: block;
}

.undo-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid white;
    color: white;
    padding: 6px 16px;
    border-radius: 20px;
    font-weight: 800;
    font-size: 0.7rem;
}

/* SETUP */
.setup-screen {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f172a;
}

.setup-container {
    width: 85%;
    max-width: 400px;
    text-align: center;
}

.setup-title {
    font-weight: 950;
    color: #3b82f6;
    margin-bottom: 2rem;
    font-size: 2rem;
}

.selector-row {
    display: flex;
    gap: 10px;
    margin-bottom: 1.5rem;
}

.selector-row button {
    flex: 1;
    padding: 1rem;
    border-radius: 10px;
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
    padding: 1.2rem;
    border-radius: 12px;
    background: #3b82f6;
    color: white;
    border: none;
    font-weight: 900;
    margin-bottom: 10px;
}

.back-btn {
    background: transparent;
    color: #64748b;
    border: none;
    font-size: 0.8rem;
    font-weight: 700;
}

.fade-in {
    animation: fadeIn 0.3s ease-out forwards;
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