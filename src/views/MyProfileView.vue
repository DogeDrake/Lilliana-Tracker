<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import { supabase } from '../supabaseClient'
import DeckCard from '../components/DeckCard.vue'

// --- ESTADOS ---
const profile = ref(null)
const decks = ref([])
const history = ref([])
const loading = ref(true)
const isSubmitting = ref(false)

// Modales
const showAddDeck = ref(false)
const showEditAvatar = ref(false)
const showDeckStats = ref(false)

const newAvatarUrl = ref('')
const selectedDeckStats = ref(null)

// Objeto de mazo expandido
const newDeck = reactive({
    nombre_personalizado: '',
    formato: 'commander',
    decklist_url: '',
    image_url: '',
    commander_name: '', // Específico Commander
    pauper_archetype: '', // Específico Pauper
    color_identity: [] // Identidad de color
})

const colorOptions = [
    { code: 'W', symbol: '☀️', name: 'White' },
    { code: 'U', symbol: '💧', name: 'Blue' },
    { code: 'B', symbol: '💀', name: 'Black' },
    { code: 'R', symbol: '🔥', name: 'Red' },
    { code: 'G', symbol: '🌳', name: 'Green' },
    { code: 'C', symbol: '💎', name: 'Colorless' }
]

const stats = reactive({
    totalMatches: 0,
    winRate: 0
})

// --- LÓGICA ---
onMounted(async () => {
    try {
        loading.value = true
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            window.location.href = '/login'
            return
        }

        const [profileRes, decksRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('decks').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        ])

        if (profileRes.error) throw profileRes.error

        profile.value = profileRes.data
        decks.value = decksRes.data || []
        newAvatarUrl.value = profile.value.avatar_url || ''

        await fetchStatsAndHistory(user.id, profile.value.username)

    } catch (err) {
        console.error("Error crítico:", err.message)
    } finally {
        loading.value = false
    }
})

const fetchStatsAndHistory = async (userId, username) => {
    try {
        const { data, error } = await supabase
            .from('match_participants')
            .select(`
                is_winner, deck_name_manual, player_name_manual, match_id,
                matches (id, fecha_partida, formato)
            `)
            .or(`user_id.eq.${userId},player_name_manual.ilike.${username}`)
            .order('created_at', { ascending: false })

        if (error) throw error
        if (data) {
            history.value = data.filter(p => p.matches)
            const total = history.value.length
            const wins = history.value.filter(p => p.is_winner === true).length
            stats.totalMatches = total
            stats.winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0
        }
    } catch (e) {
        console.warn("Error historial/stats:", e.message)
    }
}

const toggleColor = (code) => {
    const index = newDeck.color_identity.indexOf(code)
    if (index > -1) newDeck.color_identity.splice(index, 1)
    else newDeck.color_identity.push(code)
}

const openStats = async (deck) => {
    const deckNameLower = deck.nombre_personalizado.toLowerCase();
    const deckMatches = history.value.filter(h =>
        h.deck_name_manual && h.deck_name_manual.toLowerCase() === deckNameLower
    );

    if (deckMatches.length === 0) {
        selectedDeckStats.value = { ...deck, empty: true };
        showDeckStats.value = true;
        return;
    }

    const wins = deckMatches.filter(m => m.is_winner).length;
    const matchIds = deckMatches.map(m => m.match_id);

    const { data: opponents } = await supabase
        .from('match_participants')
        .select('player_name_manual, is_winner, match_id')
        .in('match_id', matchIds)
        .neq('player_name_manual', profile.value.username);

    const nemesisMap = {}, victimMap = {};

    deckMatches.forEach(dm => {
        const gameOpponents = opponents?.filter(o => o.match_id === dm.match_id) || [];
        gameOpponents.forEach(opp => {
            const name = opp.player_name_manual || 'Anónimo';
            if (dm.is_winner) {
                victimMap[name] = (victimMap[name] || 0) + 1;
            } else if (opp.is_winner) {
                nemesisMap[name] = (nemesisMap[name] || 0) + 1;
            }
        });
    });

    const getTop = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0] || [null, 0];

    selectedDeckStats.value = {
        ...deck,
        total: deckMatches.length,
        winRate: ((wins / deckMatches.length) * 100).toFixed(1),
        nemesis: getTop(nemesisMap),
        victim: getTop(victimMap)
    };
    showDeckStats.value = true;
}

