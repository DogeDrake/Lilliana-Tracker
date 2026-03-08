<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../supabaseClient'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)
const winnerIndex = ref(0)
const currentUser = ref(null)
const userDecks = ref([])

// Estado para búsqueda de contrincantes
const searchResults = ref([[], [], [], []])
const opponentDecks = ref([[], [], [], []])

const form = ref({
    formato: 'commander',
    notas: ''
})

const participants = ref([
    { name: '', deck_name: '', deck_id: null, user_id: null },
    { name: '', deck_name: '', deck_id: null, user_id: null },
    { name: '', deck_name: '', deck_id: null, user_id: null },
    { name: '', deck_name: '', deck_id: null, user_id: null }
])

const visibleParticipantsCount = computed(() => form.value.formato === 'commander' ? 4 : 2)
const filteredDecks = computed(() => userDecks.value.filter(d => d.formato === form.value.formato))

onMounted(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
        const { data: profile } = await supabase.from('profiles').select('username, id').eq('id', session.user.id).single()
        if (profile) {
            currentUser.value = profile
            participants.value[0].name = profile.username
            participants.value[0].user_id = profile.id
        }
        const { data: decks } = await supabase.from('decks').select('*').eq('user_id', session.user.id).eq('is_active', true)
        if (decks) userDecks.value = decks
    }
})

async function searchPlayers(index) {
    const term = participants.value[index].name
    if (term.length < 3) {
        searchResults.value[index] = []
        return
    }
    const { data } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', `%${term}%`)
        .neq('id', currentUser.value?.id)
        .limit(5)
    searchResults.value[index] = data || []
}

async function selectPlayer(index, profile) {
    participants.value[index].name = profile.username
    participants.value[index].user_id = profile.id
    searchResults.value[index] = []

    const { data: decks } = await supabase
        .from('decks')
        .select('*')
        .eq('user_id', profile.id)
        .eq('formato', form.value.formato)
        .eq('is_active', true)

    opponentDecks.value[index] = decks || []
}

function onDeckSelect(index, isOpponent = false) {
    const deckSource = isOpponent ? opponentDecks.value[index] : userDecks.value
    const selected = deckSource.find(d => d.id === participants.value[index].deck_id)
    if (selected) {
        participants.value[index].deck_name = selected.comandante_nombre || selected.nombre_personalizado || selected.arquetipo_pauper
    } else if (participants.value[index].deck_id !== 'manual') {
        participants.value[index].deck_name = ''
    }
}

function changeFormat(newFormat) {
    form.value.formato = newFormat
    winnerIndex.value = 0
    opponentDecks.value = [[], [], [], []]
    participants.value.forEach((p, idx) => {
        if (idx !== 0) {
            p.name = ''
            p.user_id = null
        }
        p.deck_id = null
        p.deck_name = ''
    })
}

