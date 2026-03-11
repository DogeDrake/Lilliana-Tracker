<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '../supabaseClient'
import { useRouter } from 'vue-router'

const router = useRouter()

// --- WAKE LOCK (Mantener pantalla encendida) ---
const wakeLock = ref(null);

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock.value = await navigator.wakeLock.request('screen');
            console.log('Pantalla siempre encendida activada');
        }
    } catch (err) {
        console.error(`Error al activar Wake Lock: ${err.message}`);
    }
}

function releaseWakeLock() {
    if (wakeLock.value !== null) {
        wakeLock.value.release();
        wakeLock.value = null;
    }
}

const handleVisibilityChange = async () => {
    if (wakeLock.value !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
}

onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
})

onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    releaseWakeLock();
});

// --- ESTADO GLOBAL ---
const gameStarted = ref(false)
const gameOver = ref(false)
const winner = ref(null)
const format = ref('commander') // 'commander' o 'pauper'
const numPlayers = ref(4)
const startingLife = ref(40)

// Variables para el sistema de turnos
const currentPlayerIndex = ref(0)
const isShuffling = ref(false)
const activeCommanderPanel = ref(null)
const loading = ref(false)
const currentUser = ref(null)

// Lógica para pulsación larga
const pressTimer = ref(null)
const isLongPress = ref(false)

// --- CONFIGURACIÓN DE JUGADORES (Setup) ---
const setupPlayers = ref([
    { name: '', deck_name: '', deck_id: null, user_id: null, suggestions: [], decks: [] },
    { name: '', deck_name: '', deck_id: null, user_id: null, suggestions: [], decks: [] },
    { name: '', deck_name: '', deck_id: null, user_id: null, suggestions: [], decks: [] },
    { name: '', deck_name: '', deck_id: null, user_id: null, suggestions: [], decks: [] }
])

const players = ref([])

// --- CARGA INICIAL (Usuario actual) ---
onMounted(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
        const { data: profile } = await supabase.from('profiles').select('username, id').eq('id', session.user.id).single()
        if (profile) {
            currentUser.value = profile
            setupPlayers.value[0].name = profile.username
            setupPlayers.value[0].user_id = profile.id
            loadPlayerDecks(0, profile.id)
        }
    }
})

// --- LÓGICA DE BÚSQUEDA Y MAZOS (SUPABASE) ---
async function handleSearch(index) {
    const term = setupPlayers.value[index].name
    if (term.length < 3) {
        setupPlayers.value[index].suggestions = []
        return
    }
    const { data } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', `%${term}%`)
        .limit(5)

    setupPlayers.value[index].suggestions = data || []
}

async function selectPlayer(index, profile) {
    setupPlayers.value[index].name = profile.username
    setupPlayers.value[index].user_id = profile.id
    setupPlayers.value[index].suggestions = []
    loadPlayerDecks(index, profile.id)
}

async function loadPlayerDecks(index, userId) {
    const { data } = await supabase
        .from('decks')
        .select('*')
        .eq('user_id', userId)
        .eq('formato', format.value)
        .eq('is_active', true)

    setupPlayers.value[index].decks = data || []
}

function onDeckSelect(index) {
    const p = setupPlayers.value[index]
    if (p.deck_id === 'manual' || !p.deck_id) {
        p.deck_name = '' // Permitir que escriba su propio mazo
    } else {
        const selected = p.decks.find(d => d.id === p.deck_id)
        if (selected) {
            p.deck_name = selected.comandante_nombre || selected.nombre_personalizado || selected.arquetipo_pauper
        }
    }
}

// --- CAMBIO DE FORMATO ---
function changeFormat(newFormat) {
    format.value = newFormat
    startingLife.value = (newFormat === 'commander') ? 40 : 20

    setupPlayers.value.forEach((p, idx) => {
        if (idx !== 0) {
            p.name = ''
            p.user_id = null
            p.suggestions = []
        }
        p.deck_id = null
        p.deck_name = ''
        p.decks = []
        if (p.user_id) loadPlayerDecks(idx, p.user_id)
    })
}