const createDeck = async () => {
    if (!newDeck.nombre_personalizado) return
    isSubmitting.value = true
    try {
        const { data: { user } } = await supabase.auth.getUser()

        // Combinamos metadatos según formato
        const meta = {
            commander: newDeck.formato === 'commander' ? newDeck.commander_name : null,
            archetype: newDeck.formato === 'pauper' ? newDeck.pauper_archetype : null,
            colors: newDeck.color_identity.join(',')
        }

        const { data, error } = await supabase
            .from('decks')
            .insert([{
                nombre_personalizado: newDeck.nombre_personalizado,
                formato: newDeck.formato,
                decklist_url: newDeck.decklist_url,
                image_url: newDeck.image_url,
                user_id: user.id,
                // Asumiendo que añades estas columnas a tu DB:
                commander_name: meta.commander,
                archetype: meta.archetype,
                color_identity: meta.colors
            }])
            .select()

        if (error) throw error

        decks.value.unshift(data[0])
        showAddDeck.value = false
        resetForm()
    } catch (err) {
        alert("Error al crear: " + err.message)
    } finally {
        isSubmitting.value = false
    }
}

const resetForm = () => {
    newDeck.nombre_personalizado = ''
    newDeck.decklist_url = ''
    newDeck.image_url = ''
    newDeck.formato = 'commander'
    newDeck.commander_name = ''
    newDeck.pauper_archetype = ''
    newDeck.color_identity = []
}

const updateAvatar = async () => {
    if (!newAvatarUrl.value) return
    isSubmitting.value = true
    try {
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('profiles').update({ avatar_url: newAvatarUrl.value }).eq('id', user.id)
        profile.value.avatar_url = newAvatarUrl.value
        showEditAvatar.value = false
    } catch (err) {
        alert(err.message)
    } finally {
        isSubmitting.value = false
    }
}

const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '---'
const openDecklist = (url) => { if (url) window.open(url, '_blank') }
async function handleLogout() { await supabase.auth.signOut(); window.location.href = '/' }
</script>