async function saveMatch() {
    if (loading.value) return
    const activeParticipants = participants.value
        .slice(0, visibleParticipantsCount.value)
        .filter(p => p.deck_name.trim() !== '' || p.deck_id !== null)

    if (activeParticipants.length < 2) {
        alert("Una partida debe tener al menos 2 jugadores con mazo.")
        return
    }

    loading.value = true
    try {
        const { data: matchData, error: matchError } = await supabase
            .from('matches')
            .insert([{
                creator_id: currentUser.value.id,
                formato: form.value.formato,
                notas_globales: form.value.notas,
                is_public: true
            }])
            .select().single()

        if (matchError) throw matchError

        const toSave = activeParticipants.map((p, index) => ({
            match_id: matchData.id,
            user_id: p.user_id,
            player_name_manual: p.name || 'Otro',
            deck_id: p.deck_id && p.deck_id !== 'manual' ? p.deck_id : null,
            deck_name_manual: p.deck_name || 'Mazo desconocido',
            is_winner: index === winnerIndex.value,
            puesto: index === winnerIndex.value ? 1 : 2
        }))

        const { error: partError } = await supabase.from('match_participants').insert(toSave)
        if (partError) throw partError
        router.push('/historial')
    } catch (error) {
        alert(error.message)
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
        <p class="invoking-text">Invocando perfil...</p>
    </div>

    <div v-else-if="errorMsg" class="error-container">
        <p>{{ errorMsg }}</p>
        <button @click="handleLogout" class="logout-btn">Reintentar / Salir</button>
    </div>

    <div v-else-if="profile" class="profile-view-root">
        <div class="relative-content fade-in">
            <header class="profile-main-header">
                <nav class="top-bar">
                    <span class="brand">LILLIANA TRACKER</span>
                    <div class="header-actions">
                        <button @click="showExportModal = true" class="export-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            DATOS
                        </button>
                        <button @click="handleLogout" class="logout-btn">SALIR</button>
                    </div>
                </nav>

                <div class="hero-section">
                    <div class="avatar-wrapper" @click="showEditAvatar = true">
                        <div v-if="profile.avatar_url" class="avatar-image-container">
                            <img :src="profile.avatar_url" class="avatar-image" />
                        </div>
                        <div v-else class="avatar-circle">{{ profile.username?.charAt(0).toUpperCase() }}</div>
                        <div class="edit-overlay"><span>EDITAR</span></div>
                    </div>
                    <div class="hero-text">
                        <h1 class="username-title">{{ profile.username }}</h1>
                        <p class="rank-subtitle">{{ profile.bio || 'Planeswalker' }}</p>
                    </div>
                </div>

                <div class="quick-stats-row">
                    <div class="q-stat"><span class="q-num">{{ decks.length }}</span><span class="q-label">Mazos</span>
                    </div>
                    <div class="q-stat"><span class="q-num">{{ stats.totalMatches }}</span><span
                            class="q-label">Partidas</span></div>
                    <div class="q-stat"><span class="q-num">{{ stats.winRate }}%</span><span class="q-label">W.R.</span>
                    </div>
                </div>

                <div class="mobile-nav-pills">
                    <a href="#biblioteca" class="pill-link">Mazos</a>
                    <a href="#historial" class="pill-link">Historial</a>
                </div>
            </header>

            <section id="biblioteca" class="content-section">
                <div class="section-header-bar">
                    <h2 class="section-title">Biblioteca</h2>
                    <button @click="showAddDeck = true" class="add-deck-btn">+ NUEVO</button>
                </div>

                <div class="decks-scroll-viewport">
                    <div class="decks-layout-grid">
                        <DeckCard v-for="deck in decks" :key="deck.id" :deck="deck"
                            @click="openDecklist(deck.decklist_url)" @show-stats="openStats(deck)" />
                        <div v-if="decks.length === 0" class="empty-state-card-mini">No hay mazos registrados.</div>
                    </div>
                </div>
            </section>

            <section id="historial" class="content-section history-section-spacer">
                <h2 class="section-title">Últimas Partidas</h2>
                <div class="history-list">
                    <button v-for="entry in history" :key="entry.match_id" class="history-item-btn"
                        @click="goToMatch(entry.match_id)">
                        <div class="h-date">{{ formatDate(entry.matches.fecha_partida) }}</div>
                        <div class="h-main">
                            <span class="h-deck">{{ entry.deck_name_manual }}</span>
                            <span class="h-format">{{ entry.matches.formato }}</span>
                        </div>
                        <div class="h-result" :class="entry.is_winner ? 'win' : 'loss'">
                            {{ entry.is_winner ? 'WIN' : 'LOSS' }}
                        </div>
                    </button>
                </div>
            </section>
        </div>

        <div v-if="showExportModal || showAddDeck || showEditAvatar || showDeckStats" class="modal-overlay"
            @click.self="closeModals">

            <div v-if="showExportModal" class="modal-content glass-modal export-selection-modal fade-in-up">
                <div class="modal-header">
                    <h3>GESTIÓN DE DATOS</h3>
                    <button @click="showExportModal = false" class="close-btn-styled">✕</button>
                </div>
                <div class="export-stack">
                    <div class="data-row-card" v-for="fmt in ['commander', 'pauper']" :key="fmt">
                        <div class="data-info">
                            <span class="data-icon">{{ fmt === 'commander' ? '👑' : '🛡️' }}</span>
                            <span class="data-name">{{ fmt.toUpperCase() }}</span>
                        </div>
                        <div class="data-actions">
                            <button @click="downloadCSV(fmt)" class="btn-data exp">Exportar</button>
                            <button @click="triggerImport(fmt)" class="btn-data imp">Importar</button>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="showAddDeck" class="modal-content glass-modal add-deck-modal fade-in-up">
                <div class="modal-header">
                    <h3>NUEVO MAZO</h3>
                    <button @click="showAddDeck = false" class="close-btn-styled">✕</button>
                </div>
                <button @click="createDeck" class="btn-submit-magic">FORJAR MAZO</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* ESTRUCTURA BASE */
.profile-view-root {
    min-height: 100vh;
    color: white;
    padding-bottom: 50px;
    background: #020617;
}

.relative-content {
    max-width: 1000px;
    margin: 0 auto;
    padding: 15px;
    /* Reducido para móvil */
}

/* CAMBIO 1: NAVEGACIÓN RÁPIDA */
.mobile-nav-pills {
    display: none;
    /* Oculto en desktop */
    gap: 10px;
    margin-top: 20px;
}

.pill-link {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #60a5fa;
    padding: 8px 18px;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 800;
    text-decoration: none;
    text-transform: uppercase;
}

/* CAMBIO 2: SCROLL HORIZONTAL DE MAZOS */
.decks-scroll-viewport {
    width: 100%;
}

.decks-layout-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}

/* CAMBIO 3: MODAL STACK PARA CSV */
.export-stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.data-row-card {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(59, 130, 246, 0.2);
    padding: 15px;
    border-radius: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.data-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.data-icon {
    font-size: 1.2rem;
}

.data-name {
    font-weight: 900;
    font-size: 0.8rem;
    letter-spacing: 1px;
}

.data-actions {
    display: flex;
    gap: 8px;
}

.btn-data {
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 0.65rem;
    font-weight: 800;
    border: none;
    cursor: pointer;
    text-transform: uppercase;
}

.btn-data.exp {
    background: #3b82f6;
    color: white;
}

.btn-data.imp {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    border: 1px solid #10b981;
}

/* HEADER & HERO */
.top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.brand {
    font-weight: 900;
    color: #3b82f6;
    font-size: 0.75rem;
    letter-spacing: 1px;
}

.export-btn {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid #3b82f6;
    color: #60a5fa;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 0.65rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
}

.logout-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 0.65rem;
    cursor: pointer;
}

.hero-section {
    display: flex;
    align-items: center;
    gap: 20px;
    margin: 25px 0;
}

.avatar-wrapper {
    position: relative;
    width: 70px;
    height: 70px;
    flex-shrink: 0;
}

.avatar-image-container,
.avatar-circle {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 2px solid #3b82f6;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1e293b;
}

.avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-circle {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    font-size: 1.5rem;
    font-weight: 900;
}

.username-title {
    font-size: 1.6rem;
    font-weight: 900;
    margin: 0;
}

.rank-subtitle {
    color: #60a5fa;
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
}

/* QUICK STATS */
.quick-stats-row {
    display: flex;
    gap: 8px;
    margin-top: 10px;
}

.q-stat {
    flex: 1;
    background: rgba(30, 41, 59, 0.3);
    padding: 12px 5px;
    border-radius: 12px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.03);
}