// --- GESTIÓN DE LA PARTIDA E INICIO ---
const getPlayerColor = (i) => ['#b91c1c', '#1d4ed8', '#047857', '#b45309'][i]

const startGame = () => {
    gameStarted.value = true;
    requestWakeLock();

    players.value = setupPlayers.value.slice(0, numPlayers.value).map((p, i) => ({
        id: i + 1,
        user_id: p.user_id,
        deck_id: p.deck_id,
        name: p.name || `Jugador ${i + 1}`,
        deck_name: p.deck_name || (format.value === 'commander' ? 'Sin Comandante' : 'Mazo Desconocido'),
        life: startingLife.value,
        lifeDelta: 0, // Para el feedback visual de daño/cura
        deltaKey: 0, // Para resetear la animación
        deltaTimer: null,
        poison: 0,
        tax: 0,
        isMonarch: false,
        commanderDamage: {},
        color: getPlayerColor(i),
        dead: false,
        puesto: null
    }))

    gameOver.value = false
    winner.value = null
    runShuffleAnimation()
}

// --- MEJORA: RULETA DE SORTEO INICIAL ---
const runShuffleAnimation = () => {
    isShuffling.value = true
    let step = 0
    // Número aleatorio de saltos entre 20 y 40
    const totalSteps = 20 + Math.floor(Math.random() * (numPlayers.value * 4))
    let currentDelay = 40 // Velocidad inicial rápida

    const nextStep = () => {
        currentPlayerIndex.value = (currentPlayerIndex.value + 1) % numPlayers.value
        step++

        if (step < totalSteps) {
            // Desaceleración progresiva tipo ruleta
            currentDelay += Math.floor(step / 3)
            setTimeout(nextStep, currentDelay)
        } else {
            isShuffling.value = false
        }
    }
    setTimeout(nextStep, currentDelay)
}

// --- LÓGICA DE TURNOS (HORARIO) ---
const getClockwiseOrder = (num) => {
    if (num === 4) return [0, 1, 3, 2]
    if (num === 3) return [0, 2, 1]
    return [0, 1]
}

const nextTurn = () => {
    if (isShuffling.value || gameOver.value) return

    const order = getClockwiseOrder(numPlayers.value)
    const currentPosition = order.indexOf(currentPlayerIndex.value)
    let nextPosition = (currentPosition + 1) % order.length
    let nextIndex = order[nextPosition]

    let attempts = 0
    while (players.value[nextIndex].dead && attempts < order.length) {
        nextPosition = (nextPosition + 1) % order.length
        nextIndex = order[nextPosition]
        attempts++
    }
    currentPlayerIndex.value = nextIndex
}

// --- LÓGICA DE INTERACCIÓN Y MECÁNICAS ---
const handleTouchStart = (e, i, a) => {
    if (pressTimer.value) clearTimeout(pressTimer.value);

    isLongPress.value = false
    pressTimer.value = setTimeout(() => {
        isLongPress.value = true
        // Mejora QoL: Vibración háptica en dispositivos móviles al hacer pulsación larga
        if (navigator.vibrate) navigator.vibrate(40);
        updateLife(i, a * 10)
    }, 450) // Reducido ligeramente para sentirse más ágil
}

const handleTouchEnd = (e, i, a) => {
    clearTimeout(pressTimer.value)
    pressTimer.value = null;

    if (!isLongPress.value) {
        updateLife(i, a)
    }
    if (e.cancelable) e.preventDefault();
}

// Lógica mejorada con Feedback de Daño
const updateLife = (i, a) => {
    const p = players.value[i]
    p.life += a

    // Feedback visual (Delta)
    p.lifeDelta += a
    p.deltaKey = Date.now() // Fuerza la re-animación CSS
    if (p.deltaTimer) clearTimeout(p.deltaTimer)

    p.deltaTimer = setTimeout(() => {
        p.lifeDelta = 0
    }, 1200) // El texto desaparecerá después de 1.2s

    checkDeath(i)
}

