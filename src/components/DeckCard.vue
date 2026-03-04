<script setup>
import { computed } from 'vue'

const props = defineProps({
    deck: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['click', 'show-stats'])

// 1. Configuración de Identidad de Color (Estándar Magic: WUBRGC)
const colorSpecs = {
    'W': { symbol: '☀️', class: 'mana-white', label: 'Blanco' },
    'U': { symbol: '💧', class: 'mana-blue', label: 'Azul' },
    'B': { symbol: '💀', class: 'mana-black', label: 'Negro' },
    'R': { symbol: '🔥', class: 'mana-red', label: 'Rojo' },
    'G': { symbol: '🌳', class: 'mana-green', label: 'Verde' },
    'C': { symbol: '💎', class: 'mana-colorless', label: 'Incoloro' }
}

const colorOrder = ['W', 'U', 'B', 'R', 'G', 'C']

// 2. Lógica para procesar el string de la DB (ej: "WURG")
const deckColors = computed(() => {
    if (!props.deck.color_identity) return []

    // Convertimos el string en un array de letras únicas
    const colorsPresent = props.deck.color_identity.toUpperCase().split('')

    // Filtramos y ordenamos según la Rueda de Maná
    return colorOrder
        .filter(char => colorsPresent.includes(char))
        .map(char => colorSpecs[char])
})
</script>

<template>
    <div class="deck-card" @click="emit('click', deck.decklist_url)">
        <div v-if="deck.image_url" class="card-bg-image" :style="{ backgroundImage: `url(${deck.image_url})` }"></div>
        <div class="card-overlay"></div>

        <div class="deck-accent" :class="deck.formato?.toLowerCase()"></div>

        <div class="deck-content">
            <div class="header-row">
                <div class="format-and-colors">
                    <span class="format-pill" :class="deck.formato?.toLowerCase()">
                        {{ deck.formato }}
                    </span>

                    <div v-if="deckColors.length" class="color-identity-row">
                        <div v-for="(color, index) in deckColors" :key="index" :class="['mana-orb', color.class]"
                            :title="color.label">
                            {{ color.symbol }}
                        </div>
                    </div>
                </div>

                <div v-if="deck.decklist_url" class="external-link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </div>
            </div>

            <h3 class="deck-name">{{ deck.nombre_personalizado || 'Mazo sin nombre' }}</h3>

            <div class="deck-details">
                <p v-if="deck.comandante_nombre" class="detail-tag">
                    <span class="label">Comandante:</span> {{ deck.comandante_nombre }}
                </p>
                <p v-if="deck.arquetipo_pauper" class="detail-tag">
                    <span class="label">Arquetipo:</span> {{ deck.arquetipo_pauper }}
                </p>
            </div>
        </div>

        <div class="deck-footer">
            <button class="stats-trigger" @click.stop="emit('show-stats', deck)">
                <div class="stats-icon">
                    <span></span><span></span><span></span>
                </div>
                ESTADÍSTICAS DEL MAZO
            </button>
        </div>
    </div>
</template>

<style scoped>
/* --- CONTENEDOR PRINCIPAL --- */
.deck-card {
    background: rgba(30, 41, 59, 0.5);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 24px;
    position: relative;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 180px;
    overflow: hidden;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
}

.deck-card:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: rgba(59, 130, 246, 0.5);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 0 20px rgba(59, 130, 246, 0.15);
}

/* --- IMAGEN Y OVERLAY --- */
.card-bg-image {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center 25%;
    opacity: 0.25;
    transition: transform 0.6s ease, opacity 0.4s ease;
    filter: saturate(0.6) blur(0.5px);
}

.deck-card:hover .card-bg-image {
    opacity: 0.45;
    transform: scale(1.1);
}

.card-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%);
    z-index: 1;
}

/* --- CABECERA Y FORMATO --- */
.header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    position: relative;
    z-index: 2;
}

.format-and-colors {
    display: flex;
    align-items: center;
    gap: 12px;
}

.format-pill {
    font-size: 0.65rem;
    font-weight: 900;
    padding: 4px 12px;
    border-radius: 50px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
}

.format-pill.commander {
    color: #60a5fa;
    border-color: rgba(59, 130, 246, 0.3);
}

.format-pill.pauper {
    color: #34d399;
    border-color: rgba(16, 185, 129, 0.3);
}

/* --- ESTILO DE LOS ORBES DE MANÁ --- */
.color-identity-row {
    display: flex;
    gap: 5px;
}

.mana-orb {
    width: 22px;
    height: 22px;
    background: rgba(15, 23, 42, 0.8);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
    transition: all 0.3s ease;
}

/* Efectos de brillo por color */
.mana-white {
    box-shadow: 0 0 10px rgba(255, 253, 208, 0.3);
    border-color: #fef3c7;
}

.mana-blue {
    box-shadow: 0 0 10px rgba(96, 165, 250, 0.3);
    border-color: #60a5fa;
}

.mana-black {
    box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
    border-color: #a855f7;
}

.mana-red {
    box-shadow: 0 0 10px rgba(248, 113, 113, 0.3);
    border-color: #f87171;
}

.mana-green {
    box-shadow: 0 0 10px rgba(74, 222, 128, 0.3);
    border-color: #4ade80;
}

.mana-colorless {
    box-shadow: 0 0 10px rgba(203, 213, 225, 0.3);
    border-color: #cbd5e1;
}

.deck-card:hover .mana-orb {
    transform: scale(1.2) rotate(5deg);
}

/* --- TEXTOS --- */
.deck-content {
    position: relative;
    z-index: 2;
}

.deck-name {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 900;
    color: #ffffff;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
    line-height: 1.2;
}

.detail-tag {
    font-size: 0.85rem;
    color: #94a3b8;
    margin-top: 8px;
}

.detail-tag .label {
    font-weight: 900;
    font-size: 0.7rem;
    text-transform: uppercase;
    color: #475569;
    margin-right: 4px;
}

/* --- FOOTER Y BOTÓN --- */
.deck-footer {
    position: relative;
    z-index: 2;
    margin-top: 24px;
}

.stats-trigger {
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #f1f5f9;
    padding: 12px;
    border-radius: 14px;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    cursor: pointer;
    transition: all 0.3s;
}

.stats-trigger:hover {
    background: #f1f5f9;
    color: #0f172a;
    transform: scale(1.02);
}

.stats-icon {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 14px;
}

.stats-icon span {
    width: 3px;
    background: currentColor;
    border-radius: 1px;
    transition: 0.3s;
}

.stats-icon span:nth-child(1) {
    height: 60%;
}

.stats-icon span:nth-child(2) {
    height: 100%;
}

.stats-icon span:nth-child(3) {
    height: 40%;
}

.deck-accent {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 6px;
    z-index: 3;
}

.deck-accent.commander {
    background: linear-gradient(to bottom, #3b82f6, #60a5fa);
}

.deck-accent.pauper {
    background: linear-gradient(to bottom, #10b981, #34d399);
}

.external-link {
    color: #475569;
    transition: 0.2s;
}

.external-link:hover {
    color: #60a5fa;
    transform: scale(1.2);
}
</style>