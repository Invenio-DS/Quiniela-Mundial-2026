// ==================== CONFIGURACIÓN SUPABASE ====================
const SUPABASE_URL = 'https://tylnpyuerchhkrinpixn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5bG5weXVlcmNoaGtyaW5waXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDAzNDQsImV4cCI6MjA5NDUxNjM0NH0.ZnCQmrFNXrJuiqxQEQSTxtPSzRKBSjtzVoTIbB0evao';

let _supabase = null;
let currentUser = null;
let currentUserRol = 'usuario';
let currentUserPuntos = 0;
let partidosCache = [];
let equiposCache = [];

// ==================== INICIALIZACIÓN ====================
function initSupabase() {
    if (window.supabase) {
        _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase inicializado");
        iniciarApp();
    } else {
        console.log("Esperando Supabase...");
        setTimeout(initSupabase, 100);
    }
}

// ==================== UTILIDADES ====================
async function cargarEquipos() {
    const { data, error } = await _supabase.from('equipos').select('*');
    if (error) throw error;
    equiposCache = data;
    return data;
}

async function cargarPartidos() {
    const { data, error } = await _supabase.from('partidos').select('*');
    if (error) throw error;
    partidosCache = data;
    return data;
}

function getNombreEquipo(id) {
    const eq = equiposCache.find(e => e.id === id);
    return eq ? eq.nombre : '?';
}

// ==================== LIMPIAR CACHE DEL NAVEGADOR ====================
function limpiarCacheNavegador() {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    console.log("Caché del navegador limpiada");
}

// ==================== VISTAS ====================
async function mostrarBienvenida() {
    let reglasTexto = "Cargando reglas...";
    const { data, error } = await _supabase.from('configuracion').select('valor').eq('clave', 'reglas_puntuacion').maybeSingle();
    if (!error && data) reglasTexto = data.valor;

    document.getElementById('contenido').innerHTML = `
        <div class="container" style="padding: 2rem;">
            <div class="logo" style="text-align:center; margin-bottom:2rem;">
                <h1 style="font-size:2.5rem;">🏆 Mundial 2026</h1>
                <p>Quiniela interactiva</p>
            </div>
            <div class="card" style="background:#fff; border-radius:24px; padding:1.5rem;">
                <h2>📜 Reglas y puntuación</h2>
                <div style="white-space: pre-line;">${reglasTexto.replace(/\n/g, '<br>')}</div>
                <button id="btnContinuar" style="background:#f5c542; border:none; padding:12px 24px; border-radius:40px; margin-top:1rem; font-weight:bold; cursor:pointer;">Continuar →</button>
            </div>
        </div>
    `;
    document.getElementById('btnContinuar').onclick = () => mostrarLogin();
}

function mostrarLogin() {
    document.getElementById('contenido').innerHTML = `
        <div class="container" style="max-width: 500px; margin: 40px auto; padding: 2rem;">
            <h2 style="text-align:center;">Acceso a la Quiniela</h2>
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button id="btnLoginTab" class="tab-btn active">Iniciar sesión</button>
                <button id="btnRegistroTab" class="tab-btn">Registrarse</button>
            </div>
            <div id="loginForm">
                <input type="email" id="email" placeholder="Email" style="width:100%; padding:12px; margin:8px 0;">
                <input type="password" id="password" placeholder="Contraseña" style="width:100%; padding:12px; margin:8px 0;">
                <button id="loginBtn" style="background:#0a5c2e; color:white; padding:12px; width:100%; border:none; border-radius:40px;">Ingresar</button>
                <div id="loginError" style="color:red; margin-top:8px;"></div>
            </div>
            <div id="registroForm" style="display:none;">
                <input type="text" id="regNombre" placeholder="Nombre completo" style="width:100%; padding:12px; margin:8px 0;">
                <input type="email" id="regEmail" placeholder="Email" style="width:100%; padding:12px; margin:8px 0;">
                <input type="password" id="regPassword" placeholder="Contraseña" style="width:100%; padding:12px; margin:8px 0;">
                <button id="registroBtn" style="background:#0a5c2e; color:white; padding:12px; width:100%; border:none; border-radius:40px;">Crear cuenta</button>
                <div id="regError" style="color:red; margin-top:8px;"></div>
            </div>
        </div>
    `;

    document.getElementById('btnLoginTab').onclick = () => {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registroForm').style.display = 'none';
    };
    document.getElementById('btnRegistroTab').onclick = () => {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registroForm').style.display = 'block';
    };
    document.getElementById('loginBtn').onclick = async () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorSpan = document.getElementById('loginError');
        errorSpan.innerText = 'Iniciando sesión...';
        try {
            const { error, data } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) { errorSpan.innerText = error.message; return; }
            currentUser = data.user;
            await cargarPerfilUsuario();
            await cargarEquipos();
            await cargarPartidos();
            mostrarDashboard();
        } catch (err) { errorSpan.innerText = err.message; }
    };
    document.getElementById('registroBtn').onclick = async () => {
        const nombre = document.getElementById('regNombre').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const errorSpan = document.getElementById('regError');
        errorSpan.innerText = 'Registrando...';
        try {
            const { error, data } = await _supabase.auth.signUp({ email, password });
            if (error) { errorSpan.innerText = error.message; return; }
            await _supabase.from('perfiles').insert([{ id: data.user.id, nombre: nombre, rol: 'usuario', puntos_totales: 0 }]);
            alert("Registro exitoso, ahora inicia sesión");
            mostrarLogin();
        } catch (err) { errorSpan.innerText = err.message; }
    };
}