const updatePoison = (i, a) => {
    const p = players.value[i]
    p.poison = Math.max(0, Math.min(10, p.poison + a))
    checkDeath(i)
}

const updateTax = (i, a) => {
    const p = players.value[i]
    p.tax = Math.max(0, p.tax + a)
}

const updateCommanderDamage = (i, oppId, a) => {
    const p = players.value[i]
    const cur = p.commanderDamage[oppId] || 0
    p.commanderDamage[oppId] = Math.max(0, cur + a)
    updateLife(i, -a) // Altera la vida y dispara el feedback de -1
}

const setMonarch = (i) => {
    players.value.forEach((p, x) => p.isMonarch = x === i)
}

// --- MUERTE, VICTORIA Y GUARDADO EN DB ---
const checkDeath = (i) => {
    const p = players.value[i]
    if (p.dead) return

    const cmdrLoss = Object.values(p.commanderDamage).some(d => d >= 21)
    if (p.life <= 0 || p.poison >= 10 || (format.value === 'commander' && cmdrLoss)) {
        p.dead = true
        const aliveCount = players.value.filter(pl => !pl.dead).length
        p.puesto = aliveCount + 1
        checkWinner()
    }
}

const checkWinner = () => {
    const survivors = players.value.filter(p => !p.dead)
    if (survivors.length === 1 && gameStarted.value) {
        winner.value = survivors[0]
        winner.value.puesto = 1
        gameOver.value = true
        saveMatch()
    }
}

const saveMatch = async () => {
    if (loading.value) return
    loading.value = true
    try {
        const { data: matchData, error: matchError } = await supabase
            .from('matches')
            .insert([{
                creator_id: currentUser.value?.id,
                formato: format.value,
                is_public: true
            }])
            .select().single()

        if (matchError) throw matchError

        const participantsToSave = players.value.map((p) => ({
            match_id: matchData.id,
            user_id: p.user_id,
            player_name_manual: p.user_id ? null : p.name,
            deck_id: p.deck_id && p.deck_id !== 'manual' ? p.deck_id : null,
            deck_name_manual: p.deck_name,
            is_winner: p.puesto === 1,
            puesto: p.puesto || 1
        }))

        const { error: partError } = await supabase.from('match_participants').insert(participantsToSave)
        if (partError) throw partError

        console.log("Partida guardada con éxito")
    } catch (error) {
        alert("Error guardando partida: " + error.message)
    } finally {
        loading.value = false
    }
}

const resetGame = () => {
    if (confirm("¿Finalizar partida actual y volver al menú?")) {
        gameStarted.value = false
        gameOver.value = false
        releaseWakeLock();
    }
}

const goBack = () => {
    router.back()
}
</script>

