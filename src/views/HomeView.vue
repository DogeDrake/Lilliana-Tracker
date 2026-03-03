<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabaseClient'

const profile = ref(null)
const totalMatches = ref(0)
const winRate = ref(0)
const recentMatches = ref([])
const loading = ref(true)

onMounted(async () => {
    try {
        loading.value = true;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: p } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        profile.value = p;
        const miNombre = p?.username;

        const { data: participations, error } = await supabase
            .from('match_participants')
            .select(`
                is_winner,
                deck_name_manual,
                player_name_manual,
                user_id,
                matches!inner (
                    id, 
                    fecha_partida, 
                    formato
                )
            `)
            .or(`user_id.eq.${user.id},player_name_manual.ilike.${miNombre}`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (participations) {
            const validData = participations.filter(item => item.matches);
            totalMatches.value = validData.length;

            const wins = validData.filter(item => item.is_winner === true).length;
            winRate.value = totalMatches.value > 0
                ? Math.round((wins / totalMatches.value) * 100)
                : 0;

            recentMatches.value = validData.slice(0, 3).map(item => ({
                id: item.matches.id,
                formato: item.matches.formato,
                fecha_partida: item.matches.fecha_partida,
                deck_name_manual: item.deck_name_manual,
                user_won: item.is_winner
            }));
        }
    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        loading.value = false;
    }
});

const formatDate = (dateStr) => {
    if (!dateStr) return '---'
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}
</script>

<template>
    <div class="app-viewport fade-in">
        <div class="app-container">
            <header class="home-header">
                <span class="badge">Lilliana Tracker v3.0</span>
                <h1 class="main-title">Lilliana <span>Tracker</span></h1>
                <p class="welcome-text">
                    Bienvenido, <span class="highlight-user">{{ profile?.username || 'Planeswalker' }}</span>
                </p>
            </header>

            <div class="grid-jugadores">

                <div class="player-card">
                    <div class="card-inner">
                        <div class="card-header-box">
                            <div class="avatar-icon">📊</div>
                            <div class="header-text">
                                <h2>Win Rate</h2>
                                <p class="header-subtitle">Efectividad total</p>
                            </div>
                        </div>

                        <div class="stats-glass-card">
                            <span class="stats-label">HISTORIAL GLOBAL</span>
                            <div class="winrate-display">
                                <h3 class="percentage-number">{{ winRate }}%</h3>
                                <div class="total-games-pill">{{ totalMatches }} Partidas</div>
                            </div>
                            <button class="btn-primary" @click="$router.push('/partida/nueva')">
                                + Nueva Partida
                            </button>
                        </div>
                    </div>
                </div>

                <div class="player-card">
                    <div class="card-inner">
                        <div class="card-header-box">
                            <div class="avatar-icon">📜</div>
                            <div class="header-text">
                                <h2>Actividad</h2>
                                <p class="header-subtitle">Últimas partidas</p>
                            </div>
                        </div>

                        <div class="activity-feed">
                            <div v-if="loading" class="empty-state">Invocando datos...</div>
                            <div v-else-if="recentMatches.length === 0" class="empty-state">Sin registros aún.</div>

                            <div v-for="match in recentMatches" :key="match.id" class="match-card-item"
                                :class="match.formato === 'commander' ? 'commander-accent' : 'pauper-accent'">

                                <div class="match-card-header">
                                    <span class="format-tag">{{ match.formato }}</span>
                                    <span class="match-date-tag">{{ formatDate(match.fecha_partida) }}</span>
                                </div>

                                <div class="match-card-body">
                                    <div class="result-indicator" :class="match.user_won ? 'win' : 'loss'">
                                        {{ match.user_won ? '🏆 WIN' : '💀 LOSS' }}
                                    </div>
                                    <div class="match-deck-name">
                                        {{ match.deck_name_manual || 'Mazo estándar' }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
</template>

<style scoped>
/* Evita el scroll lateral y gestiona el espacio del navegador móvil */
.app-viewport {
    width: 100%;
    min-height: 100vh;
    overflow-x: hidden;
    background: transparent;
}

.app-container {
    width: 100%;
    max-width: 1100px;
    margin: 0 auto;
    padding: 30px 15px 120px;
    /* Padding extra para no chocar con la nav */
    box-sizing: border-box;
}

.home-header {
    text-align: center;
    margin-bottom: 40px;
}

.main-title {
    font-size: clamp(1.8rem, 8vw, 3rem);
    font-weight: 900;
    margin: 10px 0;
    color: #fff;
}

.main-title span {
    color: #3b82f6;
    font-weight: 300;
}

.badge {
    display: inline-block;
    background: rgba(59, 130, 246, 0.1);
    color: #60a5fa;
    padding: 4px 12px;
    border-radius: 100px;
    font-size: 0.7rem;
    border: 1px solid rgba(59, 130, 246, 0.2);
}

.grid-jugadores {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
}

.card-inner {
    background: rgba(30, 41, 59, 0.4);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    padding: 25px;
    height: 100%;
    box-sizing: border-box;
}

.card-header-box {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 25px;
}

.avatar-icon {
    font-size: 1.5rem;
    background: #0f172a;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 15px;
}

.stats-glass-card {
    background: rgba(15, 23, 42, 0.6);
    border-radius: 20px;
    padding: 20px;
    text-align: center;
}

.percentage-number {
    font-size: clamp(3rem, 10vw, 4.5rem);
    font-weight: 900;
    margin: 10px 0;
}

.activity-feed {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.match-card-item {
    background: rgba(15, 23, 42, 0.4);
    border-radius: 16px;
    padding: 15px;
    border-left: 4px solid #334155;
}

.commander-accent {
    border-left-color: #3b82f6;
}

.pauper-accent {
    border-left-color: #10b981;
}

.match-card-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.7rem;
    margin-bottom: 8px;
}

.match-card-body {
    display: flex;
    align-items: center;
    gap: 10px;
}

.result-indicator {
    font-size: 0.65rem;
    font-weight: 900;
    padding: 4px 8px;
    border-radius: 6px;
}

.result-indicator.win {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
}

.result-indicator.loss {
    background: rgba(239, 68, 68, 0.1);
    color: #f87171;
}

.match-deck-name {
    font-size: 0.85rem;
    color: #e2e8f0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.btn-primary {
    width: 100%;
    padding: 14px;
    background: #3b82f6;
    color: #fff;
    border: none;
    border-radius: 12px;
    font-weight: 800;
    cursor: pointer;
    transition: transform 0.2s;
}

.btn-primary:active {
    transform: scale(0.98);
}

@media (max-width: 600px) {
    .grid-jugadores {
        grid-template-columns: 1fr;
    }

    .card-inner {
        padding: 20px;
    }
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