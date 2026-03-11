<template>
    <div class="app-container fade-in">
        <header class="home-header">
            <span class="badge">ARCHIVO DE PLANESWALKER</span>
            <h1 class="main-title">Historial de Partidas</h1>
            <p class="subtitle">Registros de todos los encuentros en el plano.</p>
        </header>

        <div v-if="loading" class="loading-container">
            <div class="spinner"></div>
            <p class="subtitle">Buscando en los anales...</p>
        </div>

        <div v-else-if="matches.length === 0" class="empty-state-card card-inner">
            <div class="avatar" style="margin: 0 auto 20px;">📜</div>
            <h2>No hay registros</h2>
            <p class="subtitle" style="margin-bottom: 20px;">Aún no hay historias que contar en este plano.</p>
            <router-link to="/partida/nueva" class="btn-action" style="max-width: 250px; margin: 0 auto;">
                Registrar mi primera partida
            </router-link>
        </div>

        <div v-else class="grid-historial">
            <router-link v-for="(match, index) in matches" :key="match.id" :to="`/partida/${match.id}`"
                class="match-link-container" :style="{ animationDelay: (index * 0.05) + 's' }">
                <div class="card-inner match-card-glass">
                    <div class="match-card-top">
                        <div class="format-group">
                            <span :class="['format-tag', match.formato?.toLowerCase()]">{{ match.formato }}</span>
                        </div>
                        <div class="date-group">
                            <span class="date-label">{{ formatDate(match.fecha_partida) }}</span>
                            <span class="view-detail-icon">→</span>
                        </div>
                    </div>

                    <div class="participants-grid">
                        <div v-for="p in match.match_participants" :key="p.id" class="participant-item"
                            :class="{ 'winner-item': p.is_winner }">

                            <div class="p-info">
                                <span class="p-name">
                                    {{ p.profiles?.username || p.player_name_manual }}
                                    <span v-if="p.is_winner" class="winner-crown">🏆</span>
                                </span>
                                <span class="p-deck">{{ p.decks?.nombre_personalizado || p.deck_name_manual }}</span>
                            </div>
                        </div>
                    </div>

                    <div v-if="match.notas_globales" class="match-notes">
                        <span class="notes-icon">💬</span>
                        <p>"{{ match.notas_globales }}"</p>
                    </div>
                </div>
            </router-link>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/supabaseClient'

const matches = ref([])
const loading = ref(true)

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    })
}

onMounted(async () => {
    try {
        const { data, error } = await supabase
            .from('matches')
            .select(`
                *,
                match_participants (
                    *,
                    profiles (username),
                    decks (nombre_personalizado)
                )
            `)
            .order('fecha_partida', { ascending: false })

        if (error) throw error
        matches.value = data
    } catch (err) {
        console.error('Error cargando historial:', err.message)
    } finally {
        loading.value = false
    }
})
</script>

<style scoped>
.grid-historial {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-bottom: 40px;
    margin: 25px;
}

/* Contenedor del Link */
.match-link-container {
    text-decoration: none;
    color: inherit;
    display: block;
    transition: transform 0.2s ease;
}

.match-link-container:hover {
    transform: scale(1.01);
}

.match-card-glass {
    border-radius: 24px;
    padding: 20px;
    background: rgba(30, 41, 59, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.3s ease;
}

.match-link-container:hover .match-card-glass {
    background: rgba(30, 41, 59, 0.6);
    border-color: rgba(59, 130, 246, 0.3);
    box-shadow: 0 10px 20px -10px rgba(0, 0, 0, 0.5);
}

.match-card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-bottom: 12px;
}

.date-group {
    display: flex;
    align-items: center;
    gap: 10px;
}

.view-detail-icon {
    color: #3b82f6;
    font-weight: bold;
    opacity: 0;
    transform: translateX(-10px);
    transition: all 0.3s ease;
}

.match-link-container:hover .view-detail-icon {
    opacity: 1;
    transform: translateX(0);
}

/* FORMAT TAGS */
.format-tag {
    font-size: 0.65rem;
    font-weight: 900;
    padding: 4px 12px;
    border-radius: 50px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.format-tag.commander {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    border: 1px solid rgba(59, 130, 246, 0.3);
}

.format-tag.pauper {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.3);
}

.date-label {
    font-size: 0.75rem;
    color: #64748b;
    font-weight: 600;
}

/* PARTICIPANTES */
.participants-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 10px;
}

.participant-item {
    background: rgba(15, 23, 42, 0.3);
    padding: 10px 14px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.02);
}

.participant-item.winner-item {
    background: rgba(234, 179, 8, 0.05);
    border: 1px solid rgba(234, 179, 8, 0.2);
}

.p-info {
    display: flex;
    flex-direction: column;
}

.p-name {
    font-size: 0.85rem;
    font-weight: 800;
    color: #f1f5f9;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.winner-crown {
    font-size: 0.8rem;
    filter: drop-shadow(0 0 4px rgba(234, 179, 8, 0.4));
}

.p-deck {
    font-size: 0.7rem;
    color: #64748b;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* NOTAS */
.match-notes {
    margin-top: 16px;
    background: rgba(255, 255, 255, 0.03);
    padding: 10px 14px;
    border-radius: 12px;
    display: flex;
    gap: 8px;
    align-items: center;
}

.notes-icon {
    font-size: 0.8rem;
    opacity: 0.5;
}

.match-notes p {
    font-size: 0.75rem;
    color: #94a3b8;
    font-style: italic;
    margin: 0;
}

/* LOADING STATE */
.loading-container {
    text-align: center;
    padding: 100px;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(59, 130, 246, 0.1);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 15px;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 480px) {
    .participants-grid {
        grid-template-columns: 1fr;
    }
}
</style>