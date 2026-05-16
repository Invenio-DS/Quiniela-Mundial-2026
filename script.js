// ==================== CONFIGURACIÓN ====================
// REEMPLAZA ESTOS VALORES CON LOS TUYOS
const SUPABASE_URL = 'https://tuproyecto.supabase.co';
const SUPABASE_ANON_KEY = 'tu-clave-anon-publica';

// Crear cliente de forma segura
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// Pantalla de bienvenida con reglas
async function mostrarBienvenida() {
    const contenido = document.getElementById('contenido');
    contenido.innerHTML = `
        <div style="background:white; max-width:800px; margin:2rem auto; padding:2rem; border-radius:24px; color:#000;">
            <h1 style="text-align:center;">🏆 Quiniela Mundial 2026</h1>
            <h2>📜 Reglas de puntuación</h2>
            <p>Acertar marcador exacto: 6 puntos<br>
            Acertar resultado (ganador/empate): 3 puntos<br>
            Posición exacta en grupo: 12 puntos<br>
            Clasificado a 16vos: 9 puntos<br>
            ... (puedes editar luego)</p>
            <button id="btnContinuar" style="background:#f5c542; border:none; padding:12px 24px; border-radius:40px; cursor:pointer;">Continuar →</button>
        </div>
    `;
    document.getElementById('btnContinuar').onclick = () => mostrarLogin();
}

// Pantalla de login / registro
function mostrarLogin() {
    const contenido = document.getElementById('contenido');
    contenido.innerHTML = `
        <div style="background:white; max-width:400px; margin:2rem auto; padding:2rem; border-radius:24px;">
            <h3>Acceso</h3>
            <input type="email" id="email" placeholder="Email" style="width:100%; margin:8px 0; padding:10px;">
            <input type="password" id="password" placeholder="Contraseña" style="width:100%; margin:8px 0; padding:10px;">
            <button id="loginBtn" style="background:#0a5c2e; color:white; width:100%; padding:10px; border:none;">Ingresar</button>
            <p style="margin-top:12px;">¿No tienes cuenta? <a href="#" id="showReg">Regístrate</a></p>
            <div id="regForm" style="display:none;">
                <input type="text" id="regNombre" placeholder="Nombre" style="width:100%; margin:8px 0; padding:10px;">
                <input type="email" id="regEmail" placeholder="Email" style="width:100%; margin:8px 0; padding:10px;">
                <input type="password" id="regPassword" placeholder="Contraseña" style="width:100%; margin:8px 0; padding:10px;">
                <button id="registroBtn" style="background:#0a5c2e; color:white; width:100%; padding:10px; border:none;">Registrarse</button>
            </div>
        </div>
    `;

    document.getElementById('loginBtn').onclick = async () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const { error, data } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) return alert(error.message);
        currentUser = data.user;
        await cargarPerfil();
        mostrarDashboard();
    };

    document.getElementById('showReg').onclick = (e) => {
        e.preventDefault();
        document.getElementById('regForm').style.display = 'block';
    };

    document.getElementById('registroBtn').onclick = async () => {
        const nombre = document.getElementById('regNombre').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const { error, data } = await _supabase.auth.signUp({ email, password });
        if (error) return alert(error.message);
        await _supabase.from('perfiles').insert([{ id: data.user.id, nombre, rol: 'usuario', puntos_totales: 0 }]);
        alert("Registrado. Ahora inicia sesión.");
        mostrarLogin();
    };
}

async function cargarPerfil() {
    const { data } = await _supabase.from('perfiles').select('*').eq('id', currentUser.id).single();
    if (data) {
        currentUserPuntos = data.puntos_totales || 0;
        currentUserRol = data.rol;
    }
}

function mostrarDashboard() {
    const contenido = document.getElementById('contenido');
    contenido.innerHTML = `
        <div style="background:#f0f0f0; min-height:100vh; padding:20px;">
            <div style="background:#0a2a1f; color:white; padding:1rem; border-radius:24px; display:flex; justify-content:space-between;">
                <h2>⚽ Mundial 2026</h2>
                <div>👤 ${currentUser.email} | 🏆 Puntos: ${currentUserPuntos || 0}</div>
            </div>
            <div style="margin-top:20px;">
                <p>Aquí irán los grupos, partidos y pronósticos.</p>
                <button id="logoutBtn" style="background:#c00; color:white; padding:8px 16px; border:none;">Cerrar sesión</button>
            </div>
        </div>
    `;
    document.getElementById('logoutBtn').onclick = async () => {
        await _supabase.auth.signOut();
        location.reload();
    };
}

// Inicialización
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