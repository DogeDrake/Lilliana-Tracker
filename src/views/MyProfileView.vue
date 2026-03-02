<script setup>
import { ref, onMounted, reactive } from 'vue'
import { supabase } from '../supabaseClient'
import DeckCard from '../components/DeckCard.vue'

const profile = ref(null)
const decks = ref([])
const stats = reactive({
    totalMatches: 0,
    winRate: 0
})
const showAddDeck = ref(false)
const isSubmitting = ref(false)

const newDeck = reactive({
    nombre_personalizado: '',
    formato: 'commander',
    comandante_nombre: '',
    arquetipo_pauper: '',
    image_url: '',
    decklist_url: '',
    colors: []
})

onMounted(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        // 1. Cargar el perfil del usuario
        const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        profile.value = p

        // 2. Cargar sus mazos
        fetchDecks(user.id)

        // 3. Calcular estadísticas basadas en sus participaciones reales
        fetchStats(user.id)
    }
})

const fetchDecks = async (userId) => {
    const { data: d } = await supabase.from('decks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    decks.value = d || []
}

/**
 * Lógica para obtener las partidas donde el usuario ha participado
 */
const fetchStats = async (userId) => {
    try {
        // Consultamos la tabla match_participants buscando el user_id del usuario logueado
        const { data: participations, error } = await supabase
            .from('match_participants')
            .select('is_winner')
            .eq('user_id', userId)

        if (error) throw error

        if (participations) {
            const total = participations.length
            // Contamos cuántas veces is_winner es true
            const wins = participations.filter(p => p.is_winner === true).length

            stats.totalMatches = total
            // Calculamos el Win Rate (evitando división por cero)
            stats.winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0
        }
    } catch (err) {
        console.error("Error al calcular estadísticas:", err.message)
    }
}

const openDecklist = (url) => {
    if (url) window.open(url, '_blank')
}

const addNewDeck = async () => {
    isSubmitting.value = true
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("No hay sesión activa")

        const colorString = newDeck.colors.sort().join('')

        const { error } = await supabase.from('decks').insert([
            {
                user_id: user.id,
                nombre_personalizado: newDeck.nombre_personalizado,
                formato: newDeck.formato,
                comandante_nombre: newDeck.formato === 'commander' ? newDeck.comandante_nombre : null,
                arquetipo_pauper: newDeck.formato === 'pauper' ? newDeck.arquetipo_pauper : null,
                color_identity: colorString,
                image_url: newDeck.image_url || null,
                decklist_url: newDeck.decklist_url || null,
                is_active: true
            }
        ])

        if (error) throw error

        Object.assign(newDeck, {
            nombre_personalizado: '', comandante_nombre: '',
            arquetipo_pauper: '', image_url: '', decklist_url: '', colors: []
        })
        showAddDeck.value = false
        await fetchDecks(user.id)

    } catch (err) {
        alert('Error: ' + err.message)
    } finally {
        isSubmitting.value = false
    }
}

async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/Lilliana-Tracker/login'
}
</script>

<template>
    <div class="profile-view-root" v-if="profile">
        <div class="fixed-bg-elements">
            <div class="mana-particles-overlay"></div>
            <div class="ambient-glow"></div>
        </div>

        <div class="relative-content fade-in">
            <header class="profile-main-header">
                <nav class="top-bar">
                    <span class="brand">LILLIANA TRACKER</span>
                    <button @click="handleLogout" class="logout-btn">Cerrar Sesión</button>
                </nav>

                <div class="hero-section">
                    <div class="avatar-frame">
                        <div class="avatar-circle">
                            {{ profile?.username?.charAt(0).toUpperCase() }}
                        </div>
                    </div>
                    <div class="hero-text">
                        <h1 class="username-title">{{ profile?.username }}</h1>
                        <p class="rank-subtitle">Planeswalker de Élite</p>
                    </div>
                </div>

                <div class="quick-stats-grid">
                    <div class="q-stat">
                        <span class="q-num">{{ decks.length }}</span>
                        <span class="q-label">Grimorios</span>
                    </div>
                    <div class="q-stat">
                        <span class="q-num">{{ stats.totalMatches }}</span>
                        <span class="q-label">Partidas</span>
                    </div>
                    <div class="q-stat">
                        <span class="q-num">{{ stats.winRate }}%</span>
                        <span class="q-label">Win Rate</span>
                    </div>
                </div>
            </header>

            <main class="decks-section">
                <div class="decks-header-bar">
                    <h2>Tus Mazos</h2>
                    <button @click="showAddDeck = true" class="add-deck-btn">+ NUEVO MAZO</button>
                </div>

                <div class="decks-layout-grid">
                    <DeckCard v-for="deck in decks" :key="deck.id" :deck="deck" @click="openDecklist(deck.decklist_url)"
                        class="clickable-card" />

                    <div v-if="decks.length === 0" class="empty-state-card" @click="showAddDeck = true">
                        <p>No tienes mazos en tu grimorio. Pulsa aquí para forjar uno.</p>
                    </div>
                </div>
            </main>
        </div>

        <div v-if="showAddDeck" class="modal-overlay" @click.self="showAddDeck = false">
            <div class="modal-content glass-card fade-in-up">
                <div class="modal-header">
                    <h3>Nueva Invocación</h3>
                    <button class="close-btn" @click="showAddDeck = false">×</button>
                </div>

                <form @submit.prevent="addNewDeck" class="magic-form">
                    <div class="form-group">
                        <label>Nombre del Mazo</label>
                        <input v-model="newDeck.nombre_personalizado" type="text" placeholder="Ej: Dragones de Liliana"
                            required />
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Formato</label>
                            <select v-model="newDeck.formato">
                                <option value="commander">Commander</option>
                                <option value="pauper">Pauper</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Colores</label>
                            <div class="color-picker">
                                <label v-for="c in ['W', 'U', 'B', 'R', 'G']" :key="c"
                                    :class="['color-dot', c, { active: newDeck.colors.includes(c) }]">
                                    <input type="checkbox" :value="c" v-model="newDeck.colors" hidden /> {{ c }}
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>URL del Deck</label>
                        <input v-model="newDeck.decklist_url" type="url" placeholder="https://..." />
                    </div>

                    <div class="form-group" v-if="newDeck.formato === 'commander'">
                        <label>Comandante</label>
                        <input v-model="newDeck.comandante_nombre" type="text" placeholder="Nombre de la carta"
                            required />
                    </div>

                    <div class="form-group" v-if="newDeck.formato === 'pauper'">
                        <label>Arquetipo Pauper</label>
                        <input v-model="newDeck.arquetipo_pauper" type="text" placeholder="Ej: Burn, Affinity..."
                            required />
                    </div>

                    <div class="form-group">
                        <label>URL Imagen Portada</label>
                        <input v-model="newDeck.image_url" type="url" placeholder="Link directo" />
                    </div>

                    <button type="submit" class="btn-submit-magic" :disabled="isSubmitting">
                        {{ isSubmitting ? 'Sellando Contrato...' : 'Añadir al Grimorio' }}
                    </button>
                </form>
            </div>
        </div>
    </div>
