// ============================================================
// PsicoTuyo v2.3.2 — App Completa Premium PWA
// Todas las funciones expandidas y 100% funcionales
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // ============================================================
    // 1. DOM REFERENCES — Todas las referencias al HTML
    // ============================================================
    const mainApp = document.getElementById('main-app');
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username-input');
    const passwordInput = document.getElementById('password-input');
    const registerBtn = document.getElementById('register-btn');
    const loginError = document.getElementById('login-error');

    // Bottom Nav & Views
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    // Chat
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const typingIndicator = document.getElementById('typing-indicator');
    const chatStatusText = document.getElementById('chat-status-text');

    // Voice
    const mainMicBtn = document.getElementById('main-mic-btn');
    const voiceAvatar = document.getElementById('voice-avatar');
    const voiceStateText = document.getElementById('voice-state-text');
    const voiceSubText = document.getElementById('voice-sub-text');
    const voiceTranscript = document.getElementById('voice-transcript');
    const voiceGenderSelect = document.getElementById('voice-gender-mobile');

    // History
    const pwaHistoryList = document.getElementById('pwa-history-list');
    const pwaNewSessionBtn = document.getElementById('pwa-new-session');

    // Progress
    const moodStatus = document.getElementById('mood-status');
    const moodBar = document.getElementById('mood-bar');
    const feedbackText = document.getElementById('feedback-text');
    const statSessions = document.getElementById('stat-sessions');
    const statMessages = document.getElementById('stat-messages');
    const statDays = document.getElementById('stat-days');
    const statStreak = document.getElementById('stat-streak');

    // Settings
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const soundToggle = document.getElementById('sound-toggle');
    const pwaUserBadge = document.getElementById('pwa-user-badge');
    const pwaUserSince = document.getElementById('pwa-user-since');
    const pwaLogoutBtn = document.getElementById('pwa-logout-btn');
    const pwaClearDataBtn = document.getElementById('pwa-clear-data-btn');

    // ============================================================
    // 2. SYSTEM STATE — Variables globales de la aplicación
    // ============================================================
    let currentUser = null;
    let currentSessionId = null;
    let conversationHistory = [];
    let isSending = false;           // Protección contra doble envío
    let soundEnabled = true;
    let selectedVoice = null;
    let micPermissionGranted = false;
    let abortController = null;      // Para cancelar peticiones HTTP

    // Speech APIs - Hardened for platform differences
    let SpeechRecognition = null;
    try {
        SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition;
    } catch (e) { console.error('SpeechRecognition access error:', e); }

    let recognition = null;
    try {
        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'es-ES';
        }
    } catch (e) { console.error('SpeechRecognition init error:', e); }

    // Robust Synth Access
    let synth = null;
    try {
        synth = (window.speechSynthesis || null);
    } catch (e) { console.error('SpeechSynthesis access error:', e); }

    // ============================================================
    // 3. SYSTEM PROMPT — Prompt clínico completo y extenso
    // ============================================================
    const SYSTEM_PROMPT = `Eres el Dr. Virtual, un psicólogo clínico senior con un enfoque cálido, empático y profesional. 

Tu misión es proporcionar un espacio de apoyo seguro y transformador.

REGLAS CRÍTICAS DE RESPUESTA:
1. ESTRUCTURA Y CLARIDAD (PUNTO Y APARTE): Nunca entregues bloques de texto largos. Usa "punto y aparte" frecuentemente para separar ideas. Cada respuesta debe tener al menos 2 o 3 párrafos cortos y bien espaciados.
2. TAREAS Y ACTIVIDADES: Si el caso lo amerita, sugiere siempre una actividad práctica, ejercicio de respiración, técnica de escritura o pequeño reto diario para que el paciente trabaje en su bienestar.
3. EMPATÍA ACTIVA: Valida las emociones antes de dar consejos. No seas frío ni mecánico.
4. CIERRE: Finaliza con una pregunta abierta que invite a la reflexión profunda.
Tu misión es transformar el chat en un diálogo fluido y natural, como una conversación real.`;

    // ============================================================
    // 4. HELPER FUNCTIONS — Utilidades generales
    // ============================================================

    /** Genera un ID único para cada sesión */
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    /** Obtiene la base de datos de usuarios de localStorage */
    function getUsersDB() {
        try {
            return JSON.parse(localStorage.getItem('psicotuyo_users') || '{}');
        } catch (e) {
            return {};
        }
    }

    /** Guarda la base de datos de usuarios */
    function saveUsersDB(db) {
        localStorage.setItem('psicotuyo_users', JSON.stringify(db));
    }

    /** Obtiene el índice de sesiones de un usuario */
    function getSessionsIndex() {
        try {
            if (!currentUser) return [];
            return JSON.parse(localStorage.getItem('sessions_' + currentUser) || '[]');
        } catch (e) {
            console.error('Error reading sessions index:', e);
            return [];
        }
    }

    /** Guarda el índice de sesiones */
    function saveSessionsIndex(index) {
        localStorage.setItem('sessions_' + currentUser, JSON.stringify(index));
    }

    /** Obtiene el progreso de un usuario */
    function getUserProgress() {
        try {
            return JSON.parse(localStorage.getItem('progress_' + currentUser) || 'null') || {
                totalSessions: 0,
                totalMessages: 0,
                daysActive: [],
                lastAccess: null,
                streak: 0,
                moodScore: 50
            };
        } catch (e) {
            return {
                totalSessions: 0,
                totalMessages: 0,
                daysActive: [],
                lastAccess: null,
                streak: 0,
                moodScore: 50
            };
        }
    }

    /** Guarda el progreso del usuario */
    function saveUserProgress(progress) {
        localStorage.setItem('progress_' + currentUser, JSON.stringify(progress));
    }

    /** Obtiene las preferencias del usuario */
    function getUserPrefs() {
        try {
            return JSON.parse(localStorage.getItem('prefs_' + currentUser) || 'null') || {
                darkMode: true,
                soundEnabled: true,
                voiceGender: 'female'
            };
        } catch (e) {
            return { darkMode: true, soundEnabled: true, voiceGender: 'female' };
        }
    }

    /** Guarda las preferencias del usuario */
    function saveUserPrefs(prefs) {
        localStorage.setItem('prefs_' + currentUser, JSON.stringify(prefs));
    }

    /** Formatea una fecha en español */
    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    /** Obtiene la fecha de hoy como string YYYY-MM-DD */
    function todayStr() {
        return new Date().toISOString().split('T')[0];
    }

    /** Muestra un error en el login overlay */
    function showLoginError(msg) {
        loginError.textContent = msg;
        loginError.classList.remove('hidden');
        setTimeout(() => loginError.classList.add('hidden'), 4000);
    }

    // ============================================================
    // 5. NAVIGATION — Cambio de vista entre pestañas
    // ============================================================
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetView = item.getAttribute('data-view');

            // Actualizar UI de navegación
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Mostrar/ocultar vistas
            viewSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === `view-${targetView}`) {
                    section.classList.add('active');
                }
            });

            // Lógica especial por vista
            if (targetView === 'chat') {
                setTimeout(() => {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }, 50);
            }
            if (targetView === 'history') {
                updateHistoryUI();
            }
            if (targetView === 'progress') {
                updateProgressUI();
            }
            if (targetView === 'voice') {
                requestMicrophonePermission();
            }
            if (targetView === 'settings') {
                updateSettingsUI();
            }
            // [Social logic removed]
        });
    });

    // ============================================================
    // 6. AUTHENTICATION — Login y Registro completo
    // ============================================================

    /** Manejo del formulario de login (submit) */
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            showLoginError('Completa ambos campos.');
            return;
        }

        if (username.length < 3) {
            showLoginError('El usuario debe tener al menos 3 caracteres.');
            return;
        }

        const db = getUsersDB();
        const userKey = username.toLowerCase();

        if (db[userKey]) {
            // Usuario existe — verificar contraseña
            if (db[userKey].password === password) {
                loginSuccess(username, db[userKey]);
            } else {
                showLoginError('Contraseña incorrecta.');
            }
        } else {
            showLoginError('Usuario no encontrado. Haz clic en "Registrarse".');
        }
    });

    /** Manejo del botón de registro */
    registerBtn.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            showLoginError('Completa usuario y contraseña para registrarte.');
            return;
        }

        if (username.length < 3) {
            showLoginError('El usuario debe tener al menos 3 caracteres.');
            return;
        }

        if (password.length < 4) {
            showLoginError('La contraseña debe tener al menos 4 caracteres.');
            return;
        }

        const db = getUsersDB();
        const userKey = username.toLowerCase();

        if (db[userKey]) {
            showLoginError('Ese usuario ya existe. Inicia sesión.');
            return;
        }

        // Registrar usuario nuevo
        db[userKey] = {
            password: password,
            displayName: username,
            registeredAt: new Date().toISOString()
        };
        saveUsersDB(db);

        showLoginError(''); // Limpiar errores
        loginError.classList.add('hidden');
        loginSuccess(username, db[userKey]);
    });

    /** Callback tras login/registro exitoso */
    function loginSuccess(username, userData) {
        currentUser = username.toLowerCase();

        // Ocultar login, mostrar app
        loginOverlay.classList.add('hidden');
        mainApp.classList.remove('hidden');

        // Cargar preferencias guardadas
        const prefs = getUserPrefs();
        soundEnabled = prefs.soundEnabled;
        darkModeToggle.checked = prefs.darkMode;
        soundToggle.checked = prefs.soundEnabled;
        voiceGenderSelect.value = prefs.voiceGender || 'female';
        applyTheme(prefs.darkMode);

        // Actualizar progreso (día activo)
        updateDailyProgress();

        // Inicializar chat
        initChat();

        // Inicializar voces TTS
        initVoices();

        console.log('PsicoTuyo v2.3.0 — Sesión iniciada:', currentUser);
    }

    // ============================================================
    // 7. CHAT ENGINE — Motor de chat completo
    // ============================================================

    /** Inicializa el chat: carga sesión activa o crea nueva */
    function initChat() {
        const sessions = getSessionsIndex();

        if (sessions.length > 0) {
            // Cargar la sesión más reciente
            const lastSession = sessions[sessions.length - 1];
            loadSession(lastSession.id);
        } else {
            // Primera vez — crear sesión nueva
            createNewSession();
        }

        // Auto-resize del textarea
        messageInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });

        // Enter para enviar, Shift+Enter para nueva línea
        messageInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!isSending) {
                    chatForm.dispatchEvent(new Event('submit'));
                }
            }
        });
    }

    /** Crea una nueva sesión de chat */
    function createNewSession() {
        const sessionId = generateId();
        const greeting = "Hola, bienvenido a PsicoTuyo. Soy el Dr. Virtual, tu psicólogo clínico. Estoy aquí para escucharte en un espacio seguro, confidencial y sin juicios.\n\n¿Cómo te has estado sintiendo últimamente?";

        currentSessionId = sessionId;
        conversationHistory = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'assistant', content: greeting }
        ];

        // Guardar en localStorage
        saveCurrentSession();

        // Agregar al índice de sesiones
        const sessions = getSessionsIndex();
        sessions.push({
            id: sessionId,
            createdAt: new Date().toISOString(),
            preview: greeting.substring(0, 60) + '...',
            messageCount: 1
        });
        saveSessionsIndex(sessions);

        // Actualizar progreso
        const progress = getUserProgress();
        progress.totalSessions++;
        saveUserProgress(progress);

        // Renderizar
        renderMessages();
    }

    /** Carga una sesión existente por su ID */
    function loadSession(sessionId) {
        try {
            const data = localStorage.getItem('session_' + currentUser + '_' + sessionId);
            if (data) {
                conversationHistory = JSON.parse(data);
                currentSessionId = sessionId;
                renderMessages();
            } else {
                createNewSession();
            }
        } catch (e) {
            console.error('Error cargando sesión:', e);
            createNewSession();
        }
    }

    /** Guarda la sesión actual en localStorage */
    function saveCurrentSession() {
        if (!currentUser || !currentSessionId) return;
        localStorage.setItem(
            'session_' + currentUser + '_' + currentSessionId,
            JSON.stringify(conversationHistory)
        );
    }

    /** Renderiza todos los mensajes en el DOM */
    function renderMessages() {
        // Limpiar contenedor (preservar typing indicator)
        const existingMessages = chatMessages.querySelectorAll('.message');
        existingMessages.forEach(m => m.remove());

        // Repintar mensajes (excepto system)
        conversationHistory.forEach(msg => {
            if (msg.role !== 'system') {
                const sender = msg.role === 'user' ? 'user' : 'therapist';
                appendMessageToDOM(sender, msg.content);
            }
        });

        // Scroll al fondo
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 50);
    }

    /** Agrega un mensaje visual al DOM (NO al historial) */
    function appendMessageToDOM(sender, text) {
        // Clean the text before formatting
        let cleanText = cleanResponse(text);
        let formattedText;
        try {
            if (window.marked) {
                formattedText = marked.parse(cleanText);
            } else if (typeof marked !== 'undefined') {
                formattedText = marked.parse(cleanText);
            } else {
                // Manual formatting when marked.js isn't loaded
                formattedText = cleanText
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
                    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
                    .replace(/\n\n/g, '</p><p>')
                    .replace(/\n/g, '<br>');
                formattedText = '<p>' + formattedText + '</p>';
            }
        } catch (e) {
            formattedText = cleanText.replace(/\n/g, '<br>');
        }
        const div = document.createElement('div');
        div.className = `message ${sender}-message`;
        div.innerHTML = `<div class="message-content">${formattedText}</div>`;
        chatMessages.insertBefore(div, typingIndicator);
    }

    /** Manejo del envío de mensajes */
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (!text || isSending) return;

        // Protección contra doble envío
        isSending = true;
        sendBtn.disabled = true;
        chatStatusText.textContent = 'Escribiendo...';

        // Limpiar input
        messageInput.value = '';
        messageInput.style.height = 'auto';

        // Agregar mensaje del usuario al DOM y al historial
        appendMessageToDOM('user', text);
        conversationHistory.push({ role: 'user', content: text });
        saveCurrentSession();

        // Actualizar progreso
        const progress = getUserProgress();
        progress.totalMessages++;
        saveUserProgress(progress);

        // Actualizar preview en el índice de sesiones
        const sessions = getSessionsIndex();
        const idx = sessions.findIndex(s => s.id === currentSessionId);
        if (idx !== -1) {
            sessions[idx].preview = text.substring(0, 60) + '...';
            sessions[idx].messageCount = (sessions[idx].messageCount || 0) + 1;
            saveSessionsIndex(sessions);
        }

        // Mostrar indicador de escritura
        typingIndicator.classList.remove('hidden');
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Llamar a la API
        try {
            const responseText = await fetchFreeAPI();

            // Ocultar indicador
            typingIndicator.classList.add('hidden');
            chatStatusText.textContent = 'Terapeuta Online';

            // Agregar respuesta al DOM y al historial
            appendMessageToDOM('therapist', responseText);
            conversationHistory.push({ role: 'assistant', content: responseText });
            saveCurrentSession();

            // Actualizar progreso con respuesta
            progress.totalMessages++;
            // Análisis básico de sentimiento para mood score
            updateMoodFromResponse(responseText, progress);
            saveUserProgress(progress);

            // Leer en voz alta si está activado
            speak(responseText);

            // Scroll al fondo
            chatMessages.scrollTop = chatMessages.scrollHeight;

        } catch (error) {
            typingIndicator.classList.add('hidden');
            chatStatusText.textContent = 'Terapeuta Online';

            // Eliminar el último mensaje del historial (el del usuario que falló)
            conversationHistory.pop();
            saveCurrentSession();

            let errorMsg = '';
            if (error.name === 'AbortError') {
                errorMsg = 'La conexión tardó demasiado. Por favor, intenta de nuevo en unos segundos.';
            } else if (error.message && error.message.includes('429')) {
                errorMsg = 'Estamos recibiendo muchas consultas. Por favor, espera un momento y vuelve a intentarlo.';
            } else if (error.message && error.message.includes('400')) {
                errorMsg = 'Hubo un problema con el formato de la solicitud. Intenta reformular tu mensaje.';
            } else {
                errorMsg = 'Tuve un problema de conexión. Verifica tu conexión a internet e intenta de nuevo.';
            }

            appendMessageToDOM('therapist', errorMsg);
            console.error('API Error:', error);
        } finally {
            // Siempre restaurar estado
            isSending = false;
            sendBtn.disabled = false;
        }
    });

    // ============================================================
    // 8. API CONNECTION — Conexión con la API gratuita
    // ============================================================

    /** Limpia la respuesta de la API: elimina avisos de Pollinations y artefactos */
    function cleanResponse(text) {
        if (!text) return '';

        // Split into lines and filter out any line that contains Pollinations-related content
        const badKeywords = [
            'IMPORTANT NOTICE',
            'Pollinations',
            'pollinations',
            'deprecated',
            'migrate to our new',
            'Anonymous requests',
            'will continue to work normally',
            'latest models',
            'better performance and access'
        ];

        const lines = text.split('\n');
        const cleanLines = lines.filter(line => {
            return !badKeywords.some(keyword => line.includes(keyword));
        });

        let cleaned = cleanLines.join('\n');

        // Also remove any leftover URLs to pollinations
        cleaned = cleaned.replace(/https?:\/\/[^\s]*pollinations[^\s]*/gi, '');

        // Clean up excessive whitespace left behind
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        cleaned = cleaned.trim();

        // If the entire response was a notice, return a fallback
        if (!cleaned || cleaned.length < 5) {
            return 'Estoy aquí para escucharte. ¿En qué puedo ayudarte hoy?';
        }

        return cleaned;
    }

    /** Llama a la API de Pollinations (gratuita, sin API key) */
    async function fetchFreeAPI() {
        // Cancelar petición anterior si existe
        if (abortController) {
            abortController.abort();
        }

        abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 60000); // 60s timeout

        try {
            const response = await fetch('https://text.pollinations.ai/openai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: conversationHistory,
                    model: 'openai',
                    temperature: 0.65,
                    jsonMode: false
                }),
                signal: abortController.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorDetail = response.statusText;
                try {
                    const errBody = await response.json();
                    errorDetail = errBody.error || errorDetail;
                } catch (e) { }
                throw new Error(`API Error (${response.status}): ${errorDetail}`);
            }

            const data = await response.json();

            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                // Clean the response before returning
                return cleanResponse(data.choices[0].message.content);
            } else {
                throw new Error('Formato de respuesta inesperado de la API.');
            }
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        } finally {
            abortController = null;
        }
    }

    // ============================================================
    // 9. VOICE SYSTEM — Reconocimiento y síntesis de voz
    // ============================================================

    /** Solicita permiso de micrófono al usuario */
    async function requestMicrophonePermission() {
        // Cargar estado persistido
        const persistedPermission = localStorage.getItem('psicotuyo_mic_permission') === 'true';
        if (persistedPermission) micPermissionGranted = true;

        if (micPermissionGranted) {
            voiceStateText.textContent = 'Toca el micrófono para hablar';
            voiceSubText.textContent = 'Habla con libertad, te escucho con atención.';
            return;
        }

        voiceStateText.textContent = 'Solicitando permiso...';
        voiceSubText.textContent = 'Necesitamos acceso a tu micrófono para la consulta por voz.';

        try {
            // Check if already has permission (modern browsers)
            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const status = await navigator.permissions.query({ name: 'microphone' });
                    if (status.state === 'granted') {
                        micPermissionGranted = true;
                        voiceStateText.textContent = 'Toca el micrófono para hablar';
                        voiceSubText.textContent = 'Habla con libertad, te escucho con atención.';
                        mainMicBtn.style.opacity = '1';
                        return;
                    }
                } catch (e) {
                    // query permissions not supported for 'microphone' in some browsers
                }
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());

            micPermissionGranted = true;
            localStorage.setItem('psicotuyo_mic_permission', 'true');

            voiceStateText.textContent = 'Toca el micrófono para hablar';
            voiceSubText.textContent = 'Habla con libertad, te escucho con atención.';
            mainMicBtn.style.opacity = '1';
        } catch (err) {
            micPermissionGranted = false;
            localStorage.setItem('psicotuyo_mic_permission', 'false');
            voiceStateText.textContent = 'Permiso denegado';
            voiceSubText.textContent = 'Activa el micrófono en la configuración de tu dispositivo.';
            mainMicBtn.style.opacity = '0.5';
            console.warn('Microphone permission denied:', err);
        }
    }

    /** Inicializa las voces TTS disponibles */
    function initVoices() {
        if (!synth) {
            console.warn('SpeechSynthesis no disponible en este dispositivo.');
            return;
        }

        try {
            const setVoice = () => {
                const voices = synth.getVoices();
                const gender = voiceGenderSelect.value;

                // Buscar voz en español según género
                selectedVoice = voices.find(v => {
                    const name = v.name.toLowerCase();
                    const lang = v.lang.toLowerCase();
                    if (!lang.startsWith('es')) return false;

                    if (gender === 'female') {
                        return name.includes('female') || name.includes('femenin') || name.includes('mujer') ||
                            name.includes('helena') || name.includes('sabina') || name.includes('paulina') ||
                            name.includes('monica') || name.includes('hilda') || name.includes('zira');
                    } else {
                        return name.includes('male') || name.includes('masculin') || name.includes('hombre') ||
                            name.includes('pablo') || name.includes('raul') || name.includes('david') ||
                            name.includes('jorge') || name.includes('sergio') || name.includes('andres') ||
                            name.includes('standard-b') || name.includes('wavenet-b');
                    }
                });

                if (!selectedVoice) selectedVoice = voices.find(v => v.lang.startsWith('es'));
                if (!selectedVoice && voices.length > 0) selectedVoice = voices[0];
            };

            if (synth.onvoiceschanged !== undefined) {
                synth.onvoiceschanged = setVoice;
            }
            setVoice();

            voiceGenderSelect.addEventListener('change', () => {
                setVoice();
                const prefs = getUserPrefs();
                prefs.voiceGender = voiceGenderSelect.value;
                saveUserPrefs(prefs);
            });
        } catch (e) {
            console.error('Error al inicializar voces:', e);
        }
    }

    /** Lee un texto en voz alta */
    function speak(text) {
        if (!soundEnabled || !synth) return;

        // Detener si ya estaba hablando
        if (synth.speaking) {
            synth.cancel();
        }

        // Limpiar markdown del texto
        const cleanText = text
            .replace(/[*_#`]/g, '')
            .replace(/\[.*?\]\(.*?\)/g, '')
            .replace(/<[^>]*>/g, '');

        const utterance = new SpeechSynthesisUtterance(cleanText);
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.lang = 'es-ES';
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        // Animación visual del avatar mientras habla
        utterance.onstart = () => {
            voiceAvatar.classList.add('speaking');
            voiceAvatar.classList.remove('listening');
        };

        utterance.onend = () => {
            voiceAvatar.classList.remove('speaking');
        };

        synth.speak(utterance);
    }

    /** Configura el reconocimiento de voz */
    if (recognition) {
        recognition.lang = 'es-ES';
        recognition.continuous = true;
        recognition.interimResults = true;

        let finalTranscript = '';

        recognition.onstart = () => {
            mainMicBtn.classList.add('recording');
            voiceAvatar.classList.add('listening');
            voiceAvatar.classList.remove('speaking');
            voiceStateText.textContent = 'Escuchando...';
            voiceSubText.textContent = 'Habla de forma clara y natural.';
            voiceTranscript.classList.remove('hidden');
            voiceTranscript.textContent = '';
            finalTranscript = '';
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            voiceTranscript.textContent = finalTranscript + interimTranscript;
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            mainMicBtn.classList.remove('recording');
            voiceAvatar.classList.remove('listening');

            if (event.error === 'not-allowed') {
                voiceStateText.textContent = 'Permiso denegado';
                voiceSubText.textContent = 'Activa el micrófono en la configuración.';
                micPermissionGranted = false;
            } else if (event.error === 'no-speech') {
                voiceStateText.textContent = 'No detecté tu voz';
                voiceSubText.textContent = 'Toca el micrófono e intenta de nuevo.';
            } else {
                voiceStateText.textContent = 'Error de audio';
                voiceSubText.textContent = 'Intenta de nuevo.';
            }
        };

        recognition.onend = () => {
            mainMicBtn.classList.remove('recording');
            voiceAvatar.classList.remove('listening');

            // Si hay transcripción final, enviarla como mensaje
            const trimmed = finalTranscript.trim();
            if (trimmed) {
                voiceStateText.textContent = 'Procesando tu mensaje...';
                voiceSubText.textContent = 'El Dr. Virtual está preparando su respuesta.';

                // Poner texto en el input del chat
                messageInput.value = trimmed;

                // Cambiar a la vista de chat y enviar
                document.querySelector('[data-view="chat"]').click();

                // Esperar un momento para que la vista cambie, luego enviar
                setTimeout(() => {
                    chatForm.dispatchEvent(new Event('submit', { cancelable: true }));
                }, 200);
            } else {
                voiceStateText.textContent = 'Toca el micrófono para hablar';
                voiceSubText.textContent = 'Habla con libertad, te escucho con atención.';
            }
        };

        // Botón principal del micrófono
        mainMicBtn.addEventListener('click', async () => {
            if (!micPermissionGranted) {
                await requestMicrophonePermission();
                if (!micPermissionGranted) return;
            }

            if (mainMicBtn.classList.contains('recording')) {
                recognition.stop();
            } else {
                try {
                    recognition.start();
                } catch (e) {
                    console.error('Error starting recognition:', e);
                    voiceStateText.textContent = 'Error al iniciar';
                    voiceSubText.textContent = 'Intenta de nuevo en unos segundos.';
                }
            }
        });
    } else {
        // Sin soporte de reconocimiento de voz
        if (mainMicBtn) {
            mainMicBtn.style.opacity = '0.3';
            mainMicBtn.addEventListener('click', () => {
                voiceStateText.textContent = 'No disponible';
                voiceSubText.textContent = 'Tu navegador no soporta reconocimiento de voz.';
            });
        }
    }

    // ============================================================
    // 10. HISTORY MANAGER — Gestión completa de historial
    // ============================================================

    /** Actualiza la UI del historial con todas las sesiones */
    function updateHistoryUI() {
        pwaHistoryList.innerHTML = '';
        const sessions = getSessionsIndex();

        if (sessions.length === 0) {
            pwaHistoryList.innerHTML = '<li class="empty-state">Aún no tienes sesiones guardadas.</li>';
            return;
        }

        // Mostrar sesiones en orden inverso (más reciente primero)
        const reversed = [...sessions].reverse();
        reversed.forEach(session => {
            const li = document.createElement('li');
            const isActive = session.id === currentSessionId;

            li.innerHTML = `
                <div class="session-info">
                    <strong>${isActive ? '● Sesión Activa' : 'Sesión'}</strong>
                    <span class="session-date">${formatDate(session.createdAt)} — ${session.messageCount || 0} mensajes</span>
                </div>
                <button class="delete-session-btn" data-session-id="${session.id}" title="Eliminar">✕</button>
            `;

            // Click en la sesión para cargarla
            li.querySelector('.session-info').addEventListener('click', () => {
                loadSession(session.id);
                document.querySelector('[data-view="chat"]').click();
            });

            // Click en eliminar
            li.querySelector('.delete-session-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteSession(session.id);
            });

            pwaHistoryList.appendChild(li);
        });
    }

    /** Elimina una sesión por su ID */
    function deleteSession(sessionId) {
        if (!confirm('¿Eliminar esta sesión? No se puede deshacer.')) return;

        // Eliminar datos de la sesión
        localStorage.removeItem('session_' + currentUser + '_' + sessionId);

        // Eliminar del índice
        let sessions = getSessionsIndex();
        sessions = sessions.filter(s => s.id !== sessionId);
        saveSessionsIndex(sessions);

        // Si era la sesión activa, cargar otra o crear nueva
        if (sessionId === currentSessionId) {
            if (sessions.length > 0) {
                loadSession(sessions[sessions.length - 1].id);
            } else {
                createNewSession();
            }
        }

        // Actualizar UI
        updateHistoryUI();
    }

    /** Botón de nueva sesión */
    pwaNewSessionBtn.addEventListener('click', () => {
        if (conversationHistory.length > 2) {
            if (!confirm('¿Crear una nueva sesión? Podrás volver a la actual desde el historial.')) return;
        }
        createNewSession();
        document.querySelector('[data-view="chat"]').click();
    });

    // ============================================================
    // 11. PROGRESS TRACKER — Progreso persistente en dispositivo
    // ============================================================

    /** Actualiza el progreso diario al iniciar sesión */
    function updateDailyProgress() {
        const progress = getUserProgress();
        const today = todayStr();

        // Agregar día activo si es nuevo
        if (!progress.daysActive.includes(today)) {
            progress.daysActive.push(today);
        }

        // Calcular racha
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (progress.lastAccess === yesterdayStr || progress.lastAccess === today) {
            // Continuamos la racha
            if (progress.lastAccess !== today) {
                progress.streak++;
            }
        } else if (progress.lastAccess !== today) {
            // Racha rota
            progress.streak = 1;
        }

        progress.lastAccess = today;
        saveUserProgress(progress);
    }

    /** Analiza la respuesta del terapeuta para ajustar mood score */
    function updateMoodFromResponse(responseText, progress) {
        const lower = responseText.toLowerCase();

        // Palabras positivas vs negativas (análisis básico)
        const positiveWords = ['bien', 'excelente', 'mejora', 'avance', 'logro', 'felicit', 'positiv', 'fuerza', 'progres', 'valent'];
        const negativeWords = ['preocup', 'ansiedad', 'trist', 'difícil', 'dolor', 'miedo', 'angust', 'crisis', 'problem'];

        let posCount = 0;
        let negCount = 0;

        positiveWords.forEach(w => { if (lower.includes(w)) posCount++; });
        negativeWords.forEach(w => { if (lower.includes(w)) negCount++; });

        // Ajustar score gradualmente (suavizado)
        const delta = (posCount - negCount) * 3;
        progress.moodScore = Math.max(10, Math.min(100, progress.moodScore + delta));
    }

    /** Actualiza la UI de progreso */
    function updateProgressUI() {
        const progress = getUserProgress();

        // Estadísticas
        statSessions.textContent = progress.totalSessions;
        statMessages.textContent = progress.totalMessages;
        statDays.textContent = progress.daysActive.length;
        statStreak.textContent = progress.streak;

        // Barra de ánimo
        const score = progress.moodScore;
        moodBar.style.width = score + '%';

        // Etiqueta de estado
        let statusLabel, feedbackMsg;
        if (score >= 80) {
            statusLabel = 'Excelente 🌟';
            feedbackMsg = '¡Tu estado emocional muestra una tendencia muy positiva! Continúa con tus sesiones para mantener este progreso.';
        } else if (score >= 60) {
            statusLabel = 'Mejorando 📈';
            feedbackMsg = 'Se nota un avance positivo en tu bienestar. Cada sesión suma a tu crecimiento personal.';
        } else if (score >= 40) {
            statusLabel = 'Estable ⚖️';
            feedbackMsg = 'Tu estado es estable. Recuerda que hablar de lo que sientes es el primer paso hacia el bienestar.';
        } else if (score >= 20) {
            statusLabel = 'En proceso 🌱';
            feedbackMsg = 'Estás dando pasos importantes. El proceso terapéutico lleva tiempo — sé paciente contigo.';
        } else {
            statusLabel = 'Inicio 🌅';
            feedbackMsg = 'Comienza tus conversaciones con el Dr. Virtual para que podamos evaluar y apoyar tu bienestar emocional.';
        }

        moodStatus.textContent = statusLabel;
        feedbackText.textContent = feedbackMsg;
    }

    // ============================================================
    // 12. SETTINGS — Configuración completa persistente
    // ============================================================

    /** Aplica el tema visual (dark / light) */
    function applyTheme(isDark) {
        if (isDark) {
            document.body.classList.remove('light-theme');
        } else {
            document.body.classList.add('light-theme');
        }
    }

    /** Toggle de modo oscuro */
    darkModeToggle.addEventListener('change', (e) => {
        const isDark = e.target.checked;
        applyTheme(isDark);
        const prefs = getUserPrefs();
        prefs.darkMode = isDark;
        saveUserPrefs(prefs);
    });

    /** Toggle de sonido */
    soundToggle.addEventListener('change', (e) => {
        soundEnabled = e.target.checked;
        if (!soundEnabled && synth.speaking) {
            synth.cancel();
        }
        const prefs = getUserPrefs();
        prefs.soundEnabled = soundEnabled;
        saveUserPrefs(prefs);
    });

    /** Actualiza la UI de ajustes */
    function updateSettingsUI() {
        pwaUserBadge.textContent = 'Paciente: ' + (currentUser || 'Sin sesión');

        const db = getUsersDB();
        const userData = db[currentUser];
        if (userData && userData.registeredAt) {
            pwaUserSince.textContent = 'Registrado: ' + formatDate(userData.registeredAt);
        }
    }

    // ============================================================
    // 12. SOCIAL & REAL-TIME COMMUNITY — GunDB & Games
    // ============================================================

    /** Games & Social Logic Removed */

    pwaLogoutBtn.addEventListener('click', () => {
        if (synth.speaking) synth.cancel();
        if (recognition && mainMicBtn.classList.contains('recording')) {
            recognition.stop();
        }
        location.reload();
    });

    /** Borrar TODOS los datos */
    pwaClearDataBtn.addEventListener('click', () => {
        if (!confirm('⚠️ ¿Seguro? Esto eliminará TODOS tus datos: sesiones, historial, progreso y preferencias.')) return;
        if (!confirm('Esta acción NO se puede deshacer. ¿Continuar?')) return;

        // Borrar todo lo relacionado con PsicoTuyo
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('psicotuyo') || (currentUser && key.includes(currentUser)))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        location.reload();
    });

    // ============================================================
    // 13. INITIALIZATION — Arranque seguro de la aplicación
    // ============================================================
    function bootApp() {
        const loadingScreen = document.getElementById('loading-screen');
        const debugBanner = document.getElementById('debug-banner');

        try {
            console.log('Iniciando PsicoTuyo...');
            if (debugBanner) debugBanner.innerHTML += '<div>⚙️ Iniciando arranque...</div>';

            // 1. Verificar soporte de localStorage
            try {
                localStorage.setItem('test_storage', '1');
                localStorage.removeItem('test_storage');
            } catch (e) {
                console.error('LocalStorage no disponible:', e);
                if (debugBanner) {
                    debugBanner.classList.remove('hidden');
                    debugBanner.innerHTML += '<div style="color:yellow">⚠️ ADVERTENCIA: LocalStorage no disponible. Los datos no se guardarán permanentemente.</div>';
                }
            }

            // 2. Garantizar que los elementos críticos existan
            if (!loginOverlay || !mainApp) {
                console.error('Elementos críticos faltantes:', { loginOverlay, mainApp });
                if (debugBanner) debugBanner.innerHTML += '<div style="color:red">❌ ERROR: Elementos del DOM no encontrados.</div>';
                return; // Evita el crash duro
            }

            // 3. Estado inicial: solo login visible
            loginOverlay.classList.remove('hidden');
            mainApp.classList.add('hidden');

            if (loginError) loginError.classList.add('hidden');
            if (usernameInput) usernameInput.focus();

            // 4. Quitar pantalla de carga tras breve delay para suavidad
            setTimeout(() => {
                if (loadingScreen) {
                    loadingScreen.style.opacity = '0';
                    setTimeout(() => loadingScreen.classList.add('hidden'), 500);
                }
                console.log('PsicoTuyo v2.3.0 — Listo.');
            }, 800);

        } catch (e) {
            console.error('Error crítico al arrancar:', e);
            if (debugBanner) {
                debugBanner.classList.remove('hidden');
                debugBanner.innerHTML += `<div style="background:red; padding:5px; margin-top:5px">🔥 ERROR CRÍTICO: ${e.message}</div>`;
            }
            // Aún así intentar quitar el loading para ver el error
            if (loadingScreen) loadingScreen.classList.add('hidden');
        }
    }

    // Ejecutar arranque
    bootApp();


}); // Fin DOMContentLoaded
