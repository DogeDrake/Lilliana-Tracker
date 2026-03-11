<template>
    <div class="auth-viewport">
        <div class="auth-card fade-in">
            <header class="auth-header">
                <div class="logo-orb">💀</div>
                <h1 class="main-title">Lilliana<span>Tracker</span></h1>
                <p class="subtitle">Identifícate, Planeswalker</p>
            </header>

            <form @submit.prevent="handleLogin" class="auth-form">
                <div class="form-section">

                    <transition name="slide-fade">
                        <div v-if="errorMessage" class="error-banner">
                            ⚠️ {{ errorMessage }}
                        </div>
                    </transition>

                    <label class="section-tag">CREDENCIALES</label>

                    <div class="input-wrapper">
                        <span class="input-icon">📧</span>
                        <input v-model.trim="email" type="email" placeholder="Email" required autocomplete="email"
                            class="minimal-input" :disabled="loading" />
                    </div>

                    <div class="input-wrapper">
                        <span class="input-icon">🔑</span>
                        <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="Contraseña"
                            required autocomplete="current-password" class="minimal-input password-input"
                            :disabled="loading" />
                        <button type="button" class="toggle-password" @click="showPassword = !showPassword"
                            tabindex="-1" title="Mostrar/Ocultar contraseña">
                            {{ showPassword ? '🙈' : '👁️' }}
                        </button>
                    </div>

                    <div class="forgot-password-container">
                        <router-link to="/recuperar" class="forgot-link">
                            ¿Has olvidado tu contraseña?
                        </router-link>
                    </div>
                </div>

                <button type="submit" class="btn-action main-save-btn aura-blue" :disabled="loading">
                    <span v-if="!loading">INVOCAR SESIÓN</span>
                    <div v-else class="spinner-small"></div>
                </button>
            </form>

            <footer class="auth-footer">
                <p class="switch">
                    ¿Eres nuevo en el plano?
                    <router-link to="/register" class="blue-link">Crea una cuenta</router-link>
                </p>
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
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')
const showPassword = ref(false)

const getFriendlyErrorMessage = (errorMsg) => {
    const msg = errorMsg.toLowerCase()
    if (msg.includes('invalid login credentials')) return 'Email o contraseña incorrectos.'
    if (msg.includes('email not confirmed')) return 'Debes confirmar tu email antes de entrar.'
    if (msg.includes('rate limit')) return 'Demasiados intentos fallidos. Espera unos minutos.'
    if (msg.includes('network')) return 'Error de conexión. Comprueba tu internet.'
    return 'Se produjo un error oscuro al iniciar sesión.'
}

const handleLogin = async () => {
    errorMessage.value = ''

    if (!email.value || !password.value) {
        errorMessage.value = 'Debes rellenar todos los campos.'
        return
    }

    loading.value = true
    try {
        const { error } = await supabase.auth.signInWithPassword({
            email: email.value,
            password: password.value
        })

        if (error) throw error
        router.push('/')

    } catch (error) {
        console.error('Login Error:', error.message)
        errorMessage.value = getFriendlyErrorMessage(error.message)
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
/* Mantengo tus estilos originales y añado los del nuevo enlace */

.auth-viewport {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    padding: 20px;
}

.auth-card {
    width: 100%;
    max-width: 480px;
    padding: 40px;
    background: rgba(30, 41, 59, 0.4);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    text-align: center;
    backdrop-filter: blur(10px);
}

.auth-header {
    margin-bottom: 35px;
}

.logo-orb {
    font-size: 2rem;
    margin-bottom: 15px;
    display: inline-block;
    filter: drop-shadow(0 0 15px rgba(59, 130, 246, 0.5));
}

.main-title {
    font-size: 2rem;
    font-weight: 800;
    margin: 0;
    white-space: nowrap;
}

.main-title span {
    color: #3b82f6;
    font-weight: 300;
}

.subtitle {
    font-size: 0.9rem;
    color: #94a3b8;
    margin-top: 5px;
}

.auth-form {
    display: flex;
    flex-direction: column;
    gap: 25px;
}

.form-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-align: left;
}

.error-banner {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: #fca5a5;
    padding: 12px 15px;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
}

.section-tag {
    font-size: 0.7rem;
    font-weight: 900;
    color: #3b82f6;
    letter-spacing: 2px;
    padding-left: 5px;
    opacity: 0.8;
}

.input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.input-icon {
    position: absolute;
    left: 15px;
    font-size: 1rem;
    opacity: 0.6;
}

.minimal-input {
    width: 100%;
    padding: 14px 14px 14px 45px;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    color: white;
    font-size: 0.95rem;
    transition: all 0.3s ease;
}

.password-input {
    padding-right: 45px;
}

.minimal-input:focus {
    outline: none;
    border-color: #3b82f6;
    background: rgba(15, 23, 42, 0.9);
}

.minimal-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.toggle-password {
    position: absolute;
    right: 15px;
    background: transparent;
    border: none;
    font-size: 1.1rem;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.2s;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.toggle-password:hover {
    opacity: 1;
}

/* ESTILOS DEL LINK DE OLVIDO */
.forgot-password-container {
    text-align: right;
    margin-top: -4px;
}

.forgot-link {
    font-size: 0.8rem;
    color: #64748b;
    text-decoration: none;
    transition: color 0.2s;
}

.forgot-link:hover {
    color: #3b82f6;
}

.aura-blue {
    background: #3b82f6;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.aura-blue:hover:not(:disabled) {
    background: #2563eb;
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.main-save-btn {
    height: 55px;
    border-radius: 12px;
    font-weight: 800;
    letter-spacing: 1px;
    border: none;
    color: white;
    cursor: pointer;
    transition: 0.3s;
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.auth-footer {
    margin-top: 30px;
}

.switch {
    font-size: 0.9rem;
    color: #64748b;
}

.blue-link {
    color: #3b82f6 !important;
    text-decoration: none;
    font-weight: 700;
}

.blue-link:hover {
    text-decoration: underline;
}

.spinner-small {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
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

.fade-in {
    animation: fadeIn 0.6s ease-out;
}

@media (max-width: 480px) {
    .auth-card {
        padding: 30px 20px;
        background: transparent;
        border: none;
        backdrop-filter: none;
    }
}
</style>