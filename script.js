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

function limpiarCacheNavegador() {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach(c => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
}

// ==================== VISTAS ====================
async function mostrarBienvenida() {
    // Obtener reglas desde Supabase (texto completo)
    let reglasTexto = "Cargando reglas...";
    const { data, error } = await _supabase.from('configuracion').select('valor').eq('clave', 'reglas_puntuacion').maybeSingle();
    if (!error && data) reglasTexto = data.valor;

    // Configura las rutas de tus imágenes (cámbialas según donde las guardes en GitHub)
    const fondoUrl = 'fondo_mundial.jpg';   // Cambia por tu imagen de fondo
    const logoUrl = 'logo_mundial_2026.png';     // Cambia por el logo del mundial

    document.getElementById('contenido').innerHTML = `
        <div class="welcome-container" style="background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${fondoUrl}');">
            <img src="${logoUrl}" alt="Logo Mundial" class="welcome-logo">
            <h1 class="welcome-title">🏆 Quiniela Mundial 2026</h1>
            <p class="welcome-title" style="font-size:1.2rem;">Pronostica y gana</p>
            <button id="btnContinuar" style="background:#f5c542; border:none; padding:12px 32px; border-radius:40px; font-weight:bold; margin-top:2rem;">Continuar →</button>
        </div>
        <button id="btnAbrirReglas" class="btn-reglas">📜 Reglas y puntuación</button>
    `;

    // Evento para el botón continuar (sigue igual)
    document.getElementById('btnContinuar').onclick = () => mostrarLogin();

    // Evento para abrir modal de reglas
    document.getElementById('btnAbrirReglas').onclick = () => mostrarReglas(reglasTexto);
}

// Nueva función para mostrar el modal de reglas
function mostrarReglas(reglasTexto) {
    const modalHtml = `
        <div class="modal-overlay" id="modalReglasOverlay">
            <div class="modal-content modal-reglas">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <h3><i class="fas fa-scroll"></i> Reglas y puntos</h3>
                    <button id="cerrarModalReglas" style="background:#c00; color:white; border:none; border-radius:50%; width:32px; height:32px; cursor:pointer;">✕</button>
                </div>
                <div style="white-space: pre-line; line-height:1.5;">
                    ${reglasTexto.replace(/\n/g, '<br>')}
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('cerrarModalReglas').onclick = () => {
        document.getElementById('modalReglasOverlay').remove();
    };
    // Cerrar al hacer clic fuera del contenido
    document.getElementById('modalReglasOverlay').onclick = (e) => {
        if (e.target === e.currentTarget) e.currentTarget.remove();
    };
}

function mostrarLogin() {
    document.getElementById('contenido').innerHTML = `
        <div class="container" style="max-width: 500px; margin: 40px auto;">
            <div class="card">
                <h2 style="text-align:center;">Acceso</h2>
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button id="btnLoginTab" class="tab-btn active">Iniciar sesión</button>
                    <button id="btnRegistroTab" class="tab-btn">Registrarse</button>
                </div>
                <div id="loginForm">
                    <input type="email" id="email" placeholder="Email" style="width:100%; margin:8px 0;">
                    <input type="password" id="password" placeholder="Contraseña" style="width:100%; margin:8px 0;">
                    <button id="loginBtn" style="background:#0a5c2e; color:white; padding:12px; width:100%; border:none; border-radius:40px;">Ingresar</button>
                    <div id="loginError" style="color:red; margin-top:8px;"></div>
                </div>
                <div id="registroForm" style="display:none;">
                    <input type="text" id="regNombre" placeholder="Nombre completo" style="width:100%; margin:8px 0;">
                    <input type="email" id="regEmail" placeholder="Email" style="width:100%; margin:8px 0;">
                    <input type="password" id="regPassword" placeholder="Contraseña" style="width:100%; margin:8px 0;">
                    <button id="registroBtn" style="background:#0a5c2e; color:white; padding:12px; width:100%; border:none; border-radius:40px;">Crear cuenta</button>
                    <div id="regError" style="color:red; margin-top:8px;"></div>
                </div>
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
        errorSpan.innerText = 'Iniciando...';
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
        const nuevo = { id: currentUser.id, nombre: currentUser.email, rol: 'usuario', puntos_totales: 0 };
        await _supabase.from('perfiles').insert([nuevo]);
        data = nuevo;
    }
    if (data) {
        currentUserRol = data.rol || 'usuario';
        currentUserPuntos = data.puntos_totales || 0;
    }
}

