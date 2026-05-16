// ==================== CONFIGURACIÓN ====================
const SUPABASE_URL = 'https://tylnpyuerchhkrinpixn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5bG5weXVlcmNoaGtyaW5waXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDAzNDQsImV4cCI6MjA5NDUxNjM0NH0.ZnCQmrFNXrJuiqxQEQSTxtPSzRKBSjtzVoTIbB0evao';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentUserRol = 'usuario';
let currentUserPuntos = 0;

// ==================== VISTA BIENVENIDA ====================
async function mostrarBienvenida() {
    const contenido = document.getElementById('contenido');
    contenido.innerHTML = `
        <div class="container" style="max-width:800px; margin:0 auto;">
            <div class="card" style="text-align:center;">
                <h1 style="color:#0a5c2e;">🏆 Quiniela Mundial 2026</h1>
                <p style="margin:1rem 0;">Participa y gana puntos pronosticando los resultados.</p>
                <h2>📜 Reglas de puntuación</h2>
                <div style="text-align:left; margin:1rem 0;">
                    <p>✅ Acertar marcador exacto: <strong>6 puntos</strong></p>
                    <p>✅ Acertar resultado (ganador/empate): <strong>3 puntos</strong></p>
                    <p>✅ Posición final exacta en grupo: <strong>12 puntos</strong></p>
                    <p>✅ Clasificado a 16vos: <strong>9 puntos</strong></p>
                    <p>✅ Campeón de goleo: <strong>100 puntos</strong></p>
                </div>
                <button id="btnContinuar" style="background:#f5c542; border:none; padding:12px 24px; border-radius:40px; font-weight:bold;">Continuar →</button>
            </div>
        </div>
    `;
    document.getElementById('btnContinuar').onclick = () => mostrarLogin();
}

// ==================== LOGIN / REGISTRO ====================
function mostrarLogin() {
    const contenido = document.getElementById('contenido');
    contenido.innerHTML = `
        <div class="container" style="max-width:450px; margin:0 auto;">
            <div class="card">
                <h2 style="text-align:center;">Acceso</h2>
                <div style="display:flex; gap:10px; margin-bottom:20px;">
                    <button id="btnLoginTab" style="flex:1; background:#0a5c2e; color:white; border:none; padding:8px; border-radius:30px;">Iniciar sesión</button>
                    <button id="btnRegistroTab" style="flex:1; background:#ccc; border:none; padding:8px; border-radius:30px;">Registrarse</button>
                </div>
                <div id="panelLogin">
                    <input type="email" id="email" placeholder="Email" style="width:100%; margin:8px 0;">
                    <input type="password" id="password" placeholder="Contraseña" style="width:100%; margin:8px 0;">
                    <button id="loginBtn" style="width:100%; background:#0a5c2e; color:white; padding:10px; border:none; border-radius:40px;">Ingresar</button>
                    <p id="loginError" style="color:red; margin-top:8px;"></p>
                </div>
                <div id="panelRegistro" style="display:none;">
                    <input type="text" id="regNombre" placeholder="Nombre completo" style="width:100%; margin:8px 0;">
                    <input type="email" id="regEmail" placeholder="Email" style="width:100%; margin:8px 0;">
                    <input type="password" id="regPassword" placeholder="Contraseña" style="width:100%; margin:8px 0;">
                    <button id="registroBtn" style="width:100%; background:#0a5c2e; color:white; padding:10px; border:none; border-radius:40px;">Crear cuenta</button>
                    <p id="regError" style="color:red; margin-top:8px;"></p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btnLoginTab').onclick = () => {
        document.getElementById('panelLogin').style.display = 'block';
        document.getElementById('panelRegistro').style.display = 'none';
    };
    document.getElementById('btnRegistroTab').onclick = () => {
        document.getElementById('panelLogin').style.display = 'none';
        document.getElementById('panelRegistro').style.display = 'block';
    };

    // LOGIN
    document.getElementById('loginBtn').onclick = async () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorSpan = document.getElementById('loginError');
        errorSpan.innerText = 'Iniciando sesión...';
        try {
            const { error, data } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) {
                errorSpan.innerText = error.message;
                return;
            }
            currentUser = data.user;
            await cargarPerfil();
            mostrarDashboard();
        } catch (err) {
            errorSpan.innerText = err.message;
        }
    };

    // REGISTRO
    document.getElementById('registroBtn').onclick = async () => {
        const nombre = document.getElementById('regNombre').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const errorSpan = document.getElementById('regError');
        errorSpan.innerText = 'Registrando...';
        try {
            const { error, data } = await _supabase.auth.signUp({ email, password });
            if (error) {
                errorSpan.innerText = error.message;
                return;
            }
            // Crear perfil automáticamente (evita error 406 después)
            const { error: perfilError } = await _supabase.from('perfiles').insert([{ id: data.user.id, nombre: nombre, rol: 'usuario', puntos_totales: 0 }]);
            if (perfilError) console.error(perfilError);
            alert("Registro exitoso. Ahora inicia sesión.");
            mostrarLogin();
        } catch (err) {
            errorSpan.innerText = err.message;
        }
    };
}

async function cargarPerfil() {
    // Intentar obtener el perfil
    let { data, error } = await _supabase.from('perfiles').select('*').eq('id', currentUser.id).maybeSingle(); // Usar maybeSingle en lugar de single
    if (error) {
        console.error("Error al cargar perfil:", error);
        // Si no existe, crearlo automáticamente
        const nuevoPerfil = { id: currentUser.id, nombre: currentUser.email || 'Usuario', rol: 'usuario', puntos_totales: 0 };
        await _supabase.from('perfiles').insert([nuevoPerfil]);
        data = nuevoPerfil;
    }
    if (data) {
        currentUserRol = data.rol || 'usuario';
        currentUserPuntos = data.puntos_totales || 0;
    } else {
        currentUserRol = 'usuario';
        currentUserPuntos = 0;
    }
}

function mostrarDashboard() {
    const contenido = document.getElementById('contenido');
    contenido.innerHTML = `
        <div class="container">
            <div style="background:#0a2a1f; color:white; padding:1rem; border-radius:24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <h2>⚽ Mundial 2026</h2>
                <div><i class="fas fa-user"></i> ${currentUser.email} | 🏆 Puntos: ${currentUserPuntos}</div>
                <button id="logoutBtn" style="background:#c00; color:white; border:none; padding:8px 16px; border-radius:30px;">Cerrar sesión</button>
            </div>
            <div class="card" style="margin-top:20px; text-align:center;">
                <h3>Bienvenido a tu quiniela</h3>
                <p>Próximamente: grupos, partidos y pronósticos.</p>
                ${currentUserRol === 'admin' ? '<p style="background:#f5c542; color:#000; padding:10px; border-radius:20px;">🔧 Eres administrador.</p>' : ''}
            </div>
        </div>
    `;
    document.getElementById('logoutBtn').onclick = async () => {
        await _supabase.auth.signOut();
        location.reload();
    };
}

// INICIO
(async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session && session.user) {
        currentUser = session.user;
        await cargarPerfil();
        mostrarDashboard();
    } else {
        mostrarBienvenida();
    }
})();
