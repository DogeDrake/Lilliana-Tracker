<template>
    <div class="auth-viewport">
        <div class="auth-card fade-in">
            <header class="auth-header">
                <div class="logo-orb">✨</div>
                <h1 class="main-title">Nueva <span>Cuenta</span></h1>
                <p class="subtitle">Únete a la hermandad de Planeswalkers</p>
            </header>

            <form @submit.prevent="handleRegister" class="auth-form">
                <div class="form-section">
                    <label class="section-tag">ACCESO</label>
                    <div class="input-wrapper">
                        <span class="input-icon">📧</span>
                        <input v-model="email" type="email" placeholder="Email" required class="minimal-input" />
                    </div>
                    <div class="input-wrapper">
                        <span class="input-icon">🔑</span>
                        <input v-model="password" type="password" placeholder="Contraseña" required
                            class="minimal-input" />
                    </div>
                </div>

                <div class="form-section">
                    <label class="section-tag">IDENTIDAD</label>
                    <div class="input-wrapper">
                        <span class="input-icon">🆔</span>
                        <input v-model="username" type="text" placeholder="Username (para el ranking)" required
                            class="minimal-input" />
                    </div>
                    <div class="input-wrapper">
                        <span class="input-icon">👤</span>
                        <input v-model="displayName" type="text" placeholder="Nombre Real (opcional)"
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

                <button type="submit" class="btn-action main-save-btn aura-purple" :disabled="loading">
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
import { ref } from 'vue'
import { supabase } from '../supabaseClient'
import { useRouter } from 'vue-router'

const router = useRouter()
const email = ref('')
const password = ref('')
const username = ref('')
const displayName = ref('')
const acceptTerms = ref(false)
const loading = ref(false)

const handleRegister = async () => {
    if (!acceptTerms.value) return;

    loading.value = true
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email.value,
            password: password.value,
            options: {
                data: {
                    username: username.value,
                    display_name: displayName.value
                }
            }
        })
        if (error) throw error
        alert('¡Invocación exitosa! Revisa tu email para confirmar la cuenta.')
        router.push('/login')
    } catch (error) {
        alert('Error en la forja: ' + error.message)
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
    filter: drop-shadow(0 0 15px rgba(168, 85, 247, 0.5));
    /* Brillo morado */
}

.main-title {
    font-size: 2rem;
    font-weight: 800;
    margin: 0;
}

.main-title span {
    color: #a855f7;
    /* Morado principal */
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

.section-tag {
    font-size: 0.7rem;
    font-weight: 900;
    color: #a855f7;
    /* Morado en tags */
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

.minimal-input:focus {
    outline: none;
    border-color: #a855f7;
    /* Borde morado al hacer focus */
    background: rgba(15, 23, 42, 0.9);
}

.custom-checkbox {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    user-select: none;
}

.custom-checkbox input {
    display: none;
}

.checkbox-box {
    width: 20px;
    height: 20px;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    position: relative;
    transition: 0.3s;
}

.custom-checkbox input:checked+.checkbox-box {
    background: #a855f7;
    /* Checkbox morado */
    border-color: #a855f7;
}

.custom-checkbox input:checked+.checkbox-box::after {
    content: '✓';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 0.8rem;
}

.legal-text {
    font-size: 0.8rem;
    color: #64748b;
    text-align: left;
}

/* Botón con aura morada */
.aura-purple {
    background: #a855f7;
    box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3);
}

.aura-purple:hover {
    background: #9333ea;
    box-shadow: 0 6px 20px rgba(168, 85, 247, 0.4);
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
}

.auth-footer {
    margin-top: 30px;
}

.switch {
    font-size: 0.9rem;
    color: #64748b;
}

.purple-link {
    color: #a855f7 !important;
    text-decoration: none;
    font-weight: 700;
}

.purple-link:hover {
    text-decoration: underline;
}

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

@media (max-width: 480px) {
    .auth-card {
        padding: 30px 20px;
        background: transparent;
        border: none;
    }
}
</style>