.q-num {
    display: block;
    font-size: 1.1rem;
    font-weight: 900;
}

.q-label {
    font-size: 0.55rem;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 800;
}

/* HISTORIAL */
.history-list {
    background: rgba(15, 23, 42, 0.4);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
}

.history-item-btn {
    display: grid;
    grid-template-columns: 70px 1fr 60px;
    align-items: center;
    padding: 15px;
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    width: 100%;
    color: inherit;
    text-align: left;
}

.h-date {
    font-size: 0.6rem;
    color: #64748b;
}

.h-deck {
    display: block;
    font-weight: 700;
    font-size: 0.8rem;
}

.h-format {
    font-size: 0.55rem;
    color: #3b82f6;
    text-transform: uppercase;
}

.h-result {
    font-size: 0.6rem;
    font-weight: 900;
    text-align: center;
    border-radius: 4px;
    padding: 4px;
}

.win {
    color: #10b981;
    background: rgba(16, 185, 129, 0.1);
}

.loss {
    color: #f87171;
    background: rgba(239, 68, 68, 0.1);
}

/* CAMBIO 4: MEDIA QUERIES PARA OPTIMIZACIÓN MÓVIL */
@media (max-width: 768px) {
    .mobile-nav-pills {
        display: flex;
    }

    /* Efecto carrusel para mazos */
    .decks-scroll-viewport {
        margin: 0 -15px;
        /* Rompe el padding del padre para scroll de borde a borde */
        overflow-x: auto;
        padding: 0 15px 15px;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
    }

    .decks-layout-grid {
        display: flex;
        flex-wrap: nowrap;
        gap: 15px;
        width: max-content;
    }

    .decks-layout-grid>* {
        width: 280px;
        /* Ancho fijo de la carta en móvil */
        scroll-snap-align: center;
        flex-shrink: 0;
    }

    /* Reducción de fuentes generales */
    .username-title {
        font-size: 1.4rem;
    }

    .section-title {
        font-size: 0.7rem;
    }
}

/* MODALES BASE */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.9);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 15px;
}

.glass-modal {
    background: #0f172a;
    padding: 25px;
    border-radius: 20px;
    width: 100%;
    border: 1px solid rgba(59, 130, 246, 0.2);
    max-width: 400px;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.modal-header h3 {
    font-size: 0.9rem;
    font-weight: 900;
    letter-spacing: 1px;
    margin: 0;
}

.close-btn-styled {
    background: rgba(255, 255, 255, 0.05);
    border: none;
    color: white;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
}

.btn-submit-magic {
    width: 100%;
    padding: 14px;
    background: #3b82f6;
    color: white;
    border-radius: 12px;
    font-weight: 900;
    border: none;
    margin-top: 10px;
    cursor: pointer;
}

/* ANIMACIONES */
.fade-in {
    animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

.fade-in-up {
    animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(15px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>