async function cargarPerfilUsuario() {
    let { data, error } = await _supabase.from('perfiles').select('*').eq('id', currentUser.id).maybeSingle();
    if (error || !data) {
        const nuevoPerfil = { id: currentUser.id, nombre: currentUser.email, rol: 'usuario', puntos_totales: 0 };
        await _supabase.from('perfiles').insert([nuevoPerfil]);
        data = nuevoPerfil;
    }
    if (data) {
        currentUserRol = data.rol || 'usuario';
        currentUserPuntos = data.puntos_totales || 0;
    }
}

// ==================== DASHBOARD (con limpieza de caché en logout) ====================
async function mostrarDashboard() {
    if (equiposCache.length === 0) await cargarEquipos();
    if (partidosCache.length === 0) await cargarPartidos();

    const { data: goleadorExistente } = await _supabase.from('pronosticos_goleador').select('jugador_nombre').eq('usuario_id', currentUser.id).maybeSingle();
    const yaVotoGoleador = !!goleadorExistente;
    const nombreGoleador = goleadorExistente?.jugador_nombre || '';

    document.getElementById('contenido').innerHTML = `
        <div class="container">
            <div class="header">
                <div class="logo"><h1>⚽ Mundial 2026 <span>Quiniela</span></h1></div>
                <div class="user-info">
                    <i class="fas fa-user"></i> ${currentUser.email} 
                    <i class="fas fa-trophy"></i> Puntos: ${currentUserPuntos}
                    <button id="btnRankingGlobal" class="btn-ranking"><i class="fas fa-chart-line"></i> Ranking</button>
                    <button id="logoutBtn" style="background:#c00; color:white; border:none; padding:8px 16px; border-radius:30px; margin-left:10px;">Cerrar sesión</button>
                </div>
            </div>
            <div class="tabs">
                <button class="tab-btn active" data-tab="grupos"><i class="fas fa-users"></i> Grupos</button>
                <button class="tab-btn" data-tab="partidos"><i class="fas fa-calendar-alt"></i> Pronósticos</button>
                <button class="tab-btn" data-tab="terceros"><i class="fas fa-star"></i> Mejores 3ros</button>
                <button class="tab-btn" data-tab="goleador"><i class="fas fa-futbol"></i> Goleador</button>
                ${currentUserRol === 'admin' ? '<button class="tab-btn" data-tab="admin"><i class="fas fa-cogs"></i> Admin</button>' : ''}
            </div>
            <div class="tab-content">
                <div id="grupos" class="tab-pane active"></div>
                <div id="partidos" class="tab-pane"></div>
                <div id="terceros" class="tab-pane"></div>
                <div id="goleador" class="tab-pane"></div>
                <div id="admin" class="tab-pane"></div>
            </div>
        </div>
    `;

    await renderGrupos();
    await renderPartidos();
    await renderMejoresTerceros();
    renderGoleador(yaVotoGoleador, nombreGoleador);
    if (currentUserRol === 'admin') renderAdmin();

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            btn.classList.add('active');
        });
    });
    document.getElementById('btnRankingGlobal').onclick = mostrarRanking;

    // Logout con limpieza de caché
    document.getElementById('logoutBtn').onclick = async () => {
        await _supabase.auth.signOut();
        limpiarCacheNavegador();
        window.location.href = window.location.href.split('?')[0] + '?nocache=' + Date.now();
    };
}

