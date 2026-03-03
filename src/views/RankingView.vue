<template>
    <div class="hall-of-fame-root fade-in">
        <header class="honor-header">
            <div class="title-shimmer">
                <span class="season-tag">TEMPORADA 2026</span>
                <h1 class="monumental-title">Hall of Fame</h1>
            </div>
            <p class="honor-subtitle">Inmortalizando a los Planeswalkers más letales del plano.</p>
        </header>

        <div v-if="loading" class="loading-state">
            <div class="magic-loader"></div>
            <p>Invocando registros antiguos...</p>
        </div>

        <div v-else class="honor-scroll">
            <div class="ranking-container">
                <div v-for="(player, index) in leaders" :key="player.username" class="honor-row"
                    :class="[getRankClass(index), { 'is-link': player.is_registered }]" @click="goToProfile(player)">
                    <div class="rank-badge-wrapper">
                        <div class="rank-number" v-if="index > 2">#{{ index + 1 }}</div>
                        <div class="medal-display" v-else>{{ getMedal(index) }}</div>
                    </div>

                    <div class="warrior-profile">
                        <div class="name-wrapper">
                            <h3 class="warrior-name">{{ player.username }}</h3>
                            <span v-if="player.is_registered" class="registered-badge">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                    <path
                                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                </svg>
                            </span>
                        </div>
                        <div class="warrior-meta">
                            <span class="victory-count">{{ player.total_wins }} Victorias</span>
                            <i class="separator"></i>
                            <span class="match-total">{{ player.total_matches }} Partidas</span>
                        </div>
                    </div>

                    <div class="lethality-meter">
                        <div class="meter-content">
                            <span class="meter-value">{{ player.win_rate }}%</span>
                            <span class="meter-label">Eficiencia</span>
                        </div>
                        <div class="meter-bar-bg">
                            <div class="meter-bar-fill"
                                :style="{ width: player.win_rate + '%', backgroundColor: getMeterColor(player.win_rate, index) }">
                            </div>
                        </div>
                    </div>

                    <div v-if="player.is_registered" class="profile-arrow">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                            stroke-width="3">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                </div>

                <div v-if="leaders.length === 0" class="empty-honor">
                    Nadie ha reclamado su lugar en la historia todavía.
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabaseClient'
import { useRouter } from 'vue-router' // Importamos el router

const router = useRouter()
const leaders = ref([])
const loading = ref(true)

onMounted(async () => {
    try {
        loading.value = true

        // Traemos todos los participantes. 
        // No podemos usar !inner aquí porque la relación en la DB es por ID, 
        // pero nosotros lo haremos por nombre en el código.
        const { data, error } = await supabase
            .from('match_participants')
            .select(`
                is_winner,
                player_name_manual
            `)

        if (error) throw error

        // Traemos todos los perfiles registrados para comparar
        const { data: registeredUsers, error: pError } = await supabase
            .from('profiles')
            .select('username')

        if (pError) throw pError

        // Creamos un Set para búsqueda rápida de usuarios con cuenta
        const usernamesConCuenta = new Set(registeredUsers.map(u => u.username))

        const stats = {}

        data.forEach(row => {
            const name = row.player_name_manual

            // SOLO si el nombre manual existe en nuestra lista de usuarios con cuenta
            if (name && usernamesConCuenta.has(name)) {
                if (!stats[name]) {
                    stats[name] = {
                        username: name,
                        total_wins: 0,
                        total_matches: 0,
                        is_registered: true
                    }
                }

                stats[name].total_matches++
                if (row.is_winner) stats[name].total_wins++
            }
        })

        leaders.value = Object.values(stats)
            .map(p => ({
                ...p,
                win_rate: p.total_matches > 0 ? Math.round((p.total_wins / p.total_matches) * 100) : 0
            }))
            .sort((a, b) => b.total_wins - a.total_wins)
            .slice(0, 15)

    } catch (err) {
        console.error("Error en el Ranking:", err.message)
    } finally {
        loading.value = false
    }
})

// Asegúrate de que la función de navegación no tenga filtros:
const goToProfile = (player) => {
    // Navegamos directamente con el username que tengamos
    router.push(`/profile/${player.username}`)
}

const getMedal = (index) => ['🥇', '🥈', '🥉'][index]
const getRankClass = (index) => {
    if (index === 0) return 'tier-gold'
    if (index === 1) return 'tier-silver'
    if (index === 2) return 'tier-bronze'
    return 'tier-common'
}

const getMeterColor = (wr, index) => {
    if (index === 0) return '#fbbf24'
    if (index === 1) return '#cbd5e1'
    if (index === 2) return '#d97706'
    return wr > 50 ? '#3b82f6' : '#475569'
}
</script>

<style scoped>
/* (Mantenemos tus estilos y añadimos los nuevos para la interactividad) */

.is-link {
    cursor: pointer;
}

.name-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
}

.registered-badge {
    color: #3b82f6;
    display: flex;
    align-items: center;
}

.profile-arrow {
    opacity: 0;
    transform: translateX(-10px);
    transition: 0.3s;
    color: #3b82f6;
    margin-left: 10px;
}

.honor-row.is-link:hover .profile-arrow {
    opacity: 1;
    transform: translateX(0);
}

.honor-row.is-link:hover {
    background: rgba(59, 130, 246, 0.05);
    border-bottom-color: #3b82f6;
}

/* Resto de tus estilos originales... */
.hall-of-fame-root {
    padding: 40px 20px;
    max-width: 900px;
    margin: 0 auto;
    color: #f8fafc;
}

.honor-header {
    text-align: center;
    margin-bottom: 60px;
}

.monumental-title {
    font-size: 3.5rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -2px;
    margin: 10px 0;
    background: linear-gradient(to bottom, #fff 30%, #64748b 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.season-tag {
    font-weight: 800;
    color: #3b82f6;
    letter-spacing: 4px;
    font-size: 0.8rem;
}

.honor-row {
    display: flex;
    align-items: center;
    padding: 24px;
    margin-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
    position: relative;
}

.rank-badge-wrapper {
    width: 60px;
    display: flex;
    justify-content: center;
}

.medal-display {
    font-size: 2.2rem;
}

.rank-number {
    font-weight: 900;
    color: #334155;
    font-size: 1.2rem;
}

.warrior-profile {
    flex-grow: 1;
    padding: 0 20px;
}

.warrior-name {
    margin: 0;
    font-weight: 800;
}

.warrior-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 6px;
    font-size: 0.85rem;
    color: #64748b;
}

.separator {
    width: 4px;
    height: 4px;
    background: #334155;
    border-radius: 50%;
}

.lethality-meter {
    text-align: right;
    min-width: 120px;
}

.meter-value {
    display: block;
    font-size: 1.4rem;
    font-weight: 900;
}

.meter-label {
    font-size: 0.6rem;
    text-transform: uppercase;
    color: #475569;
}

.meter-bar-bg {
    height: 3px;
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    margin-top: 8px;
    border-radius: 10px;
    overflow: hidden;
}

.meter-bar-fill {
    height: 100%;
    transition: width 1s ease-out;
}
</style>