// ==================== DASHBOARD PRINCIPAL ====================
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
                    <button id="logoutBtn" style="background:#c00; color:white; border:none; padding:8px 16px; border-radius:30px;">Cerrar sesión</button>
                </div>
            </div>
            <div class="tabs">
                <button class="tab-btn active" data-tab="grupos"><i class="fas fa-users"></i> Grupos</button>
                <button class="tab-btn" data-tab="partidos"><i class="fas fa-calendar-alt"></i> Pronósticos</button>
                <button class="tab-btn" data-tab="goleador"><i class="fas fa-futbol"></i> Goleador</button>
                ${currentUserRol === 'admin' ? '<button class="tab-btn" data-tab="admin"><i class="fas fa-cogs"></i> Admin</button>' : ''}
            </div>
            <div class="tab-content">
                <div id="grupos" class="tab-pane active"></div>
                <div id="partidos" class="tab-pane"></div>
                <div id="goleador" class="tab-pane"></div>
                <div id="admin" class="tab-pane"></div>
            </div>
        </div>
    `;

    await renderGrupos();
    await renderPartidos();
    renderGoleador(yaVotoGoleador, nombreGoleador);
    if (currentUserRol === 'admin') renderAdmin();

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(btn.dataset.tab).classList.add('active');
            btn.classList.add('active');
        });
    });
    document.getElementById('btnRankingGlobal').onclick = mostrarRanking;
    document.getElementById('logoutBtn').onclick = async () => {
        await _supabase.auth.signOut();
        limpiarCacheNavegador();
        window.location.href = window.location.href.split('?')[0] + '?nocache=' + Date.now();
    };
}

// ==================== PESTAÑA GRUPOS (resultados reales) ====================
async function renderGrupos() {
    const container = document.getElementById('grupos');
    const grupos = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    // Partidos de grupos con resultado real
    const partidosConResultado = partidosCache.filter(p => p.fase === 'grupos' && p.goles_local_real !== null && p.goles_visitante_real !== null);

    let html = `<div style="display:flex; gap:10px; margin-bottom:15px;">
                    <button id="btnVerPartidosGrupo" class="btn-ranking" style="background:#0a5c2e; color:white;"><i class="fas fa-calendar-alt"></i> Ver partidos por grupo</button>
                    <button id="btnMejoresTerceros" class="btn-ranking" style="background:#0a5c2e; color:white;"><i class="fas fa-star"></i> Mejores 3ros</button>
                </div>`;
    html += '<div class="grupos-grid">';

    for (let g of grupos) {
        const equiposGrupo = equiposCache.filter(eq => eq.grupo === g);
        let stats = [];
        for (let eq of equiposGrupo) {
            const partidosLocal = partidosConResultado.filter(p => p.equipo_local_id === eq.id);
            const partidosVisit = partidosConResultado.filter(p => p.equipo_visitante_id === eq.id);
            let pj=0, pg=0, pe=0, pp=0, gf=0, gc=0;
            for (let p of partidosLocal) {
                pj++; gf += p.goles_local_real; gc += p.goles_visitante_real;
                if (p.goles_local_real > p.goles_visitante_real) pg++;
                else if (p.goles_local_real === p.goles_visitante_real) pe++;
                else pp++;
            }
            for (let p of partidosVisit) {
                pj++; gf += p.goles_visitante_real; gc += p.goles_local_real;
                if (p.goles_visitante_real > p.goles_local_real) pg++;
                else if (p.goles_visitante_real === p.goles_local_real) pe++;
                else pp++;
            }
            const puntos = pg*3 + pe;
            const dif = gf - gc;
            stats.push({ nombre: eq.nombre, pj, pg, pe, pp, gf, gc, dif, puntos });
        }
        stats.sort((a,b) => b.puntos - a.puntos || b.dif - a.dif || b.gf - a.gf);
        html += `<div class="card-grupo"><h3>Grupo ${g}</h3><table class="tabla-posiciones">
                    <thead><tr><th>Equipo</th><th>JJ</th><th>JG</th><th>JE</th><th>JP</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr></thead><tbody>`;
        stats.forEach(s => {
            html += `<tr><td>${s.nombre}</td><td>${s.pj}</td><td>${s.pg}</td><td>${s.pe}</td><td>${s.pp}</td><td>${s.gf}</td><td>${s.gc}</td><td>${s.dif}</td><td><b>${s.puntos}</b></td></tr>`;
        });
        html += `</tbody></table></div>`;
    }
    html += '</div>';
    container.innerHTML = html;

    document.getElementById('btnVerPartidosGrupo').onclick = () => mostrarPartidosPorGrupo();
    document.getElementById('btnMejoresTerceros').onclick = () => mostrarMejoresTerceros();
}

// Mostrar todos los partidos de grupos (72) con opción admin
async function mostrarPartidosPorGrupo() {
    const partidosGrupo = partidosCache.filter(p => p.fase === 'grupos');
    // Agrupar por grupo
    const grupos = [...new Set(partidosGrupo.map(p => {
        const local = equiposCache.find(e => e.id === p.equipo_local_id);
        return local ? local.grupo : null;
    }).filter(g => g))].sort();

    let contenido = `<div class="modal-content" style="max-width: 1000px; width: 90vw;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <h3><i class="fas fa-calendar-alt"></i> Partidos de Fase de Grupos</h3>
            <button id="cerrarModal" style="background:#c00; color:white; border:none; border-radius:50%; width:36px; height:36px; font-size:1.2rem; cursor:pointer;">✕</button>
        </div>
        <div id="modalPartidosContenido">
            <!-- Aquí se cargarán los partidos dinámicamente -->
        </div>
    </div>`;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = contenido;
    document.body.appendChild(modal);
    
    const modalContenido = document.getElementById('modalPartidosContenido');
    
    // Función para renderizar los partidos dentro del modal
    async function renderizarPartidosEnModal() {
        // Recargar datos frescos desde Supabase (para mostrar resultados actualizados)
        await cargarPartidos();
        const partidosActualizados = partidosCache.filter(p => p.fase === 'grupos');
        
        let html = '';
        for (let g of grupos) {
            const partidosG = partidosActualizados.filter(p => {
                const local = equiposCache.find(e => e.id === p.equipo_local_id);
                return local && local.grupo === g;
            }).sort((a,b) => a.numero - b.numero);
            
            html += `<div style="margin-bottom: 1.5rem;">
                <h4 style="background:#0a5c2e; color:white; padding:8px 12px; border-radius:20px; display:inline-block;">Grupo ${g}</h4>
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:12px; margin-top:10px;">`;
            
            for (let p of partidosG) {
                const localNom = getNombreEquipo(p.equipo_local_id);
                const visitNom = getNombreEquipo(p.equipo_visitante_id);
                const fecha = new Date(p.fecha_hora).toLocaleString();
                const resultado = (p.goles_local_real !== null && p.goles_visitante_real !== null) ? `${p.goles_local_real} - ${p.goles_visitante_real}` : 'Sin jugar';
                const numeroPartido = p.numero;
                
                let tarjeta = `<div style="background:#f8fafc; border-radius:16px; padding:12px; border-left:6px solid #f5c542;">
                    <div><strong>Partido #${numeroPartido}</strong> — ${localNom} vs ${visitNom}</div>
                    <div style="font-size:0.8rem; color:#555;">📅 ${fecha}</div>
                    <div style="font-size:1rem; margin-top:5px;">🏆 Resultado: <strong>${resultado}</strong></div>`;
                
                if (currentUserRol === 'admin') {
                    tarjeta += `<div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;">
                                <input type="number" id="real_local_${p.id}" placeholder="Local" style="width:70px;" value="${p.goles_local_real ?? ''}">
                                <span>-</span>
                                <input type="number" id="real_visit_${p.id}" placeholder="Visit" style="width:70px;" value="${p.goles_visitante_real ?? ''}">
                                <button class="guardar-resultado-admin" data-id="${p.id}" style="background:#f5c542; border:none; border-radius:30px; padding:6px 16px;">Guardar</button>
                                <span class="msg-guardado-${p.id}" style="font-size:0.7rem; margin-left:5px;"></span>
                              </div>`;
                }
                tarjeta += `</div>`;
                html += tarjeta;
            }
            html += `</div></div>`;
        }
        modalContenido.innerHTML = html;
        
        // Asignar eventos a los botones guardar
        if (currentUserRol === 'admin') {
            document.querySelectorAll('.guardar-resultado-admin').forEach(btn => {
                btn.onclick = async (e) => {
                    const pid = parseInt(btn.dataset.id);
                    const localReal = parseInt(document.getElementById(`real_local_${pid}`).value);
                    const visitReal = parseInt(document.getElementById(`real_visit_${pid}`).value);
                    if (isNaN(localReal) || isNaN(visitReal)) {
                        alert("Ingresa números válidos");
                        return;
                    }
                    // En fase de grupos no hay penales, así que no enviamos ese campo
                    const { error } = await _supabase.from('partidos').update({
                        goles_local_real: localReal,
                        goles_visitante_real: visitReal,
                        ganador_penaltis_real: null,  // no aplica en grupos
                        estado: 'finalizado'
                    }).eq('id', pid);
                    
                    const msgSpan = document.querySelector(`.msg-guardado-${pid}`);
                    if (error) {
                        msgSpan.innerText = '❌ Error';
                        msgSpan.style.color = 'red';
                        console.error(error);
                    } else {
                        msgSpan.innerText = '✅ Guardado';
                        msgSpan.style.color = 'green';
                        // Refrescar el modal y la tabla de grupos
                        await renderizarPartidosEnModal();
                        await renderGrupos();  // actualiza la tabla de posiciones en la pestaña Grupos
                        // Opcional: mostrar mensaje temporal
                        setTimeout(() => { msgSpan.innerText = ''; }, 2000);
                    }
                };
            });
        }
    }
    
    await renderizarPartidosEnModal();
    
    document.getElementById('cerrarModal').onclick = () => modal.remove();
}