<template>
    <div class="life-counter-root">

        <button v-if="!gameStarted" class="back-nav-btn" @click="goBack">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m15 18-6-6 6-6" />
            </svg>
            Volver
        </button>

        <div v-if="!gameStarted" class="setup-screen scrollable">
            <div class="setup-container">
                <h1 class="setup-title">LILLIANA TRACKER</h1>
                <div class="setup-box">

                    <p class="section-label">Formato y Vida</p>
                    <div class="selector-row">
                        <button @click="changeFormat('commander')"
                            :class="{ active: format === 'commander' }">Commander</button>

                        <button @click="changeFormat('pauper')" :class="{ active: format === 'pauper' }">Pauper</button>
                    </div>

                    <p class="section-label">Número de Jugadores</p>
                    <div class="selector-row">
                        <button v-for="n in [2, 3, 4]" :key="n" @click="numPlayers = n"
                            :class="{ active: numPlayers === n }">{{ n }}</button>
                    </div>

                    <hr class="setup-divider" />

                    <div class="players-setup-list">
                        <div v-for="i in numPlayers" :key="i" class="player-setup-row">
                            <span class="p-num">P{{ i }}</span>
                            <div class="input-group">
                                <div class="autocomplete-wrapper">
                                    <input type="text" v-model="setupPlayers[i - 1].name" @input="handleSearch(i - 1)"
                                        placeholder="Buscar jugador (@username)..."
                                        :disabled="i === 1 && currentUser" />

                                    <ul v-if="setupPlayers[i - 1].suggestions.length > 0" class="suggestions-list">
                                        <li v-for="sug in setupPlayers[i - 1].suggestions" :key="sug.id"
                                            @click="selectPlayer(i - 1, sug)">
                                            @{{ sug.username }}
                                        </li>
                                    </ul>
                                </div>

                                <select v-if="setupPlayers[i - 1].decks.length > 0"
                                    v-model="setupPlayers[i - 1].deck_id" @change="onDeckSelect(i - 1)"
                                    class="setup-select">
                                    <option :value="null">Seleccionar mazo...</option>
                                    <option v-for="deck in setupPlayers[i - 1].decks" :key="deck.id" :value="deck.id">
                                        {{ deck.nombre_personalizado || deck.comandante_nombre }}
                                    </option>
                                    <option value="manual">Otro mazo...</option>
                                </select>

                                <input
                                    v-if="setupPlayers[i - 1].decks.length === 0 || setupPlayers[i - 1].deck_id === 'manual'"
                                    type="text" v-model="setupPlayers[i - 1].deck_name"
                                    :placeholder="format === 'commander' ? 'Nombre del Comandante...' : 'Arquetipo del Mazo...'" />
                            </div>
                        </div>
                    </div>

                    <button class="start-btn" @click="startGame">EMPEZAR PARTIDA</button>
                </div>
            </div>
        </div>

        <div v-else class="game-board" :class="`players-${numPlayers}`">
            <div v-for="(player, index) in players" :key="player.id" class="player-zone"
                :style="{ '--player-color': !player.dead ? player.color : '#111' }" :class="{
            'is-dead': player.dead,
            'has-monarch': player.isMonarch,
            'is-current-turn': currentPlayerIndex === index && !isShuffling && !gameOver,
            'is-shuffling': isShuffling && currentPlayerIndex === index
        }">

                <div class="inner-content-rotator">
                    <div v-if="currentPlayerIndex === index && !gameOver" class="turn-indicator-label">
                        {{ isShuffling ? '🎲' : 'TU TURNO' }}
                    </div>

                    <div class="interaction-layer">
                        <div class="hitbox minus" @mousedown="handleTouchStart($event, index, -1)"
                            @mouseup="handleTouchEnd($event, index, -1)"
                            @touchstart.passive="handleTouchStart($event, index, -1)"
                            @touchend="handleTouchEnd($event, index, -1)" @contextmenu.prevent> </div>

                        <div class="hitbox plus" @mousedown="handleTouchStart($event, index, 1)"
                            @mouseup="handleTouchEnd($event, index, 1)"
                            @touchstart.passive="handleTouchStart($event, index, 1)"
                            @touchend="handleTouchEnd($event, index, 1)" @contextmenu.prevent> </div>
                    </div>

                    <div class="interface-layer">
                        <div class="top-nav">
                            <div class="status-pills">
                                <button class="pill poison-pill" @click.stop="updatePoison(index, 1)"
                                    @contextmenu.prevent="updatePoison(index, -1)">
                                    🧪 {{ player.poison }}
                                </button>
                                <button class="pill tax-pill" @click.stop="updateTax(index, 2)"
                                    @contextmenu.prevent="updateTax(index, -2)">
                                    💎 {{ player.tax }}
                                </button>
                                <button v-if="format === 'commander'" class="pill cmd-pill"
                                    @click.stop="activeCommanderPanel = player.id">⚔️</button>
                            </div>
                            <button class="pill monarch-pill" :class="{ active: player.isMonarch }"
                                @click.stop="setMonarch(index)">
                                👑 <span v-if="player.isMonarch">MONARCA</span>
                            </button>
                        </div>

                        <div class="life-center">

                            <div v-if="player.lifeDelta !== 0" :key="player.deltaKey" class="life-delta-indicator"
                                :class="player.lifeDelta > 0 ? 'delta-positive' : 'delta-negative'">
                                {{ player.lifeDelta > 0 ? '+' : '' }}{{ player.lifeDelta }}
                            </div>

                            <div class="public-commander-damage" v-if="format === 'commander'">
                                <div v-for="opp in players.filter(p => p.id !== player.id)" :key="opp.id"
                                    class="mini-damage-pill" v-show="(player.commanderDamage[opp.id] || 0) > 0"
                                    :style="{ borderLeftColor: opp.color }">
                                    {{ player.commanderDamage[opp.id] }}
                                </div>
                            </div>

                            <div class="p-info-group">
                                <span class="p-tag">{{ player.name }}</span>
                                <span class="p-extra">{{ player.deck_name }}</span>
                            </div>

                            <span v-if="!player.dead" class="p-life">{{ player.life }}</span>
                            <div v-else class="p-death-msg">
                                💀
                                <button @mousedown.stop @touchstart.stop
                                    @click.stop="player.dead = false; player.life = 1; gameOver = false">REVIVIR</button>
                            </div>
                        </div>
                    </div>

                    <div v-if="activeCommanderPanel === player.id && format === 'commander'" class="cmd-overlay">
                        <div class="cmd-header">
                            <span>Comandante & Tax</span>
                            <button class="close-btn" @click.stop="activeCommanderPanel = null">✕</button>
                        </div>
                        <div class="cmd-list">
                            <hr class="cmd-divider" />
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

            <div class="center-hub" v-if="!gameOver">
                <button class="hub-btn pass-btn" @click="nextTurn" v-show="!isShuffling">⏭️</button>
                <button class="hub-btn menu-btn" @click="resetGame">⚙️</button>
            </div>

            <div v-if="gameOver" class="victory-overlay">
                <div class="victory-box">
                    <h2>👑 ¡VICTORIA! 👑</h2>
                    <h1 :style="{ color: winner.color }">{{ winner.name }}</h1>
                    <p>{{ winner.deck_name }}</p>
                    <p class="db-msg" v-if="!loading">✓ Partida sincronizada con la base de datos</p>
                    <p class="db-msg" v-else>Guardando partida...</p>
                    <button class="start-btn" @click="resetGame">VOLVER AL MENÚ</button>
                </div>
            </div>
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
    -webkit-user-select: none;
    /* Safari */
    -ms-user-select: none;
    /* IE 10 y 11 */
    user-select: none;
    /* Estándar (Chrome, Firefox, etc.) */
    -webkit-touch-callout: none;
    /* Desactiva el menú contextual en iOS (copiar/pegar) */
}