<template>
    <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
        <p>Invocando perfil...</p>
    </div>

    <div v-else-if="profile" class="profile-view-root">
        <div class="relative-content fade-in">
            <header class="profile-main-header">
                <nav class="top-bar">
                    <span class="brand">LILLIANA TRACKER</span>
                    <button @click="handleLogout" class="logout-btn">Cerrar Sesión</button>
                </nav>

                <div class="hero-section">
                    <div class="avatar-wrapper" @click="showEditAvatar = true">
                        <div v-if="profile.avatar_url" class="avatar-image-container">
                            <img :src="profile.avatar_url" class="avatar-image" />
                        </div>
                        <div v-else class="avatar-circle">
                            {{ profile.username?.charAt(0).toUpperCase() }}
                        </div>
                        <div class="avatar-glow"></div>
                        <div class="edit-overlay"><span>CAMBIAR</span></div>
                    </div>
                    <div class="hero-text">
                        <h1 class="username-title">{{ profile.username }}</h1>
                        <p class="rank-subtitle">Planeswalker de Élite</p>
                    </div>
                </div>

                <div class="quick-stats-row">
                    <div class="q-stat">
                        <span class="q-num">{{ decks.length }}</span>
                        <span class="q-label">Mazos</span>
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

            <section class="content-section">
                <div class="section-header-bar">
                    <h2 class="section-title">Tus Mazos</h2>
                    <button @click="showAddDeck = true" class="add-deck-btn">+ NUEVO MAZO</button>
                </div>
                <div class="decks-layout-grid">
                    <DeckCard v-for="deck in decks" :key="deck.id" :deck="deck" @click="openDecklist(deck.decklist_url)"
                        @show-stats="openStats(deck)" />
                    <div v-if="decks.length === 0" class="empty-state-text">No has registrado mazos todavía.</div>
                </div>
            </section>

            <section class="content-section">
                <h2 class="section-title">Historial de Partidas</h2>
                <div class="history-list">
                    <div v-for="entry in history" :key="entry.match_id" class="history-item">
                        <div class="h-date">{{ formatDate(entry.matches.fecha_partida) }}</div>
                        <div class="h-main">
                            <span class="h-deck">{{ entry.deck_name_manual || 'Mazo sin nombre' }}</span>
                            <span class="h-format">{{ entry.matches.formato }}</span>
                        </div>
                        <div class="h-result" :class="entry.is_winner ? 'win' : 'loss'">
                            {{ entry.is_winner ? 'VICTORIA' : 'DERROTA' }}
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <div v-if="showAddDeck || showEditAvatar || showDeckStats" class="modal-overlay"
            @click.self="showAddDeck = false; showEditAvatar = false; showDeckStats = false">

            <div v-if="showDeckStats" class="modal-content glass-modal stats-modal-large fade-in-up">
                <div class="modal-header">
                    <div class="header-indicator stats"></div>
                    <div class="header-titles">
                        <span class="deck-format-tag">{{ selectedDeckStats.formato }}</span>
                        <h3>{{ selectedDeckStats.nombre_personalizado }}</h3>
                    </div>
                    <button class="close-btn-styled" @click="showDeckStats = false">✕</button>
                </div>

                <div v-if="selectedDeckStats.empty" class="empty-state-stats">
                    <div class="no-data-icon">📜</div>
                    <p>No hay registros de este mazo.</p>
                </div>

                <div v-else class="stats-grid-container">
                    <div class="main-metrics">
                        <div class="metric-card">
                            <span class="m-val">{{ selectedDeckStats.winRate }}%</span>
                            <span class="m-lab">Efectividad Total</span>
                        </div>
                        <div class="metric-card">
                            <span class="m-val">{{ selectedDeckStats.total }}</span>
                            <span class="m-lab">Partidas Jugadas</span>
                        </div>
                    </div>

                    <div class="rival-tracking">
                        <h4>Registro de Rivales</h4>
                        <div class="rival-row nemesis">
                            <span class="r-tag">NÉMESIS</span>
                            <span class="r-name">{{ selectedDeckStats.nemesis[0] }}</span>
                            <span class="r-score">{{ selectedDeckStats.nemesis[1] }} derrotas</span>
                        </div>
                        <div class="rival-row victim">
                            <span class="r-tag">VÍCTIMA</span>
                            <span class="r-name">{{ selectedDeckStats.victim[0] }}</span>
                            <span class="r-score">{{ selectedDeckStats.victim[1] }} victorias</span>
                        </div>
                    </div>

                    <div v-if="selectedDeckStats.commander_name" class="deck-info-footer">
                        <strong>Comandante:</strong> {{ selectedDeckStats.commander_name }}
                    </div>
                </div>
            </div>

            <div v-if="showAddDeck" class="modal-content glass-modal add-deck-modal fade-in-up">
                <div class="modal-header">
                    <div class="header-indicator"></div>
                    <h3>FORJAR NUEVO MAZO</h3>
                    <button class="close-btn-styled" @click="showAddDeck = false">✕</button>
                </div>

                <div class="magic-form">
                    <div class="form-scroll-area">
                        <div class="input-group">
                            <label>Nombre del Mazo</label>
                            <input v-model="newDeck.nombre_personalizado" class="magic-input"
                                placeholder="Ej: Urza's Destiny" />
                        </div>

                        <div class="grid-2-col">
                            <div class="input-group">
                                <label>Formato</label>
                                <select v-model="newDeck.formato" class="magic-input">
                                    <option value="commander">Commander</option>
                                    <option value="pauper">Pauper</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label>Identidad de Color</label>
                                <div class="color-picker-mini">
                                    <button v-for="c in colorOptions" :key="c.code" @click="toggleColor(c.code)"
                                        :class="['color-btn', { active: newDeck.color_identity.includes(c.code) }]"
                                        :title="c.name">
                                        {{ c.symbol }}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div v-if="newDeck.formato === 'commander'" class="input-group special-field fade-in">
                            <label>Nombre del Comandante</label>
                            <input v-model="newDeck.commander_name" class="magic-input gold-border"
                                placeholder="Ej: Atraxa, Praetors' Voice" />
                        </div>

                        <div v-if="newDeck.formato === 'pauper'" class="input-group special-field fade-in">
                            <label>Arquetipo</label>
                            <input v-model="newDeck.pauper_archetype" class="magic-input blue-border"
                                placeholder="Ej: Burn, Mono Blue Delver..." />
                        </div>

                        <div class="input-group">
                            <label>URL Arte de Portada</label>
                            <input v-model="newDeck.image_url" class="magic-input" placeholder="https://..." />
                        </div>

                        <div class="input-group">
                            <label>Decklist (Opcional)</label>
                            <input v-model="newDeck.decklist_url" class="magic-input"
                                placeholder="Moxfield, Goldfish..." />
                        </div>
                    </div>

                    <button @click="createDeck" class="btn-submit-magic" :disabled="isSubmitting">
                        {{ isSubmitting ? 'REGISTRANDO...' : 'REGISTRAR MAZO' }}
                    </button>
                </div>
            </div>

            <div v-if="showEditAvatar" class="modal-content glass-modal fade-in-up">
                <div class="modal-header">
                    <div class="header-indicator"></div>
                    <h3>EDITAR AVATAR</h3>
                    <button class="close-btn-styled" @click="showEditAvatar = false">✕</button>
                </div>
                <div class="avatar-form">
                    <div class="input-group">
                        <label>URL DE LA IMAGEN</label>
                        <input v-model="newAvatarUrl" class="magic-input" placeholder="https://..." />
                    </div>
                    <button @click="updateAvatar" class="btn-submit-magic" :disabled="isSubmitting">GUARDAR
                        CAMBIOS</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* --- BASE & UTILS --- */
