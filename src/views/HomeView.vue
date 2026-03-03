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

        // 1. Obtenemos el usuario logueado para saber quién eres
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 2. Traemos tu perfil para tener tu username oficial ('DGDRK')
        const { data: p } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        profile.value = p;
        const miNombre = p?.username;

        // 3. LA SELECT QUE FUNCIONA:
        // Buscamos en match_participants donde el ID sea el tuyo 
        // O donde el nombre manual coincida con tu username.
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
            // Esta es la lógica "mágica" que combina ambos mundos
            .or(`user_id.eq.${user.id},player_name_manual.ilike.${miNombre}`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 4. PROCESAMIENTO DE DATOS
        if (participations) {
            // Filtramos por si acaso hay nulos en la relación de matches
            const validData = participations.filter(item => item.matches);

            totalMatches.value = validData.length;

            // Calculamos victorias
            const wins = validData.filter(item => item.is_winner === true).length;
            winRate.value = totalMatches.value > 0
                ? Math.round((wins / totalMatches.value) * 100)
                : 0;

            // Mapeamos las 3 más recientes para la interfaz
            recentMatches.value = validData.slice(0, 3).map(item => ({
                id: item.matches.id,
                formato: item.matches.formato,
                fecha_partida: item.matches.fecha_partida,
                deck_name_manual: item.deck_name_manual,
                user_won: item.is_winner
            }));

            console.log("🎯 Partidas vinculadas con éxito:", validData);
        }

    } catch (err) {
        console.error("❌ Error recuperando tus partidas:", err.message);
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
    <div class="app-container fade-in">
        <header class="home-header">
            <span class="badge">Lilliana Tracker v3.0</span>
            <h1 class="main-title">Lilliana Tracker</h1>
            <p class="welcome-text">
                Bienvenido de nuevo, <span class="highlight-user">{{ profile?.username || profile?.display_name ||
                    'Planeswarker' }}</span>
            </p>
        </header>

        <div class="grid-jugadores">
            <div class="player-card">
                <div class="card-inner">
                    <div class="card-header-box">
                        <div class="avatar-wrapper">
                            <div class="avatar-icon">📊</div>
                            <span class="status-dot"></span>
                        </div>
                        <div class="header-text">
                            <h2>Win Rate</h2>
                            <p class="header-subtitle">Tu efectividad en cada partida</p>
                        </div>
                    </div>

                    <div class="main-stats-container">
                        <div class="stats-glass-card">
                            <span class="stats-label">HISTORIAL GLOBAL</span>
                            <div class="winrate-display">
                                <h3 class="percentage-number">{{ winRate }}%</h3>
                                <div class="total-games-pill">{{ totalMatches }} Partidas</div>
                            </div>
                            <button class="btn-primary" @click="$router.push('/partida/nueva')">
                                <span class="icon">+</span> Nueva Partida
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="player-card" style="animation-delay: 0.15s;">
                <div class="card-inner">
                    <div class="card-header-box">
                        <div class="avatar-wrapper">
                            <div class="avatar-icon">📜</div>
                        </div>
                        <div class="header-text">
                            <h2>Actividad</h2>
                            <p class="header-subtitle">Tus últimos enfrentamientos</p>
                        </div>
                    </div>

                    <div class="activity-feed">
                        <div v-if="recentMatches.length === 0" class="empty-state">
                            <p>Buscando registros en el archivo...</p>
                        </div>

                        <div v-for="match in recentMatches" :key="match.id" class="match-card-item"
                            :class="match.formato === 'commander' ? 'commander-accent' : 'pauper-accent'">

                            <div class="match-card-header">
                                <span class="format-tag">{{ match.formato }}</span>
                                <span class="match-date-tag">{{ formatDate(match.fecha_partida) }}</span>
                            </div>

                            <div class="match-card-body">
                                <div class="result-indicator" :class="match.user_won ? 'win' : 'loss'">
                                    {{ match.user_won ? '🏆 VICTORIA' : '💀 DERROTA' }}
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
</template>

<style scoped>
/* --- VARIABLES Y RESET --- */
.app-container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 40px 20px 100px;
    /* Mucho espacio abajo para la nav */
}

