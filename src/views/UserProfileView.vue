<script setup>
import { ref, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabaseClient'
import DeckCard from '../components/DeckCard.vue'

const route = useRoute()
const router = useRouter()

// --- ESTADOS ---
const profile = ref(null)
const decks = ref([])
const loading = ref(true)

const stats = reactive({
    totalMatches: 0,
    winRate: 0
})

onMounted(async () => {
    try {
        loading.value = true
        // Obtenemos el username de los parámetros de la URL
        const usernameParam = route.params.username

        // 1. Buscamos el perfil por username
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', usernameParam)
            .single()

        if (profileError || !profileData) throw new Error("Planeswalker no encontrado")

        profile.value = profileData

        // 2. Cargamos sus mazos y estadísticas en paralelo usando su ID
        const [decksRes] = await Promise.all([
            supabase.from('decks')
                .select('*')
                .eq('user_id', profile.value.id)
                .order('created_at', { ascending: false })
        ])

        decks.value = decksRes.data || []
        await fetchStats(profile.value.id, profile.value.username)

    } catch (err) {
        console.error("Error cargando perfil ajeno:", err.message)
    } finally {
        loading.value = false
    }
})

const fetchStats = async (userId, username) => {
    try {
        const { data, error } = await supabase
            .from('match_participants')
            .select('is_winner')
            .or(`user_id.eq.${userId},player_name_manual.ilike.${username}`)

        if (error) throw error
        if (data && data.length > 0) {
            const total = data.length
            const wins = data.filter(p => p.is_winner === true).length
            stats.totalMatches = total
            stats.winRate = ((wins / total) * 100).toFixed(1)
        }
    } catch (e) {
        console.warn("Error stats:", e.message)
    }
}

const openDecklist = (url) => { if (url) window.open(url, '_blank') }
const goBack = () => router.back()
</script>

<template>
    <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
        <p>Localizando Planeswalker...</p>
    </div>

    <div v-else-if="profile" class="profile-view-root">
        <div class="relative-content fade-in">
            <header class="profile-main-header">
                <nav class="top-bar">
                    <button @click="goBack" class="back-btn">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                            stroke-width="3">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                        VOLVER AL RANKING
                    </button>
                    <span class="brand">LILLIANA TRACKER</span>
                </nav>

                <div class="hero-section">
                    <div class="avatar-wrapper readonly">
                        <div v-if="profile.avatar_url" class="avatar-image-container">
                            <img :src="profile.avatar_url" class="avatar-image" />
                        </div>
                        <div v-else class="avatar-circle">
                            {{ profile.username?.charAt(0).toUpperCase() }}
                        </div>
                        <div class="avatar-glow"></div>
                    </div>
                    <div class="hero-text">
                        <h1 class="username-title">{{ profile.username }}</h1>
                        <p class="rank-subtitle">Planeswalker de Élite</p>
                    </div>
                </div>

                <div class="quick-stats-row">
                    <div class="q-stat">
                        <span class="q-num">{{ decks.length }}</span>
                        <span class="q-label">Mazos Registrados</span>
                    </div>
                    <div class="q-stat">
                        <span class="q-num">{{ stats.totalMatches }}</span>
                        <span class="q-label">Partidas</span>
                    </div>
                    <div class="q-stat">
                        <span class="q-num">{{ stats.winRate }}%</span>
                        <span class="q-label">Eficiencia Actual</span>
                    </div>
                </div>
            </header>

            <main class="decks-section">
                <div class="decks-header-bar">
                    <h2 class="section-title">Arsenal de {{ profile.username }}</h2>
                </div>

                <div v-if="decks.length > 0" class="decks-layout-grid">
                    <DeckCard v-for="deck in decks" :key="deck.id" :deck="deck"
                        @click="openDecklist(deck.decklist_url)" />
                </div>
                <div v-else class="empty-decks">
                    <p>Este Planeswalker aún no ha revelado sus hechizos.</p>
                </div>
            </main>
        </div>
    </div>

    <div v-else class="error-state">
        <p>No se ha podido encontrar el rastro de este usuario.</p>
        <button @click="goBack" class="btn-submit-magic">Volver</button>
    </div>
</template>

<style scoped>
/* REUTILIZAMOS TUS ESTADOS Y AÑADIMOS AJUSTES PARA "READ-ONLY" */
.profile-view-root {
    min-height: 100vh;
    color: white;
    background: transparent;
}

.relative-content {
    position: relative;
    z-index: 1;
    max-width: 1100px;
    margin: 0 auto;
    padding: 20px;
}

/* Botón de volver */
.top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40px;
}

.back-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #60a5fa;
    padding: 10px 18px;
    border-radius: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.75rem;
    font-weight: 800;
    transition: 0.3s;
}

.back-btn:hover {
    background: rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
}

.brand {
    font-weight: 900;
    color: #3b82f6;
    letter-spacing: 2px;
    font-size: 0.8rem;
}

/* Avatar (Solo lectura, sin efectos de hover) */
.avatar-wrapper.readonly {
    cursor: default;
    width: 120px;
    height: 120px;
    position: relative;
}

.avatar-image-container {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid #3b82f6;
    position: relative;
    z-index: 2;
}

.avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar-circle {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    font-weight: 900;
    z-index: 2;
    position: relative;
}

.avatar-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 130%;
    height: 130%;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%);
    filter: blur(15px);
    z-index: 1;
}

.hero-section {
    display: flex;
    align-items: center;
    gap: 30px;
    margin-bottom: 40px;
}

.username-title {
    font-size: clamp(2rem, 5vw, 3.5rem);
    margin: 0;
    font-weight: 900;
}

.rank-subtitle {
    color: #60a5fa;
    font-weight: bold;
}

.quick-stats-row {
    display: flex;
    gap: 20px;
    padding: 30px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.q-stat {
    flex: 1;
    text-align: center;
}

.q-num {
    display: block;
    font-size: 2.2rem;
    font-weight: 900;
    color: #3b82f6;
}

.q-label {
    font-size: 0.7rem;
    color: #64748b;
    text-transform: uppercase;
}

.decks-header-bar {
    margin: 40px 0 20px;
}

.section-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: #f8fafc;
}

.decks-layout-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}

.empty-decks {
    text-align: center;
    padding: 60px;
    color: #64748b;
    font-style: italic;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 20px;
}

.loading-overlay,
.error-state {
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #3b82f6;
    gap: 20px;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(59, 130, 246, 0.1);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.fade-in {
    animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

.btn-submit-magic {
    padding: 12px 24px;
    background: #3b82f6;
    border: none;
    border-radius: 12px;
    color: white;
    font-weight: 800;
    cursor: pointer;
}
</style>