.setup-screen input,
.setup-screen select {
    -webkit-user-select: text;
    user-select: text;
}

/* --- ESTILOS DEL SETUP --- */
.setup-screen {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f172a;
}

.setup-screen.scrollable {
    overflow-y: auto;
    padding: 20px 0;
}

.setup-title {
    margin-top: 30px;
}

.setup-box {
    background: rgba(255, 255, 255, 0.05);
    padding: 24px;
    border-radius: 24px;
    width: 320px;
    text-align: center;
    max-width: 90vw;
}

.section-label {
    margin: 16px 0 8px 0;
    font-size: 0.8rem;
    font-weight: bold;
    color: #94a3b8;
    text-transform: uppercase;
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
    transition: background 0.2s;
}

.selector-row button.active {
    background: #3b82f6;
}

.setup-divider {
    border: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin: 24px 0;
}

.players-setup-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.player-setup-row {
    display: flex;
    gap: 8px;
    align-items: center;
}

.p-num {
    font-weight: 900;
    color: #475569;
    width: 24px;
}

.input-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.input-group input,
.setup-select {
    width: 100%;
    background: #1e293b;
    border: 1px solid #334155;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    box-sizing: border-box;
}

.input-group input:focus,
.setup-select:focus {
    outline: none;
    border-color: #3b82f6;
}