// Mostrar mejores 8 terceros (basado en resultados reales)
async function mostrarMejoresTerceros() {
    const grupos = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    const partidosConResultado = partidosCache.filter(p => p.fase === 'grupos' && p.goles_local_real !== null && p.goles_visitante_real !== null);
    let terceros = [];
    for (let g of grupos) {
        const equiposGrupo = equiposCache.filter(eq => eq.grupo === g);
        let stats = [];
        for (let eq of equiposGrupo) {
            const partidosLocal = partidosConResultado.filter(p => p.equipo_local_id === eq.id);
            const partidosVisit = partidosConResultado.filter(p => p.equipo_visitante_id === eq.id);
            let pj=0, pg=0, pe=0, pp=0, gf=0, gc=0;
            for (let p of partidosLocal) {
                pj++; gf += p.goles_local_real; gc += p.goles_visitante_real;
                if (p.goles_local_real > p.goles_visitante_real) pg++;
                else if (p.goles_local_real === p.goles_visitante_real) pe++;
                else pp++;
            }
            for (let p of partidosVisit) {
                pj++; gf += p.goles_visitante_real; gc += p.goles_local_real;
                if (p.goles_visitante_real > p.goles_local_real) pg++;
                else if (p.goles_visitante_real === p.goles_local_real) pe++;
                else pp++;
            }
            const puntos = pg*3 + pe;
            const dif = gf - gc;
            stats.push({ nombre: eq.nombre, puntos, gf, gc, dif });
        }
        stats.sort((a,b) => b.puntos - a.puntos || b.dif - a.dif || b.gf - a.gf);
        if (stats[2]) terceros.push({ grupo: g, equipo: stats[2].nombre, puntos: stats[2].puntos, dif: stats[2].dif, gf: stats[2].gf });
    }
    terceros.sort((a,b) => b.puntos - a.puntos || b.dif - a.dif || b.gf - a.gf);
    const mejores8 = terceros.slice(0,8);
    let html = `<div class="modal-content" style="max-width:600px;">
        <div style="display:flex; justify-content:space-between;"><h3>🏆 Mejores 8 terceros (resultados reales)</h3><button id="cerrarModal3" style="background:#c00; color:white; border:none; border-radius:50%; width:30px;">X</button></div>
        <table class="tabla-posiciones">
            <thead><tr><th>Pos</th><th>Grupo</th><th>Equipo</th><th>Pts</th><th>DG</th><th>GF</th></tr></thead>
            <tbody>`;
    mejores8.forEach((t,idx) => {
        html += `<tr><td>${idx+1}</td><td>${t.grupo}</td><td>${t.equipo}</td><td>${t.puntos}</td><td>${t.dif}</td><td>${t.gf}</td></tr>`;
    });
    html += `</tbody></table></div>`;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = html;
    document.body.appendChild(modal);
    document.getElementById('cerrarModal3').onclick = () => modal.remove();
}