.profile-view-root {
    min-height: 100vh;
    color: white;
    padding-bottom: 120px;
    font-family: 'Inter', sans-serif;
}

.relative-content {
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
}

/* --- HEADER --- */
.top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40px;
}

.brand {
    font-weight: 900;
    color: #3b82f6;
    letter-spacing: 2px;
    font-size: 0.8rem;
}

.logout-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.75rem;
}

.hero-section {
    display: flex;
    align-items: center;
    gap: 30px;
    margin-bottom: 40px;
}

.avatar-wrapper {
    position: relative;
    width: 110px;
    height: 110px;
    cursor: pointer;
}

.avatar-image-container,
.avatar-circle {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 3px solid #3b82f6;
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
    font-size: 2.5rem;
    font-weight: 900;
}

.edit-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: 0.3s;
    font-size: 0.6rem;
    font-weight: 900;
}

.avatar-wrapper:hover .edit-overlay {
    opacity: 1;
}

.username-title {
    font-size: clamp(1.8rem, 5vw, 3rem);
    font-weight: 900;
    margin: 0;
}

.rank-subtitle {
    color: #60a5fa;
    text-transform: uppercase;
    font-size: 0.75rem;
    font-weight: 800;
}

.quick-stats-row {
    display: flex;
    gap: 15px;
    padding: 25px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.q-stat {
    flex: 1;
    text-align: center;
}

.q-num {
    display: block;
    font-size: 1.5rem;
    font-weight: 900;
    color: #3b82f6;
}

.q-label {
    font-size: 0.6rem;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 800;
}

/* --- MAZOS GRID --- */
.decks-layout-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}

.section-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 40px 0 20px;
}

.section-title {
    font-size: 1rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 15px;
    margin-bottom: 15px;
}

.add-deck-btn {
    background: #3b82f6;
    color: white;
    padding: 10px 18px;
    border-radius: 10px;
    font-weight: 900;
    font-size: 0.7rem;
    border: none;
    cursor: pointer;
    transition: 0.2s;
}

.add-deck-btn:hover {
    background: #2563eb;
    transform: scale(1.05);
}

/* --- HISTORIAL --- */
.history-list {
    background: rgba(30, 41, 59, 0.4);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
}