.autocomplete-wrapper {
    position: relative;
    width: 100%;
}

.suggestions-list {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    background: #1e293b;
    border: 1px solid #3b82f6;
    border-radius: 6px;
    margin: 4px 0 0 0;
    padding: 0;
    list-style: none;
    z-index: 1000;
    max-height: 120px;
    overflow-y: auto;
}

.suggestions-list li {
    padding: 8px 12px;
    text-align: left;
    cursor: pointer;
    font-size: 0.9rem;
    border-bottom: 1px solid #334155;
}

.suggestions-list li:hover {
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
}

/* --- TABLERO Y JUEGO --- */
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
    transition: filter 0.2s ease;
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
    margin: 0 20px;
}

.status-pills {
    display: flex;
    gap: 4px;
}

.pill {
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    border-radius: 8px;
    padding: 6px 8px;
    font-weight: 800;
    font-size: 0.75rem;
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
    position: relative;
}

/* FEEDBACK DE DAÑO VISUAL (DELTA) */
.life-delta-indicator {
    position: absolute;
    top: 5%;
    /* Arriba de la vida */
    font-size: 4rem;
    font-weight: 900;
    opacity: 0;
    pointer-events: none;
    animation: float-fade 2s ease-out forwards;
    text-shadow: 0 4px 10px rgba(0, 0, 0, 0.8);
    z-index: 20;
}

.delta-positive {
    color: #4ade80;
    /* Verde brillante */
}

.delta-negative {
    color: #f87171;
    /* Rojo brillante */
}

@keyframes float-fade {
    0% {
        transform: translateY(0) scale(1);
        opacity: 1;
    }

    100% {
        transform: translateY(-60px) scale(1.3);
        opacity: 0;
    }
}

.p-info-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: -10px;
}

.p-tag {
    font-size: 0.7rem;
    font-weight: 900;
    opacity: 0.4;
    letter-spacing: 2px;
}

.p-extra {
    font-size: 0.6rem;
    opacity: 0.6;
    font-style: italic;
}

.p-life {
    font-size: clamp(2.5rem, 15vh, 9rem);
    font-weight: 900;
    line-height: 1;
}

.public-commander-damage {
    position: absolute;
    left: 4px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.mini-damage-pill {
    background: rgba(0, 0, 0, 0.4);
    color: #fff;
    font-size: 0.7rem;
    font-weight: 900;
    padding: 2px 6px;
    border-radius: 4px;
    border-left: 3px solid transparent;
    backdrop-filter: blur(4px);
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
    opacity: 0;
}

.is-dead {
    filter: grayscale(1) brightness(0.8);
}

.danger {
    color: #ff4444;
    text-shadow: 0 0 10px rgba(255, 68, 68, 0.4);
}

.p-death-msg {
    position: relative;
    z-index: 50;
    /* Aumentado para que no se oculte tras el hitbox */
    pointer-events: auto;
    /* IMPORTANTE: Hace que sea pulsable */
    text-align: center;
}

.p-death-msg button {
    margin-top: 10px;
    padding: 8px 16px;
    background: #fff;
    color: #000;
    border: none;
    border-radius: 8px;
    font-weight: 900;
    cursor: pointer;
    display: block;
    pointer-events: auto;
    /* Asegura de nuevo el click */
}

/* --- OVERLAY DE COMANDANTE --- */
.cmd-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.96);
    z-index: 100;
    display: flex;
    flex-direction: column;
    padding: 6px;
    box-sizing: border-box;
}

.cmd-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2px 6px;
    height: 24px;
    pointer-events: auto;
}