// ==================== FUNCIONES DE RENDER ====================
async function renderGrupos() {
    const container = document.getElementById('grupos');
    const grupos = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    let html = '<div class="grupos-grid">';
    for (let g of grupos) {
        const equiposGrupo = equiposCache.filter(eq => eq.grupo === g);
        html += `<div class="card-grupo"><h3>Grupo ${g}</h3><table class="tabla-posiciones">`;
        equiposGrupo.forEach(eq => { html += `<tr><td>${eq.nombre}</td><td>${eq.confederacion}</td></tr>`; });
        html += `</table><div id="simulacion-${g}">Cargando...</div></div>`;
    }
    html += '</div>';
    container.innerHTML = html;
    for (let g of grupos) {
        const posiciones = await simularPosicionesGrupo(g, currentUser.id);
        document.getElementById(`simulacion-${g}`).innerHTML = posiciones.length ? `<ol>${posiciones.map(p => `<li>${p.nombre} (${p.puntos} pts)</li>`).join('')}</ol>` : 'Sin pronósticos';
    }
}

async function simularPosicionesGrupo(grupoLetra, usuarioId) {
    const equiposGrupo = equiposCache.filter(eq => eq.grupo === grupoLetra);
    const idsEquipos = equiposGrupo.map(e => e.id);
    const partidosGrupo = partidosCache.filter(p => p.fase === 'grupos' && idsEquipos.includes(p.equipo_local_id));
    const { data: pronos } = await _supabase.from('pronosticos_partidos').select('*').eq('usuario_id', usuarioId).in('partido_id', partidosGrupo.map(p => p.id));
    if (!pronos || pronos.length === 0) return [];
    let tabla = equiposGrupo.map(eq => ({ id: eq.id, nombre: eq.nombre, puntos: 0, gf: 0, gc: 0 }));
    for (let partido of partidosGrupo) {
        const prono = pronos.find(pr => pr.partido_id === partido.id);
        if (!prono) continue;
        const local = tabla.find(t => t.id === partido.equipo_local_id);
        const visit = tabla.find(t => t.id === partido.equipo_visitante_id);
        if (prono.goles_local > prono.goles_visitante) local.puntos += 3;
        else if (prono.goles_local < prono.goles_visitante) visit.puntos += 3;
        else { local.puntos += 1; visit.puntos += 1; }
        local.gf += prono.goles_local; local.gc += prono.goles_visitante;
        visit.gf += prono.goles_visitante; visit.gc += prono.goles_local;
    }
    tabla.sort((a,b) => b.puntos - a.puntos || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf);
    return tabla;
}

async function renderPartidos() {
    const container = document.getElementById('partidos');
    let html = '<h3>Fase de Grupos</h3><div class="partidos-lista">';
    for (let p of partidosCache.filter(p => p.fase === 'grupos')) {
        html += await generarCardPartido(p);
    }
    html += '</div><h3>Eliminatorias</h3><div class="partidos-lista">';
    for (let p of partidosCache.filter(p => p.fase !== 'grupos')) {
        html += await generarCardPartido(p);
    }
    html += '</div>';
    container.innerHTML = html;
    document.querySelectorAll('.btn-guardar-prono').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const partidoId = parseInt(btn.dataset.partidoId);
            const gLocal = parseInt(document.getElementById(`gol_local_${partidoId}`).value);
            const gVisit = parseInt(document.getElementById(`gol_visit_${partidoId}`).value);
            const penaltis = document.getElementById(`penaltis_${partidoId}`).checked;
            if (isNaN(gLocal) || isNaN(gVisit)) { alert("Ingresa números"); return; }
            await _supabase.from('pronosticos_partidos').upsert({ usuario_id: currentUser.id, partido_id: partidoId, goles_local: gLocal, goles_visitante: gVisit, penaltis: penaltis, fecha_pronostico: new Date() }, { onConflict: 'usuario_id, partido_id' });
            alert("Guardado");
        });
    });
}