.history-item {
    display: grid;
    grid-template-columns: 80px 1fr auto;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.h-date {
    font-size: 0.7rem;
    color: #64748b;
}

.h-deck {
    display: block;
    font-weight: 700;
    color: #f1f5f9;
    font-size: 0.9rem;
}

.h-format {
    font-size: 0.6rem;
    color: #3b82f6;
    text-transform: uppercase;
    font-weight: 900;
}

.h-result {
    font-size: 0.6rem;
    font-weight: 900;
    padding: 5px 10px;
    border-radius: 6px;
}

.win {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
}

.loss {
    background: rgba(239, 68, 68, 0.1);
    color: #f87171;
}

/* --- MODAL GENERAL --- */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.9);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 20px;
}

.glass-modal {
    background: #0f172a;
    padding: 30px;
    border-radius: 28px;
    width: 100%;
    border: 1px solid rgba(59, 130, 246, 0.2);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 25px;
    position: relative;
}

.close-btn-styled {
    background: none;
    border: none;
    color: #64748b;
    font-size: 1.2rem;
    cursor: pointer;
    transition: 0.2s;
}

.close-btn-styled:hover {
    color: white;
}

/* --- MODAL AÑADIR MAZO (NUEVO) --- */
.add-deck-modal {
    max-width: 500px;
}

.grid-2-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

.input-group label {
    display: block;
    font-size: 0.65rem;
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    margin-bottom: 8px;
    letter-spacing: 0.5px;
}

.magic-input {
    background: #1e293b;
    border: 1px solid #334155;
    padding: 12px 16px;
    border-radius: 12px;
    color: white;
    width: 100%;
    font-size: 0.9rem;
    transition: 0.3s;
    margin-bottom: 15px;
}

.magic-input:focus {
    border-color: #3b82f6;
    outline: none;
    background: #243347;
}

.gold-border {
    border-color: #ca8a04 !important;
}

.blue-border {
    border-color: #2563eb !important;
}

.color-picker-mini {
    display: flex;
    gap: 4px;
    background: #1e293b;
    padding: 5px;
    border-radius: 10px;
    border: 1px solid #334155;
}

.color-btn {
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8rem;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: 0.2s;
}

.color-btn.active {
    background: #3b82f6;
    border-color: #60a5fa;
    transform: scale(1.1);
}

/* --- MODAL ESTADÍSTICAS (NUEVO) --- */
.stats-modal-large {
    max-width: 450px;
}

.header-titles h3 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 900;
}

.deck-format-tag {
    font-size: 0.6rem;
    background: #3b82f6;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 900;
    text-transform: uppercase;
}

.main-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 25px;
}

.metric-card {
    background: #1e293b;
    padding: 20px;
    border-radius: 20px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.m-val {
    display: block;
    font-size: 1.8rem;
    font-weight: 900;
    color: #a855f7;
}

.m-lab {
    font-size: 0.65rem;
    color: #94a3b8;
    font-weight: 700;
    text-transform: uppercase;
}

.rival-tracking h4 {
    font-size: 0.7rem;
    color: #64748b;
    text-transform: uppercase;
    margin-bottom: 15px;
}

.rival-row {
    display: flex;
    align-items: center;
    padding: 12px;
    border-radius: 12px;
    margin-bottom: 10px;
    font-size: 0.85rem;
}

.nemesis {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
}

.victim {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.2);
}

.r-tag {
    font-size: 0.55rem;
    font-weight: 900;
    padding: 3px 6px;
    border-radius: 4px;
    margin-right: 10px;
}

.nemesis .r-tag {
    background: #ef4444;
}

.victim .r-tag {
    background: #10b981;
}

.r-name {
    font-weight: 700;
    flex: 1;
}

.r-score {
    font-size: 0.75rem;
    color: #94a3b8;
}

.btn-submit-magic {
    width: 100%;
    padding: 16px;
    background: #3b82f6;
    border-radius: 14px;
    color: white;
    font-weight: 900;
    border: none;
    cursor: pointer;
    transition: 0.3s;
    margin-top: 10px;
}

.btn-submit-magic:hover {
    background: #2563eb;
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
}

/* Animaciones */
.fade-in-up {
    animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>