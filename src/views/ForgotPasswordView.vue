<template>
    <div class="auth-viewport">
        <div class="auth-card fade-in">
            <header class="auth-header">
                <div class="logo-orb pulse-blue">✉️</div>
                <h1 class="main-title">Recuperar <span>Chispa</span></h1>
                <p class="subtitle">Enviaremos un portal de acceso a tu correo</p>
            </header>

            <form v-if="!isSent" @submit.prevent="handleResetRequest" class="auth-form">

                <transition name="slide-fade">
                    <div v-if="errorMessage" class="error-banner">
                        ⚠️ {{ errorMessage }}
                    </div>
                </transition>

                <div class="form-section">
                    <label class="section-tag">IDENTIDAD</label>
                    <div class="input-wrapper">
                        <span class="input-icon">📧</span>
                        <input v-model.trim="email" type="email" placeholder="Introduce tu email" required
                            class="minimal-input" :disabled="loading" />
                    </div>
                </div>

                <button type="submit" class="btn-action main-save-btn aura-blue" :disabled="loading">
                    <span v-if="!loading">ENVIAR ENLACE</span>
                    <div v-else class="spinner-small"></div>
                </button>
            </form>

            <div v-else class="success-content fade-in">
                <div class="success-icon">✅</div>
                <p class="lore-text">
                    El mensaje ha sido enviado. Revisa tu bandeja de entrada y sigue el enlace para restaurar tu poder.
                </p>
                <button @click="router.push('/login')" class="btn-action main-save-btn aura-green">
                    VOLVER AL LOGIN
                </button>
            </div>

            <footer class="auth-footer" v-if="!isSent">
                <router-link to="/login" class="back-link">Volver atrás</router-link>
            </footer>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '@/supabaseClient'
import { useRouter } from 'vue-router'

const router = useRouter()
const email = ref('')
const loading = ref(false)
const isSent = ref(false)
const errorMessage = ref('')

const handleResetRequest = async () => {
    errorMessage.value = ''
    loading.value = true

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
            // Esta es la URL a la que el usuario será enviado tras pulsar el botón del email
            redirectTo: window.location.origin + '/resetear-password',
        })

        if (error) throw error
        isSent.value = true

    } catch (error) {
        console.error('Reset Error:', error.message)
        errorMessage.value = "No se pudo enviar el correo. Revisa si es correcto."
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
/* Reutilizamos tus estilos de Auth para coherencia visual */
.auth-viewport {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.auth-card {
    width: 100%;
    max-width: 440px;
    padding: 40px;
    background: rgba(30, 41, 59, 0.4);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    text-align: center;
    backdrop-filter: blur(10px);
}

.pulse-blue {
    filter: drop-shadow(0 0 15px rgba(59, 130, 246, 0.5));
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% {
        transform: scale(1);
        opacity: 1;
    }

    50% {
        transform: scale(1.1);
        opacity: 0.8;
    }

    100% {
        transform: scale(1);
        opacity: 1;
    }
}

.main-title {
    font-size: 2rem;
    font-weight: 800;
    color: white;
}

.main-title span {
    color: #3b82f6;
    font-weight: 300;
}

.subtitle {
    color: #94a3b8;
    font-size: 0.9rem;
    margin-bottom: 30px;
}

.form-section {
    text-align: left;
    margin-bottom: 25px;
}

.section-tag {
    font-size: 0.7rem;
    font-weight: 900;
    color: #3b82f6;
    letter-spacing: 2px;
}

.input-wrapper {
    position: relative;
    margin-top: 10px;
}

.input-icon {
    position: absolute;
    left: 15px;
    top: 14px;
    opacity: 0.6;
}

.minimal-input {
    width: 100%;
    padding: 14px 15px 14px 45px;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    color: white;
}

.aura-blue {
    background: #3b82f6;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.aura-green {
    background: #10b981;
}

.main-save-btn {
    width: 100%;
    height: 55px;
    border-radius: 12px;
    border: none;
    color: white;
    font-weight: 800;
    cursor: pointer;
}

.success-content {
    padding: 20px 0;
}

.success-icon {
    font-size: 3rem;
    margin-bottom: 15px;
}

.lore-text {
    color: #cbd5e1;
    margin-bottom: 25px;
    line-height: 1.6;
}

.back-link {
    display: inline-block;
    margin-top: 20px;
    color: #64748b;
    text-decoration: none;
    font-size: 0.9rem;
}

.back-link:hover {
    color: #3b82f6;
}

.error-banner {
    background: rgba(239, 68, 68, 0.1);
    color: #fca5a5;
    padding: 12px;
    border-radius: 10px;
    margin-bottom: 15px;
    font-size: 0.85rem;
}
</style>