/* --- HEADER --- */
.home-header {
    text-align: center;
    margin-bottom: 50px;
    /* Espacio entre header y cards */
}

.badge {
    display: inline-block;
    background: rgba(59, 130, 246, 0.1);
    color: #60a5fa;
    padding: 6px 16px;
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 1px;
    border: 1px solid rgba(59, 130, 246, 0.2);
    margin-bottom: 15px;
}

.main-title {
    font-size: clamp(2.2rem, 8vw, 3.5rem);
    font-weight: 900;
    line-height: 1.1;
    margin-bottom: 10px;
    background: linear-gradient(to bottom, #ffffff, #94a3b8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.welcome-text {
    color: #94a3b8;
    font-size: 1.1rem;
}

.highlight-user {
    color: #3b82f6;
    font-weight: 700;
}

/* --- GRID --- */
.grid-jugadores {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: 30px;
}

/* --- CARDS BASE --- */
.card-inner {
    background: rgba(30, 41, 59, 0.4);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 32px;
    padding: 30px;
    height: 100%;
    transition: transform 0.3s ease;
}

.card-header-box {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 30px;
}

.avatar-icon {
    font-size: 1.8rem;
    background: #0f172a;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.05);
}

.header-text h2 {
    font-size: 1.4rem;
    font-weight: 800;
    color: #f1f5f9;
    margin: 0;
}

.header-subtitle {
    font-size: 0.9rem;
    color: #64748b;
    margin: 2px 0 0;
}

/* --- STATS BOX --- */
.stats-glass-card {
    background: rgba(15, 23, 42, 0.6);
    border-radius: 24px;
    padding: 25px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.03);
}

.stats-label {
    font-size: 0.7rem;
    font-weight: 900;
    color: #3b82f6;
    letter-spacing: 2px;
}

.winrate-display {
    margin: 20px 0 25px;
}

.percentage-number {
    font-size: 4.5rem;
    font-weight: 900;
    color: #fff;
    line-height: 1;
    margin-bottom: 10px;
}

.total-games-pill {
    display: inline-block;
    padding: 4px 14px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 50px;
    font-size: 0.8rem;
    color: #94a3b8;
}

/* --- ACTIVITY FEED --- */
.activity-feed {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.match-card-item {
    background: rgba(15, 23, 42, 0.4);
    border-radius: 20px;
    padding: 18px;
    border: 1px solid rgba(255, 255, 255, 0.02);
    border-left: 5px solid #334155;
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
    align-items: center;
    margin-bottom: 12px;
}

.format-tag {
    font-size: 0.65rem;
    font-weight: 900;
    text-transform: uppercase;
    color: #94a3b8;
    letter-spacing: 1px;
}

.match-date-tag {
    font-size: 0.75rem;
    color: #475569;
}

.match-card-body {
    display: flex;
    align-items: center;
    gap: 15px;
}

.result-indicator {
    font-size: 0.7rem;
    font-weight: 900;
    padding: 5px 12px;
    border-radius: 8px;
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
    font-size: 0.9rem;
    color: #e2e8f0;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* --- BUTTONS --- */
.btn-primary {
    width: 100%;
    padding: 16px;
    background: #3b82f6;
    color: #fff;
    border: none;
    border-radius: 16px;
    font-size: 1rem;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 10px 20px -5px rgba(59, 130, 246, 0.4);
    transition: all 0.3s ease;
}

.btn-primary:hover {
    background: #2563eb;
    transform: translateY(-2px);
    box-shadow: 0 15px 25px -5px rgba(59, 130, 246, 0.5);
}

/* --- ANIMATIONS --- */
.fade-in {
    animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* --- MOBILE OPTIMIZATION --- */
@media (max-width: 480px) {
    .app-container {
        padding: 20px 15px 100px;
    }

    .card-inner {
        padding: 20px;
    }

    .percentage-number {
        font-size: 3.5rem;
    }

    .match-card-body {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }

    .avatar-icon {
        width: 50px;
        height: 50px;
        font-size: 1.5rem;
    }
}
</style>