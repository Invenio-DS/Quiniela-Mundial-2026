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
    const grupos = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

    // Obtener todos los partidos que ya tienen resultado real (goles no nulos)
    const partidosConResultado = partidosCache.filter(p => p.goles_local_real !== null && p.goles_visitante_real !== null && p.fase === 'grupos');

    let html = '<div style="text-align:right; margin-bottom:15px;"><button id="btnVerPartidosGrupo" class="btn-ranking" style="background:#0a5c2e; color:white;"><i class="fas fa-calendar-alt"></i> Ver partidos por grupo</button></div>';
    html += '<div class="grupos-grid">';

    for (let g of grupos) {
        const equiposGrupo = equiposCache.filter(eq => eq.grupo === g);
        // Calcular estadísticas reales del grupo
        let stats = [];
        for (let equipo of equiposGrupo) {
            // Partidos donde el equipo es local o visitante
            const partidosLocal = partidosConResultado.filter(p => p.equipo_local_id === equipo.id);
            const partidosVisit = partidosConResultado.filter(p => p.equipo_visitante_id === equipo.id);
            let pj = 0, pg = 0, pe = 0, pp = 0, gf = 0, gc = 0;
            for (let p of partidosLocal) {
                pj++;
                gf += p.goles_local_real;
                gc += p.goles_visitante_real;
                if (p.goles_local_real > p.goles_visitante_real) pg++;
                else if (p.goles_local_real === p.goles_visitante_real) pe++;
                else pp++;
            }
            for (let p of partidosVisit) {
                pj++;
                gf += p.goles_visitante_real;
                gc += p.goles_local_real;
                if (p.goles_visitante_real > p.goles_local_real) pg++;
                else if (p.goles_visitante_real === p.goles_local_real) pe++;
                else pp++;
            }
            const puntos = pg * 3 + pe;
            const dif = gf - gc;
            stats.push({ equipo: equipo.nombre, pj, pg, pe, pp, gf, gc, dif, puntos });
        }
        // Ordenar por puntos, dif, gf
        stats.sort((a,b) => b.puntos - a.puntos || b.dif - a.dif || b.gf - a.gf);

        html += `<div class="card-grupo"><h3>Grupo ${g}</h3><table class="tabla-posiciones" style="width:100%; font-size:0.8rem;">`;
        html += `<tr><th>Equipo</th><th>JJ</th><th>JG</th><th>JE</th><th>JP</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr>`;
        stats.forEach(s => {
            html += `<tr><td>${s.equipo}</td><td>${s.pj}</td><td>${s.pg}</td><td>${s.pe}</td><td>${s.pp}</td><td>${s.gf}</td><td>${s.gc}</td><td>${s.dif}</td><td><b>${s.puntos}</b></td></tr>`;
        });
        html += `</table></div>`;
    }
    html += '</div>';
    container.innerHTML = html;

    // Asignar evento al botón
    document.getElementById('btnVerPartidosGrupo').onclick = () => mostrarPartidosPorGrupo();
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

async function mostrarPartidosPorGrupo() {
    // Obtener todos los partidos de grupos (sin importar si tienen resultado)
    const partidosGrupo = partidosCache.filter(p => p.fase === 'grupos');
    // Agrupar por grupo
    const grupos = [...new Set(partidosGrupo.map(p => {
        const local = equiposCache.find(e => e.id === p.equipo_local_id);
        return local ? local.grupo : null;
    }).filter(g => g))];
    let contenidoModal = `<div style="background:white; border-radius:24px; max-width:800px; margin:auto; padding:1rem; max-height:80vh; overflow-y:auto;">
        <div style="display:flex; justify-content:space-between;"><h3>📅 Partidos de Fase de Grupos</h3><button id="cerrarModalPartidos" style="background:#c00; color:white; border:none; border-radius:50%; width:30px;">X</button></div>`;
    for (let g of grupos.sort()) {
        const partidosGrupoG = partidosGrupo.filter(p => {
            const local = equiposCache.find(e => e.id === p.equipo_local_id);
            return local && local.grupo === g;
        });
        contenidoModal += `<h4>Grupo ${g}</h4><ul style="list-style:none; padding-left:0;">`;
        for (let p of partidosGrupoG) {
            const local = getNombreEquipo(p.equipo_local_id);
            const visit = getNombreEquipo(p.equipo_visitante_id);
            const fecha = new Date(p.fecha_hora).toLocaleString();
            const resultadoReal = (p.goles_local_real !== null && p.goles_visitante_real !== null) ? `${p.goles_local_real} - ${p.goles_visitante_real}` : 'Sin jugar';
            // Si el usuario es admin, mostramos inputs para cargar resultado; si no, solo texto
            let fila = `<li><strong>${local} vs ${visit}</strong><br>📅 ${fecha}<br>🏆 Resultado real: ${resultadoReal}`;
            if (currentUserRol === 'admin') {
                fila += `<br><div style="display:flex; gap:8px; margin-top:5px;">
                            <input type="number" id="real_local_${p.id}" placeholder="Local" style="width:60px;" value="${p.goles_local_real ?? ''}">
                            - <input type="number" id="real_visit_${p.id}" placeholder="Visit" style="width:60px;" value="${p.goles_visitante_real ?? ''}">
                            <label><input type="checkbox" id="penales_real_${p.id}" ${p.ganador_penaltis_real ? 'checked' : ''}> Penales</label>
                            <button class="guardar-resultado-admin" data-id="${p.id}" style="background:#f5c542; border:none; border-radius:20px; padding:4px 12px;">Guardar</button>
                          </div>`;
            }
            fila += `</li><hr>`;
            contenidoModal += fila;
        }
        contenidoModal += `</ul>`;
    }
    contenidoModal += `</div>`;

    const modal = document.createElement('div');
    modal.id = 'modalPartidosGrupo';
    modal.style.position = 'fixed'; modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100%'; modal.style.height = '100%'; modal.style.background = 'rgba(0,0,0,0.7)'; modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center'; modal.style.zIndex = '1000';
    modal.innerHTML = contenidoModal;
    document.body.appendChild(modal);

    // Cerrar modal
    document.getElementById('cerrarModalPartidos').onclick = () => modal.remove();

    // Si es admin, asignar eventos a los botones de guardar resultado
    if (currentUserRol === 'admin') {
        document.querySelectorAll('.guardar-resultado-admin').forEach(btn => {
            btn.onclick = async (e) => {
                const partidoId = parseInt(btn.dataset.id);
                const localReal = parseInt(document.getElementById(`real_local_${partidoId}`).value);
                const visitReal = parseInt(document.getElementById(`real_visit_${partidoId}`).value);
                const penales = document.getElementById(`penales_real_${partidoId}`).checked;
                if (isNaN(localReal) || isNaN(visitReal)) { alert("Ingresa números"); return; }
                // Actualizar en Supabase
                const { error } = await _supabase.from('partidos').update({
                    goles_local_real: localReal,
                    goles_visitante_real: visitReal,
                    ganador_penaltis_real: penales,
                    estado: 'finalizado'
                }).eq('id', partidoId);
                if (error) alert(error.message);
                else {
                    alert("Resultado guardado. Actualizando tabla de grupos...");
                    // Recargar la pestaña grupos para actualizar estadísticas
                    await renderGrupos();
                    // Cerrar modal y reabrir para ver cambios
                    modal.remove();
                    mostrarPartidosPorGrupo();
                }
            };
        });
    }
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