async function generarCardPartido(partido) {
    const { data: prono } = await _supabase.from('pronosticos_partidos').select('*').eq('usuario_id', currentUser.id).eq('partido_id', partido.id).maybeSingle();
    const gLocal = prono ? prono.goles_local : '';
    const gVisit = prono ? prono.goles_visitante : '';
    const penaltis = prono ? prono.penaltis : false;
    return `
        <div class="partido-item">
            <div>${new Date(partido.fecha_hora).toLocaleDateString()}<br><strong>${getNombreEquipo(partido.equipo_local_id)} vs ${getNombreEquipo(partido.equipo_visitante_id)}</strong><br>Real: ${partido.goles_local_real ?? '?'} - ${partido.goles_visitante_real ?? '?'}</div>
            <div class="pronostico-inputs">
                <input type="number" id="gol_local_${partido.id}" value="${gLocal}" style="width:70px"> - <input type="number" id="gol_visit_${partido.id}" value="${gVisit}" style="width:70px">
                <label><input type="checkbox" id="penaltis_${partido.id}" ${penaltis ? 'checked' : ''}> Penales</label>
                <button class="btn-guardar btn-guardar-prono" data-partido-id="${partido.id}">Guardar</button>
            </div>
        </div>
    `;
}

async function renderMejoresTerceros() {
    const container = document.getElementById('terceros');
    const grupos = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    let terceros = [];
    for (let g of grupos) {
        const tabla = await simularPosicionesGrupo(g, currentUser.id);
        if (tabla[2]) terceros.push({ grupo: g, equipo: tabla[2], puntos: tabla[2].puntos, dif: tabla[2].gf - tabla[2].gc });
    }
    terceros.sort((a,b) => b.puntos - a.puntos || b.dif - a.dif);
    container.innerHTML = `<h4>Los 8 mejores terceros</h4><ul>${terceros.slice(0,8).map(t => `<li>Grupo ${t.grupo}: ${t.equipo.nombre} (${t.puntos} pts)</li>`).join('')}</ul>`;
}

function renderGoleador(yaVoto, nombreActual) {
    const container = document.getElementById('goleador');
    if (yaVoto) {
        container.innerHTML = `<div><i class="fas fa-trophy"></i> Tu goleador: <strong>${nombreActual}</strong>. No puedes modificarlo.</div>`;
    } else {
        container.innerHTML = `<div><input type="text" id="goleador-input" placeholder="Nombre del jugador"><button id="guardarGoleadorBtn">Guardar</button></div>`;
        document.getElementById('guardarGoleadorBtn').onclick = async () => {
            const jugador = document.getElementById('goleador-input').value.trim();
            if (!jugador) return alert("Escribe un nombre");
            await _supabase.from('pronosticos_goleador').insert({ usuario_id: currentUser.id, jugador_nombre: jugador });
            alert("Guardado");
            mostrarDashboard();
        };
    }
}

function renderAdmin() {
    const container = document.getElementById('admin');
    container.innerHTML = '<p>Panel admin: próximamente carga de resultados reales.</p>';
}

async function mostrarRanking() {
    const { data: perfiles } = await _supabase.from('perfiles').select('nombre, puntos_totales').order('puntos_totales', { ascending: false });
    let html = '<div style="background:white; padding:1rem; border-radius:24px;"><h3>Ranking</h3><ul>';
    perfiles.forEach((p,i) => { html += `<li>${i+1}. ${p.nombre} - ${p.puntos_totales} pts</li>`; });
    html += '</ul><button onclick="this.parentElement.remove()">Cerrar</button></div>';
    const modal = document.createElement('div');
    modal.style.position = 'fixed'; modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100%'; modal.style.height = '100%'; modal.style.background = 'rgba(0,0,0,0.7)'; modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center'; modal.style.zIndex = '1000';
    modal.innerHTML = html;
    document.body.appendChild(modal);
}

// ==================== ARRANQUE ====================
function iniciarApp() {
    (async () => {
        const { data: { session } } = await _supabase.auth.getSession();
        if (session) {
            currentUser = session.user;
            await cargarPerfilUsuario();
            await cargarEquipos();
            await cargarPartidos();
            mostrarDashboard();
        } else {
            mostrarBienvenida();
        }
    })();
}

document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
});
