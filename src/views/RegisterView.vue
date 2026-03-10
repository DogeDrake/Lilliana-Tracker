<template>
    <div class="auth-viewport">
        <div class="auth-card fade-in">
            <header class="auth-header">
                <div class="logo-orb">✨</div>
                <h1 class="main-title">Nueva <span>Cuenta</span></h1>
                <p class="subtitle">Únete a la hermandad de Planeswalkers</p>
            </header>

            <form @submit.prevent="handleRegister" class="auth-form">

                <div v-if="globalError" class="error-banner">
                    {{ globalError }}
                </div>

                <div class="form-section">
                    <label class="section-tag">ACCESO</label>

                    <div class="input-wrapper">
                        <span class="input-icon">📧</span>
                        <input v-model.trim="email" type="email" placeholder="Email" required
                            @blur="checkAvailability('email')" class="minimal-input"
                            :class="{ 'input-error': emailError }" />
                    </div>
                    <span v-if="emailError" class="field-error">{{ emailError }}</span>

                    <div class="input-wrapper">
                        <span class="input-icon">🔑</span>
                        <input v-model="password" :type="showPassword ? 'text' : 'password'"
                            placeholder="Contraseña (mín. 6 caracteres)" required class="minimal-input" />
                        <button type="button" class="toggle-eye" @click="showPassword = !showPassword">
                            {{ showPassword ? '🙈' : '👁️' }}
                        </button>
                    </div>
                    <div class="password-strength">
                        <div class="strength-bar" :class="strengthClass" :style="{ width: strengthWidth }"></div>
                    </div>
                </div>

                <div class="form-section">
                    <label class="section-tag">IDENTIDAD EN EL RANKING</label>
                    <div class="input-wrapper">
                        <span class="input-icon">🆔</span>
                        <input v-model.trim="username" type="text" placeholder="Username (ej: lilliana_99)" required
                            @input="sanitizeUsername" @blur="checkAvailability('username')" class="minimal-input"
                            :class="{ 'input-error': usernameError }" />
                    </div>
                    <span v-if="usernameError" class="field-error">{{ usernameError }}</span>

                    <div class="input-wrapper">
                        <span class="input-icon">👤</span>
                        <input v-model.trim="displayName" type="text" placeholder="Nombre Real o Apodo (opcional)"
                            class="minimal-input" />
                    </div>
                </div>

                <div class="legal-container">
                    <label class="custom-checkbox">
                        <input type="checkbox" v-model="acceptTerms" required />
                        <span class="checkbox-box"></span>
                        <span class="legal-text">Acepto la política de privacidad y cookies</span>
                    </label>
                </div>

                <button type="submit" class="btn-action main-save-btn aura-purple"
                    :disabled="loading || !!usernameError || !!emailError">
                    <span v-if="!loading">FORJAR CUENTA</span>
                    <div v-else class="spinner-small"></div>
                </button>
            </form>

            <footer class="auth-footer">
                <p class="switch">
                    ¿Ya tienes cuenta?
                    <router-link to="/login" class="purple-link">Entra aquí</router-link>
                </p>
            </footer>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { supabase } from '../supabaseClient'
import { useRouter } from 'vue-router'

const router = useRouter()
const email = ref('')
const password = ref('')
const username = ref('')
const displayName = ref('')
const acceptTerms = ref(false)
const loading = ref(false)
const showPassword = ref(false)

// Estados de error
const globalError = ref('')
const usernameError = ref('')
const emailError = ref('')

// 1. Limpiar username (solo letras, números y guiones bajos, siempre minúsculas)
const sanitizeUsername = () => {
    username.value = username.value
        .toLowerCase()
        .replace(/\s/g, '_')
        .replace(/[^a-z0-9_]/g, '')
}

// 2. Medidor de fuerza de contraseña
const strengthWidth = computed(() => {
    if (!password.value) return '0%'
    if (password.value.length < 6) return '30%'
    if (password.value.length < 10) return '60%'
    return '100%'
})

const strengthClass = computed(() => {
    if (password.value.length < 6) return 'weak'
    if (password.value.length < 10) return 'medium'
    return 'strong'
})

// 3. Comprobar si el usuario o mail ya existen antes de enviar
const checkAvailability = async (type) => {
    if (type === 'username' && username.value.length < 3) {
        usernameError.value = 'El username es demasiado corto.'
        return
    }

    const column = type === 'username' ? 'username' : 'email_at_register' // Depende de cómo tengas tu tabla profiles
    const value = type === 'username' ? username.value : email.value

    if (!value) return

    const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq(type === 'username' ? 'username' : 'id', value) // Ajusta según tu esquema
        .maybeSingle()

    if (data) {
        if (type === 'username') usernameError.value = 'Este nombre de invocador ya está ocupado.'
        else emailError.value = 'Este email ya tiene una cuenta activa.'
    } else {
        if (type === 'username') usernameError.value = ''
        else emailError.value = ''
    }
}

const handleRegister = async () => {
    if (!acceptTerms.value) return
    if (password.value.length < 6) {
        globalError.value = 'La contraseña debe tener al menos 6 caracteres.'
        return
    }

    loading.value = true
    globalError.value = ''

    try {
        // Registro en Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email: email.value,
            password: password.value,
            options: {
                data: {
                    username: username.value,
                    full_name: displayName.value || username.value
                }
            }
        })

        if (error) throw error

        // Nota: Supabase suele disparar un Trigger para crear el perfil. 
        // Si no lo tienes, deberías insertar manualmente en 'profiles' aquí.

        alert('¡Cuenta forjada! Por favor, confirma tu correo electrónico.')
        router.push('/login')

    } catch (error) {
        globalError.value = error.message.includes('User already registered')
            ? 'Este usuario ya existe en el plano.'
            : 'Error en la forja: ' + error.message
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
.auth-viewport {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #020617;
    /* Fondo oscuro sólido para seguridad visual */
    padding: 20px;
}

.auth-card {
    width: 100%;
    max-width: 440px;
    padding: 40px;
    background: rgba(30, 41, 59, 0.7);
    border-radius: 28px;
    border: 1px solid rgba(168, 85, 247, 0.2);
    text-align: center;
    backdrop-filter: blur(16px);
}

.auth-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.error-banner {
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    padding: 12px;
    border-radius: 12px;
    font-size: 0.85rem;
    border: 1px solid rgba(239, 68, 68, 0.3);
}

.input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.input-icon {
    position: absolute;
    left: 15px;
    opacity: 0.5;
}

.minimal-input {
    width: 100%;
    padding: 14px 14px 14px 45px;
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    color: white;
    transition: 0.3s;
}

.input-error {
    border-color: #ef4444 !important;
}

.field-error {
    color: #f87171;
    font-size: 0.7rem;
    margin-top: 4px;
    display: block;
    padding-left: 5px;
}

/* Password Strength Meter */
.password-strength {
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    margin-top: 8px;
    overflow: hidden;
}

.strength-bar {
    height: 100%;
    transition: all 0.5s ease;
}

.strength-bar.weak {
    background: #ef4444;
}

.strength-bar.medium {
    background: #f59e0b;
}

.strength-bar.strong {
    background: #10b981;
}

.toggle-eye {
    position: absolute;
    right: 15px;
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.6;
}

.main-save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: grayscale(1);
}

/* Los demás estilos se mantienen del diseño original con ajustes morados */
.main-title span {
    color: #a855f7;
}

.aura-purple {
    background: #a855f7;
    box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3);
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
</style>