// ==================== RENDER PARTIDOS (pronósticos) ====================
async function renderPartidos() {
    const container = document.getElementById('partidos');
    let html = '<h3>Fase de Grupos</h3><div class="partidos-lista">';
    const partidosGrupo = partidosCache.filter(p => p.fase === 'grupos');
    for (let p of partidosGrupo) html += await generarCardPartido(p);
    html += '</div><h3>Eliminatorias</h3><div class="partidos-lista">';
    const partidosElim = partidosCache.filter(p => p.fase !== 'grupos');
    for (let p of partidosElim) html += await generarCardPartido(p);
    html += '</div>';
    container.innerHTML = html;
    document.querySelectorAll('.btn-guardar-prono').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const pid = parseInt(btn.dataset.partidoId);
            const gLocal = parseInt(document.getElementById(`gol_local_${pid}`).value);
            const gVisit = parseInt(document.getElementById(`gol_visit_${pid}`).value);
            const penaltis = document.getElementById(`penaltis_${pid}`).checked;
            if (isNaN(gLocal) || isNaN(gVisit)) { alert("Ingresa números"); return; }
            const partido = partidosCache.find(p => p.id === pid);
            const fechaPartido = new Date(partido.fecha_hora);
            const diffHoras = (fechaPartido - new Date()) / (1000*60*60);
            if (diffHoras < 24) { alert("No puedes cambiar el pronóstico faltando menos de 24 horas"); return; }
            await _supabase.from('pronosticos_partidos').upsert({
                usuario_id: currentUser.id,
                partido_id: pid,
                goles_local: gLocal,
                goles_visitante: gVisit,
                penaltis: penaltis,
                fecha_pronostico: new Date()
            }, { onConflict: 'usuario_id, partido_id' });
            alert("Pronóstico guardado");
        });
    });
}

