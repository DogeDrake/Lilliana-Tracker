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
        color: getPlayerColor(i),
        activeSide: null // Para controlar el ripple manual
    }))
    gameStarted.value = true
}

const getPlayerColor = (i) => {
    const colors = ['#b91c1c', '#1d4ed8', '#047857', '#b45309']
    return colors[i]
}

// --- LÓGICA DE TOQUE MEJORADA ---
const triggerRipple = (index, side, amount) => {
    players.value[index].life += amount
    players.value[index].activeSide = side

    // Quitamos la clase después de la animación
    setTimeout(() => {
        players.value[index].activeSide = null
    }, 300)
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
                <button @click="startGame" class="start-btn">COMENZAR PARTIDA</button>
            </div>
        </div>

        <div v-else class="game-board" :class="[`players-${numPlayers}`]">
            <div v-for="(player, index) in players" :key="player.id" class="player-zone"
                :style="{ '--player-color': player.life > 0 ? player.color : '#111' }"
                :class="{ 'is-dead': player.life <= 0 }">

                <div class="player-container-inner">
                    <div class="life-interface-wrapper">

                        <div class="hitbox" @touchstart.prevent="triggerRipple(index, 'minus', -1)"
                            @mousedown="triggerRipple(index, 'minus', -1)">
                            <div class="ripple" :class="{ 'animate': player.activeSide === 'minus' }"></div>
                            <span class="hit-symbol">−</span>
                        </div>

                        <div class="life-display-block">
                            <span class="player-name">{{ player.name }}</span>
                            <div v-if="player.life > 0" class="life-text-container">
                                <span class="life-number">{{ player.life }}</span>
                            </div>
                            <div v-else class="dead-ui">
                                <span class="death-icon">💀</span>
                                <button @click="player.life = 1" class="undo-btn">REVIVIR</button>
                            </div>
                        </div>

                        <div class="hitbox" @touchstart.prevent="triggerRipple(index, 'plus', 1)"
                            @mousedown="triggerRipple(index, 'plus', 1)">
                            <div class="ripple" :class="{ 'animate': player.activeSide === 'plus' }"></div>
                            <span class="hit-symbol">+</span>
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
    font-family: 'Inter', sans-serif;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
}

.game-board {
    display: grid;
    width: 100%;
    height: 100%;
}

.players-2 {
    grid-template-rows: 1fr 1fr;
}

.players-2 .player-zone:nth-child(1) {
    transform: rotate(180deg);
}

.players-4 {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
}

/* Rotación dinámica para tablets/móviles en mesa */
@media (orientation: portrait) {
    .players-4 .player-zone:nth-child(odd) {
        transform: rotate(90deg);
    }

    .players-4 .player-zone:nth-child(even) {
        transform: rotate(-90deg);
    }
}

.player-zone {
    position: relative;
    overflow: hidden;
    background-color: var(--player-color);
    transition: background-color 0.4s ease;
    border: 0.5px solid rgba(0, 0, 0, 0.2);
}

.player-container-inner,
.life-interface-wrapper {
    width: 100%;
    height: 100%;
}

.life-interface-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

/* --- BOTONES (PASTILLAS) --- */
.hitbox {
    position: relative;
    width: 35%;
    height: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 5;
    overflow: hidden;
}

.hit-symbol {
    font-size: 5rem;
    font-weight: 200;
    pointer-events: none;
    z-index: 10;
    opacity: 0.8;
}

/* --- RIPPLE MEJORADO PARA MÓVIL --- */
.ripple {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 150vmax;
    height: 150vmax;
    /* Tamaño masivo basado en la pantalla */
    background: rgba(255, 255, 255, 0.35);
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    pointer-events: none;
    will-change: transform, opacity;
}

.ripple.animate {
    animation: rapid-ripple 0.35s cubic-bezier(0, 0, 0.2, 1);
}

@keyframes rapid-ripple {
    0% {
        transform: translate(-50%, -50%) scale(0);
        opacity: 0.6;
    }

    100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 0;
    }
}

/* --- BLOQUE CENTRAL --- */
.life-display-block {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 2;
    margin: 0 10px;
}

.life-number {
    font-size: clamp(5rem, 25vw, 12rem);
    font-weight: 900;
    line-height: 1;
    text-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.player-name {
    font-size: 0.8rem;
    font-weight: 800;
    opacity: 0.5;
    text-transform: uppercase;
    letter-spacing: 2px;
}

/* --- MENÚ Y SETUP --- */
.floating-menu-btn {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #000;
    border: 2px solid rgba(255, 255, 255, 0.2);
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

.setup-container {
    width: 80%;
    text-align: center;
}

.setup-title {
    font-size: 2.5rem;
    font-weight: 900;
    color: #3b82f6;
    margin-bottom: 30px;
}

.selector-row {
    display: flex;
    gap: 10px;
    margin-bottom: 25px;
}

.selector-row button {
    flex: 1;
    padding: 15px;
    border-radius: 12px;
    background: #1e293b;
    color: white;
    border: none;
    font-weight: 800;
}

.selector-row button.active {
    background: #3b82f6;
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
}

.start-btn {
    width: 100%;
    padding: 20px;
    border-radius: 15px;
    background: #3b82f6;
    color: white;
    font-weight: 900;
    border: none;
    font-size: 1.2rem;
}

.fade-in {
    animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}
</style>