.cmd-header span {
    font-weight: 900;
    font-size: 0.6rem;
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
}

.cmd-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;
    pointer-events: auto;
}

.cmd-row {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.04);
    padding: 0 10px;
    border-radius: 8px;
}

.cmd-divider {
    border: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin: 2px 0;
}

.cmd-actions {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.cmd-actions button {
    width: clamp(30px, 7vh, 45px);
    height: clamp(30px, 7vh, 45px);
    border-radius: 8px;
    border: none;
    font-weight: 900;
    background: #fff;
    color: #000;
}

.cmd-value {
    font-weight: 900;
    font-size: 1.1rem;
    min-width: 40px;
    text-align: center;
}

.opp-indicator {
    width: 6px;
    height: 60%;
    border-radius: 3px;
}

/* ---- ESTILOS PARA EL TURNO Y EL HUB CENTRAL ---- */
.center-hub {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    gap: 8px;
    background: rgba(0, 0, 0, 0.7);
    padding: 6px;
    border-radius: 30px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    z-index: 150;
    backdrop-filter: blur(10px);
}

.hub-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    cursor: pointer;
    transition: transform 0.1s ease;
}

.hub-btn:active {
    transform: scale(0.9);
}

.pass-btn {
    background: #fff;
    color: #000;
    font-weight: bold;
    font-size: 1.5rem;
}

.menu-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
}

.is-current-turn {
    z-index: 20;
    box-shadow: inset 0 0 0 4px rgba(255, 255, 255, 0.8);
    animation: pulse-turn 2s infinite ease-in-out;
}

@keyframes pulse-turn {

    0%,
    100% {
        box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.3);
    }

    50% {
        box-shadow: inset 0 0 0 8px rgba(255, 255, 255, 0.8);
    }
}

.is-shuffling {
    filter: brightness(1.5) saturate(1.5);
    box-shadow: inset 0 0 0 6px #fff;
}

.turn-indicator-label {
    position: absolute;
    top: 40px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.9);
    color: #000;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.65rem;
    font-weight: 900;
    letter-spacing: 1px;
    z-index: 30;
    pointer-events: none;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
}

/* --- OVERLAY DE VICTORIA --- */
.victory-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(5px);
}

.victory-box {
    background: #1e293b;
    padding: 30px;
    border-radius: 20px;
    text-align: center;
    border: 2px solid #3b82f6;
    animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.victory-box h1 {
    font-size: 3rem;
    margin: 10px 0;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.db-msg {
    color: #4ade80;
    font-size: 0.8rem;
    margin-bottom: 20px;
}

@keyframes popIn {
    0% {
        transform: scale(0.8);
        opacity: 0;
    }

    100% {
        transform: scale(1);
        opacity: 1;
    }
}

/* Estilo para el botón de volver */
.back-nav-btn {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    padding: 8px 16px 8px 8px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    backdrop-filter: blur(10px);
}

.back-nav-btn:active {
    transform: scale(0.95);
    background: rgba(255, 255, 255, 0.1);
}

/* --- OVERLAY DE VICTORIA --- */
.victory-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(5px);
}

.victory-box {
    background: #1e293b;
    padding: 30px;
    border-radius: 20px;
    text-align: center;
    border: 2px solid #3b82f6;
    animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.victory-box h1 {
    font-size: 3rem;
    margin: 10px 0;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.db-msg {
    color: #4ade80;
    font-size: 0.8rem;
    margin-bottom: 20px;
}

@keyframes popIn {
    0% {
        transform: scale(0.8);
        opacity: 0;
    }

    100% {
        transform: scale(1);
        opacity: 1;
    }
}

/* Estilo para el botón de volver */
.back-nav-btn {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    padding: 8px 16px 8px 8px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    backdrop-filter: blur(10px);
}

.back-nav-btn:active {
    transform: scale(0.95);
    background: rgba(255, 255, 255, 0.1);
}
</style>