async function generarCardPartido(partido) {
    const { data: prono } = await _supabase.from('pronosticos_partidos').select('*')
        .eq('usuario_id', currentUser.id).eq('partido_id', partido.id).maybeSingle();
    const gLocal = prono ? prono.goles_local : '';
    const gVisit = prono ? prono.goles_visitante : '';
    const penaltis = prono ? prono.penaltis : false;
    const resultadoReal = (partido.goles_local_real !== null && partido.goles_visitante_real !== null)
        ? `${partido.goles_local_real} - ${partido.goles_visitante_real}` : 'No jugado';
    return `
        <div class="partido-item">
            <div>
                <div class="fecha-partido">${new Date(partido.fecha_hora).toLocaleString()}</div>
                <div><strong>${getNombreEquipo(partido.equipo_local_id)} vs ${getNombreEquipo(partido.equipo_visitante_id)}</strong></div>
                <div>Real: ${resultadoReal}</div>
            </div>
            <div class="pronostico-inputs">
                <input type="number" id="gol_local_${partido.id}" value="${gLocal}" style="width:70px"> - <input type="number" id="gol_visit_${partido.id}" value="${gVisit}" style="width:70px">
                <label><input type="checkbox" id="penaltis_${partido.id}" ${penaltis ? 'checked' : ''}> Penales</label>
                <button class="btn-guardar btn-guardar-prono" data-partido-id="${partido.id}">Guardar</button>
            </div>
        </div>
    `;
}

// ==================== GOLEADOR ====================
function renderGoleador(yaVoto, nombreActual) {
    const container = document.getElementById('goleador');
    if (yaVoto) {
        container.innerHTML = `<div class="goleador-area"><i class="fas fa-trophy"></i> Tu goleador: <strong>${nombreActual}</strong>. No puedes modificarlo.</div>`;
    } else {
        container.innerHTML = `<div class="goleador-area"><input type="text" id="goleador-input" placeholder="Nombre del jugador"><button id="guardarGoleadorBtn" class="btn-guardar">Guardar (único)</button></div>`;
        document.getElementById('guardarGoleadorBtn').onclick = async () => {
            const jugador = document.getElementById('goleador-input').value.trim();
            if (!jugador) return alert("Escribe un nombre");
            const { error } = await _supabase.from('pronosticos_goleador').insert({ usuario_id: currentUser.id, jugador_nombre: jugador });
            if (error) alert(error.message);
            else { alert("Guardado"); mostrarDashboard(); }
        };
    }
}

// ==================== ADMIN (panel simple) ====================
function renderAdmin() {
    const container = document.getElementById('admin');
    container.innerHTML = `<p>Panel de administrador. Usa el botón "Ver partidos por grupo" en la pestaña Grupos para cargar resultados.</p>`;
}

// ==================== RANKING ====================
async function mostrarRanking() {
    const { data: perfiles } = await _supabase.from('perfiles').select('nombre, puntos_totales').order('puntos_totales', { ascending: false });
    let html = `<div class="modal-content"><h3>🏆 Ranking</h3><ul>`;
    perfiles.forEach((p,i) => { html += `<li>${i+1}. ${p.nombre} - ${p.puntos_totales} pts</li>`; });
    html += `</ul><button id="cerrarRanking">Cerrar</button></div>`;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = html;
    document.body.appendChild(modal);
    document.getElementById('cerrarRanking').onclick = () => modal.remove();
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