</template>
<style scoped>
/* (Estilos previos heredados) */
.profile-view-root {
    width: 100%;
    min-height: 100vh;
    background: #020617;
    color: white;
    position: relative;
}

.fixed-bg-elements {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
}

.mana-particles-overlay {
    width: 100%;
    height: 100%;
    background-image: radial-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px);
    background-size: 40px 40px;
}

.ambient-glow {
    position: absolute;
    top: -10%;
    right: -10%;
    width: 70vw;
    height: 70vw;
    background: radial-gradient(circle, rgba(29, 78, 216, 0.15) 0%, transparent 70%);
    filter: blur(80px);
}

.relative-content {
    position: relative;
    z-index: 1;
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 20px;
}

.profile-main-header {
    padding: 40px 0;
}

.top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 60px;
}

.brand {
    font-weight: 900;
    letter-spacing: 2px;
    color: #3b82f6;
    font-size: 0.7rem;
}

.logout-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    padding: 6px 12px;
    border-radius: 8px;
    cursor: pointer;
}

.hero-section {
    display: flex;
    align-items: center;
    gap: 30px;
    margin-bottom: 40px;
}

.avatar-circle {
    width: 100px;
    height: 100px;
    background: linear-gradient(135deg, #3b82f6, #1e4ed8);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 900;
    box-shadow: 0 10px 30px rgba(30, 64, 175, 0.4);
}

.username-title {
    font-size: 3rem;
    margin: 0;
    letter-spacing: -2px;
}

.rank-subtitle {
    color: #60a5fa;
    margin-top: 5px;
    font-weight: bold;
}

.quick-stats-grid {
    display: flex;
    gap: 20px;
    background: rgba(255, 255, 255, 0.03);
    padding: 20px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.q-stat {
    flex: 1;
    text-align: center;
}

.q-num {
    display: block;
    font-size: 1.5rem;
    font-weight: 800;
}

.q-label {
    font-size: 0.65rem;
    color: #64748b;
    text-transform: uppercase;
}

.decks-section {
    padding: 40px 0 100px;
}

.decks-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
}

.add-deck-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 12px;
    font-weight: bold;
    cursor: pointer;
}

.decks-layout-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}

.empty-state-card {
    grid-column: 1 / -1;
    padding: 60px;
    border: 2px dashed rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    text-align: center;
    color: #64748b;
    cursor: pointer;
}

/* ESTILOS DEL MODAL ADAPTADO */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: #0f172a;
    border: 1px solid rgba(59, 130, 246, 0.4);
    padding: 30px;
    border-radius: 28px;
    width: 95%;
    max-width: 500px;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

.form-group {
    margin-bottom: 15px;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.magic-form label {
    font-size: 0.7rem;
    color: #60a5fa;
    font-weight: bold;
    text-transform: uppercase;
}

.magic-form input,
.magic-form select {
    background: #1e293b;
    border: 1px solid #334155;
    padding: 12px;
    border-radius: 12px;
    color: white;
}

/* COLOR PICKER */
.color-picker {
    display: flex;
    gap: 5px;
    margin-top: 5px;
}

.color-dot {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    cursor: pointer;
    border: 2px solid transparent;
    opacity: 0.4;
    transition: 0.3s;
    background: #475569;
    color: black;
    font-weight: 900;
}

.color-dot.active {
    opacity: 1;
    border-color: white;
    transform: scale(1.1);
}

.color-dot.W {
    background: #f9fafb;
}

.color-dot.U {
    background: #3b82f6;
    color: white;
}

.color-dot.B {
    background: #111827;
    color: white;
}

.color-dot.R {
    background: #ef4444;
    color: white;
}

.color-dot.G {
    background: #22c55e;
    color: white;
}

.btn-submit-magic {
    width: 100%;
    padding: 15px;
    background: #3b82f6;
    border: none;
    border-radius: 12px;
    color: white;
    font-weight: bold;
    cursor: pointer;
    margin-top: 10px;
}

.btn-submit-magic:disabled {
    opacity: 0.5;
}
</style>