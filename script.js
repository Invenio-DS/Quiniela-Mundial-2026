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

function getBanderaHtml(nombreEquipo) {
    const equipo = equiposCache.find(eq => eq.nombre === nombreEquipo);
    if (!equipo || !equipo.bandera_url) return '';
    return `<img src="${equipo.bandera_url}" class="flag-icon" alt="${nombreEquipo}" onerror="this.style.display='none'">`;
}

function getEquipoConBandera(nombre) {
    return `<span class="equipo-con-bandera">${getBanderaHtml(nombre)} ${nombre}</span>`;
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
    let reglasTexto = "Cargando reglas...";
    const { data, error } = await _supabase.from('configuracion').select('valor').eq('clave', 'reglas_puntuacion').maybeSingle();
    if (!error && data) reglasTexto = data.valor;

    const usarImagenes = false;
    const fondoUrl = usarImagenes ? 'assets/fondo-mundial.jpg' : '';
    const logoUrl = usarImagenes ? 'assets/logo-mundial.png' : '';
    const backgroundStyle = usarImagenes
        ? `background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${fondoUrl}'); background-size: cover; background-position: center;`
        : 'background: linear-gradient(135deg, #0b2b1f 0%, #1a4a2f 100%);';
    const logoHtml = usarImagenes
        ? `<img src="${logoUrl}" alt="Logo Mundial" class="welcome-logo">`
        : `<i class="fas fa-futbol" style="font-size: 4rem; color: #f5c542; margin-bottom: 1rem;"></i>`;

    document.getElementById('contenido').innerHTML = `
        <div class="welcome-container" style="${backgroundStyle}">
            ${logoHtml}
            <h1 class="welcome-title">🏆 Quiniela Mundial 2026</h1>
            <p class="welcome-title" style="font-size:1.2rem;">Pronostica y gana</p>
            <button id="btnContinuar" style="background:#f5c542; border:none; padding:12px 32px; border-radius:40px; font-weight:bold; margin-top:2rem;">Continuar →</button>
        </div>
        <button id="btnAbrirReglas" class="btn-reglas">📜 Reglas y puntuación</button>
    `;
    document.getElementById('btnContinuar').onclick = () => mostrarLogin();
    document.getElementById('btnAbrirReglas').onclick = () => mostrarReglas(reglasTexto);
}

function mostrarReglas(reglasTexto) {
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'modalReglasOverlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    `;
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 24px;
        max-width: 90vw;
        max-height: 85vh;
        width: 600px;
        overflow-y: auto;
        padding: 1.5rem;
        position: relative;
    `;
    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3><i class="fas fa-scroll"></i> Reglas y Puntuación</h3>
            <button id="cerrarModalReglasBtn" style="background: #c00; color: white; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-size: 1.2rem;">✕</button>
        </div>
        <div style="white-space: pre-line; line-height: 1.5;">
            ${reglasTexto.replace(/\n/g, '<br>')}
        </div>
    `;
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    const closeBtn = document.getElementById('cerrarModalReglasBtn');
    if (closeBtn) {
        closeBtn.onclick = () => modalOverlay.remove();
    } else {
        modalOverlay.onclick = (e) => { if (e.target === modalOverlay) modalOverlay.remove(); };
    }
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

// ==================== DASHBOARD ====================
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
                <button class="tab-btn" data-tab="eliminatorias"><i class="fas fa-diagram-project"></i> Eliminatorias</button>
                <button class="tab-btn" data-tab="admin" style="display:${currentUserRol === 'admin' ? 'inline-flex' : 'none'}"><i class="fas fa-cogs"></i> Admin</button>
            </div>
            <div class="tab-content">
                <div id="grupos" class="tab-pane active"></div>
                <div id="partidos" class="tab-pane"></div>
                <div id="eliminatorias" class="tab-pane"></div>
                <div id="admin" class="tab-pane"></div>
            </div>
        </div>
    `;

    await renderGrupos();
    await renderPartidos();
    await renderEliminatorias();
    if (currentUserRol === 'admin') renderAdmin();

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(btn.dataset.tab).classList.add('active');
            btn.classList.add('active');
            if (btn.dataset.tab === 'partidos') renderPartidos();
            if (btn.dataset.tab === 'eliminatorias') renderEliminatorias();
        });
    });
    document.getElementById('btnRankingGlobal').onclick = mostrarRanking;
    document.getElementById('logoutBtn').onclick = async () => {
        await _supabase.auth.signOut();
        limpiarCacheNavegador();
        window.location.href = window.location.href.split('?')[0] + '?nocache=' + Date.now();
    };
}

// ==================== PESTAÑA GRUPOS ====================
async function renderGrupos() {
    const container = document.getElementById('grupos');
    const grupos = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    const partidosConResultado = partidosCache.filter(p => p.fase === 'grupos' && p.goles_local_real !== null && p.goles_visitante_real !== null);

    let html = `<div style="display:flex; gap:10px; margin-bottom:15px;">
                    <button id="btnVerPartidosGrupo" class="btn-ranking" style="background:#0a5c2e; color:white;"><i class="fas fa-calendar-alt"></i> Ver partidos por grupo</button>
                    <button id="btnMejoresTerceros" class="btn-ranking" style="background:#0a5c2e; color:white;"><i class="fas fa-star"></i> Mejores 3ros</button>
                </div><div class="grupos-grid">`;

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
        html += `<div class="card-grupo"><h3>Grupo ${g}</h3><table class="tabla-posiciones"><thead><tr><th>Equipo</th><th>JJ</th><th>JG</th><th>JE</th><th>JP</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr></thead><tbody>`;
        stats.forEach((s, idx) => {
            let clase = 'fila-normal';
            if (idx === 0 || idx === 1) clase = 'fila-clasificado-directo';
            else if (idx === 2) clase = 'fila-opcion-tercero';
            html += `<tr class="${clase}">
                        <td>${getEquipoConBandera(s.nombre)}</td>
                        <td>${s.pj}</td><td>${s.pg}</td><td>${s.pe}</td><td>${s.pp}</td>
                        <td>${s.gf}</td><td>${s.gc}</td><td>${s.dif}</td>
                        <td><b>${s.puntos}</b></td>
                    </td>`;
        });
        html += `</tbody></table></div>`;
    }
    html += '</div>';
    container.innerHTML = html;

    document.getElementById('btnVerPartidosGrupo').onclick = () => mostrarPartidosPorGrupo();
    document.getElementById('btnMejoresTerceros').onclick = () => mostrarMejoresTerceros(true);
}

// MODAL DE PARTIDOS POR GRUPO (CORREGIDO: FILTRA POR GRUPO DE AMBOS EQUIPOS)
async function mostrarPartidosPorGrupo() {
    const partidosGrupo = partidosCache.filter(p => p.fase === 'grupos');
    const grupos = [...new Set(partidosGrupo.map(p => {
        const local = equiposCache.find(e => e.id === p.equipo_local_id);
        const visit = equiposCache.find(e => e.id === p.equipo_visitante_id);
        if (local && visit && local.grupo === visit.grupo) return local.grupo;
        return null;
    }).filter(g => g))].sort();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1000px; width: 90vw; display: flex; flex-direction: column; padding: 0;">
            <div style="position: sticky; top: 0; background: white; padding: 1rem; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between; align-items: center; z-index: 10; border-radius: 24px 24px 0 0;">
                <h3><i class="fas fa-calendar-alt"></i> Partidos de Fase de Grupos</h3>
                <button id="cerrarModal" style="background:#c00; color:white; border:none; border-radius:50%; width:36px; height:36px; cursor:pointer;">✕</button>
            </div>
            <div id="modalPartidosContenido" style="padding: 1rem; overflow-y: auto;"></div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('cerrarModal').onclick = () => modal.remove();

    const modalContenido = document.getElementById('modalPartidosContenido');

    async function renderizarPartidosEnModal() {
        await cargarPartidos();
        const partidosActualizados = partidosCache.filter(p => p.fase === 'grupos');
        let html = '';
        for (let g of grupos) {
            const partidosG = partidosActualizados.filter(p => {
                const local = equiposCache.find(e => e.id === p.equipo_local_id);
                const visit = equiposCache.find(e => e.id === p.equipo_visitante_id);
                return local && visit && local.grupo === g && visit.grupo === g;
            }).sort((a,b) => a.numero - b.numero);
            html += `<div style="margin-bottom: 1.5rem;">
                        <h4 style="background:#0a5c2e; color:white; padding:8px 12px; border-radius:20px; display:inline-block;">Grupo ${g}</h4>
                        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap:12px; margin-top:10px;">`;
            for (let p of partidosG) {
                const localNom = getNombreEquipo(p.equipo_local_id);
                const visitNom = getNombreEquipo(p.equipo_visitante_id);
                const localHtml = getEquipoConBandera(localNom);
                const visitHtml = getEquipoConBandera(visitNom);
                const fecha = new Date(p.fecha_hora).toLocaleString();
                const resultado = (p.goles_local_real !== null && p.goles_visitante_real !== null) ? `${p.goles_local_real} - ${p.goles_visitante_real}` : 'Sin jugar';
                let tarjeta = `<div style="background:#f8fafc; border-radius:16px; padding:12px; border-left:6px solid #f5c542;">
                            <div><strong>Partido #${p.numero}</strong> — 📅 ${fecha}</div>
                            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin:10px 0;">
                                <div class="equipo-local" style="min-width:140px;">${localHtml}</div>
                                <div class="marcador-inputs">
                                    <input type="number" id="real_local_${p.id}" placeholder="Local" style="width:70px;" value="${p.goles_local_real ?? ''}">
                                    <span>-</span>
                                    <input type="number" id="real_visit_${p.id}" placeholder="Visit" style="width:70px;" value="${p.goles_visitante_real ?? ''}">
                                </div>
                                <div class="equipo-visitante" style="min-width:140px;">${visitHtml}</div>
                            </div>`;
                if (currentUserRol === 'admin') {
                    tarjeta += `<div style="margin-top:5px;">
                                    <button class="guardar-resultado-admin" data-id="${p.id}" style="background:#f5c542; border:none; border-radius:30px; padding:6px 16px; margin-top:8px;">Guardar resultado</button>
                                    <span class="msg-guardado-${p.id}" style="font-size:0.7rem; margin-left:8px;"></span>
                                </div>`;
                }
                tarjeta += `<div style="margin-top:8px; font-size:0.8rem;">🏆 Resultado actual: <strong>${resultado}</strong></div>`;
                tarjeta += `</div>`;
                html += tarjeta;
            }
            html += `</div></div>`;
        }
        modalContenido.innerHTML = html;

        if (currentUserRol === 'admin') {
            document.querySelectorAll('.guardar-resultado-admin').forEach(btn => {
                btn.onclick = async (e) => {
                    const pid = parseInt(btn.dataset.id);
                    const localReal = parseInt(document.getElementById(`real_local_${pid}`).value);
                    const visitReal = parseInt(document.getElementById(`real_visit_${pid}`).value);
                    const msgSpan = document.querySelector(`.msg-guardado-${pid}`);
                    if (isNaN(localReal) || isNaN(visitReal)) {
                        alert("Ingresa números válidos");
                        return;
                    }
                    const { error } = await _supabase.from('partidos').update({
                        goles_local_real: localReal,
                        goles_visitante_real: visitReal,
                        estado: 'finalizado'
                    }).eq('id', pid);
                    if (error) {
                        msgSpan.innerText = '❌ Error';
                        msgSpan.style.color = 'red';
                    } else {
                        msgSpan.innerText = '✅ Guardado';
                        msgSpan.style.color = 'green';
                        await cargarPartidos();
                        await cargarPerfilUsuario();
                        await renderGrupos();
                        await renderizarPartidosEnModal();
                        const puntosSpan = document.querySelector('.user-info .fa-trophy')?.parentNode;
                        if (puntosSpan) puntosSpan.innerHTML = `<i class="fas fa-trophy"></i> Puntos: ${currentUserPuntos}`;
                        setTimeout(() => msgSpan.innerText = '', 2000);
                    }
                };
            });
        }
    }
    await renderizarPartidosEnModal();
}

async function mostrarMejoresTerceros(esReal = true) {
    let partidosBase;
    if (esReal) {
        partidosBase = partidosCache.filter(p => p.fase === 'grupos' && p.goles_local_real !== null && p.goles_visitante_real !== null);
    } else {
        partidosBase = [];
    }
    const grupos = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    let terceros = [];
    for (let g of grupos) {
        const equiposGrupo = equiposCache.filter(eq => eq.grupo === g);
        let stats = [];
        for (let eq of equiposGrupo) {
            const partidosLocal = partidosBase.filter(p => p.equipo_local_id === eq.id);
            const partidosVisit = partidosBase.filter(p => p.equipo_visitante_id === eq.id);
            let puntos=0, gf=0, gc=0;
            for (let p of partidosLocal) {
                gf += p.goles_local_real; gc += p.goles_visitante_real;
                if (p.goles_local_real > p.goles_visitante_real) puntos+=3;
                else if (p.goles_local_real === p.goles_visitante_real) puntos+=1;
            }
            for (let p of partidosVisit) {
                gf += p.goles_visitante_real; gc += p.goles_local_real;
                if (p.goles_visitante_real > p.goles_local_real) puntos+=3;
                else if (p.goles_visitante_real === p.goles_local_real) puntos+=1;
            }
            stats.push({ nombre: eq.nombre, puntos, gf, gc, dif: gf-gc });
        }
        stats.sort((a,b) => b.puntos - a.puntos || b.dif - a.dif || b.gf - a.gf);
        if (stats[2]) terceros.push({ grupo: g, equipo: stats[2].nombre, puntos: stats[2].puntos, dif: stats[2].dif, gf: stats[2].gf });
    }
    terceros.sort((a,b) => b.puntos - a.puntos || b.dif - a.dif || b.gf - a.gf);
    const todos = terceros;
    const modalHtml = `
        <div class="modal-overlay" id="modalTerceros">
            <div class="modal-content" style="max-width: 600px; padding:1rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                    <h3>🏆 Mejores 3ros (resultados reales)</h3>
                    <button id="cerrarModalTerceros" style="background:#c00; color:white; border:none; border-radius:50%; width:32px;">✕</button>
                </div>
                <table class="simulacion-tabla">
                    <thead><tr><th>Pos</th><th>Grupo</th><th>Equipo</th><th>Pts</th><th>DG</th><th>GF</th></td></thead>
                    <tbody>
                        ${todos.map((t,idx) => {
                            const clase = idx < 8 ? 'resaltado-tercero' : '';
                            return `<tr class="${clase}"><td>${idx+1}</td><td>${t.grupo}</td><td>${getEquipoConBandera(t.equipo)}</td><td>${t.puntos}</td><td>${t.dif}</td><td>${t.gf}</td></tr>`;
                        }).join('')}
                    </tbody>
                </table>
                <div style="margin-top:10px;"><small>Resaltados en amarillo: los 8 que avanzarían a 16vos.</small></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('cerrarModalTerceros').onclick = () => document.getElementById('modalTerceros').remove();
}

// ==================== PESTAÑA PRONÓSTICOS ====================
async function renderPartidos() {
    const container = document.getElementById('partidos');
    const gruposJornadas = [
        { fase: 'grupos', jornada: 1, titulo: '📅 Fase de Grupos - Jornada 1', numeros: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24] },
        { fase: 'grupos', jornada: 2, titulo: '📅 Fase de Grupos - Jornada 2', numeros: [25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48] },
        { fase: 'grupos', jornada: 3, titulo: '📅 Fase de Grupos - Jornada 3', numeros: [49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72] },
        { fase: '16vos', titulo: '🏆 16vos de Final' },
        { fase: '8vos', titulo: '🏆 8vos de Final' },
        { fase: '4tos', titulo: '🏆 4tos de Final' },
        { fase: 'semis', titulo: '🏆 Semifinales' },
        { fase: 'tercero', titulo: '🥉 Partido por el 3er lugar' },
        { fase: 'final', titulo: '🏆 Gran Final' }
    ];
    let html = `<div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
                    <button id="btnSimularGrupos" class="btn-ranking" style="background:#0a5c2e; color:white;"><i class="fas fa-chart-simple"></i> Ver simulación de grupos</button>
                    <button id="btnSimularTerceros" class="btn-ranking" style="background:#0a5c2e; color:white;"><i class="fas fa-star"></i> Mejores 3ros (pronóstico)</button>
                    <button id="btnAbrirGoleador" class="btn-ranking" style="background:#0a5c2e; color:white;"><i class="fas fa-futbol"></i> Elegir goleador</button>
                </div>`;
    for (let grupo of gruposJornadas) {
        let partidosFase;
        if (grupo.fase === 'grupos') {
            partidosFase = partidosCache.filter(p => p.fase === 'grupos' && grupo.numeros.includes(p.numero));
        } else {
            partidosFase = partidosCache.filter(p => p.fase === grupo.fase);
        }
        if (partidosFase.length === 0) continue;
        html += `<div style="margin-top: 1.5rem;">
                    <h3 style="background: #0a5c2e; color: white; padding: 8px 16px; border-radius: 30px; display: inline-block;">${grupo.titulo}</h3>
                    <div class="partidos-lista" style="margin-top: 12px;">`;
        for (let p of partidosFase) {
            html += await generarCardPartidoPronostico(p);
        }
        html += `</div></div>`;
    }
    container.innerHTML = html;

    document.querySelectorAll('.btn-guardar-prono').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const partidoId = parseInt(btn.dataset.partidoId);
            const gLocal = parseInt(document.getElementById(`gol_local_${partidoId}`).value);
            const gVisit = parseInt(document.getElementById(`gol_visit_${partidoId}`).value);
            const penaltis = document.getElementById(`penaltis_${partidoId}`)?.checked || false;
            if (isNaN(gLocal) || isNaN(gVisit)) { alert("Ingresa números de goles"); return; }
            const partido = partidosCache.find(p => p.id === partidoId);
            const diffHoras = (new Date(partido.fecha_hora) - new Date()) / (1000*60*60);
            if (diffHoras < 24) {
                alert("No puedes cambiar el pronóstico faltando menos de 24 horas para el partido.");
                return;
            }
            const { error } = await _supabase.from('pronosticos_partidos').upsert({
                usuario_id: currentUser.id,
                partido_id: partidoId,
                goles_local: gLocal,
                goles_visitante: gVisit,
                penaltis: penaltis,
                fecha_pronostico: new Date()
            }, { onConflict: 'usuario_id, partido_id' });
            if (error) alert("Error al guardar: " + error.message);
            else {
                alert("Pronóstico guardado");
                await renderPartidos();
            }
        });
    });

    document.getElementById('btnSimularGrupos').onclick = () => mostrarSimulacionGrupos();
    document.getElementById('btnSimularTerceros').onclick = () => mostrarSimulacionTerceros();
    document.getElementById('btnAbrirGoleador').onclick = () => mostrarModalGoleador();
}

async function generarCardPartidoPronostico(partido) {
    const { data: prono } = await _supabase.from('pronosticos_partidos').select('*')
        .eq('usuario_id', currentUser.id).eq('partido_id', partido.id).maybeSingle();
    const gLocal = prono ? prono.goles_local : '';
    const gVisit = prono ? prono.goles_visitante : '';
    const penaltis = prono ? prono.penaltis : false;
    const resultadoReal = (partido.goles_local_real !== null && partido.goles_visitante_real !== null)
        ? `${partido.goles_local_real} - ${partido.goles_visitante_real}` : 'No jugado';
    const localNom = getNombreEquipo(partido.equipo_local_id);
    const visitNom = getNombreEquipo(partido.equipo_visitante_id);
    const localHtml = getEquipoConBandera(localNom);
    const visitHtml = getEquipoConBandera(visitNom);
    const fecha = new Date(partido.fecha_hora).toLocaleString();
    const ahora = new Date();
    const fechaPartido = new Date(partido.fecha_hora);
    const diffHoras = (fechaPartido - ahora) / (1000*60*60);
    const puedeEditar = diffHoras > 24;
    const deshabilitado = !puedeEditar || (partido.estado === 'finalizado');
    const mostrarPenales = (partido.fase !== 'grupos');
    const estadoTexto = partido.estado === 'finalizado' ? 'Terminado' : (fechaPartido < ahora ? 'En curso / Finalizado' : 'Sin jugar');
    const estadoClase = partido.estado === 'finalizado' ? 'estado-terminado' : 'estado-sin-jugar';

    return `
        <div class="partido-card">
            <div class="partido-header">
                Partido #${partido.numero} — ${fecha}
            </div>
            <div class="partido-cuerpo">
                <div class="equipo-local">${localHtml}</div>
                <div class="marcador-inputs">
                    <input type="number" id="gol_local_${partido.id}" value="${gLocal}" placeholder="0" style="width:70px;" ${deshabilitado ? 'disabled' : ''}>
                    <span>-</span>
                    <input type="number" id="gol_visit_${partido.id}" value="${gVisit}" placeholder="0" style="width:70px;" ${deshabilitado ? 'disabled' : ''}>
                </div>
                <div class="equipo-visitante">${visitHtml}</div>
                ${!deshabilitado ? `<button class="btn-guardar btn-guardar-prono" data-partido-id="${partido.id}" style="margin-left:10px;">Guardar</button>` : '<button disabled style="opacity:0.5; margin-left:10px;">Guardado</button>'}
            </div>
            <div class="resultado-info">
                <div>🏆 Resultado final: <strong>${resultadoReal}</strong></div>
                <div>📌 Estado: <span class="${estadoClase}">${estadoTexto}</span></div>
                ${mostrarPenales && !deshabilitado ? `<label style="display:flex; align-items:center; gap:5px;"><input type="checkbox" id="penaltis_${partido.id}" ${penaltis ? 'checked' : ''}> ¿Penales?</label>` : ''}
            </div>
        </div>
    `;
}

// SIMULACIÓN DE GRUPOS (CORREGIDO: solo partidos dentro del mismo grupo)
async function mostrarSimulacionGrupos() {
    const { data: pronosticos, error } = await _supabase.from('pronosticos_partidos')
        .select('*, partidos:partido_id(fase, equipo_local_id, equipo_visitante_id)')
        .eq('usuario_id', currentUser.id);
    if (error) {
        alert("Error al cargar pronósticos");
        return;
    }
    const pronosGrupos = pronosticos.filter(p => p.partidos?.fase === 'grupos');
    if (pronosGrupos.length === 0) {
        alert("No has realizado pronósticos para la fase de grupos.");
        return;
    }
    const grupos = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    let html = `<div class="simulacion-container"><h3>📊 Simulación de grupos según tus pronósticos</h3>
                <p>Los equipos en <span style="background:#d4edda; padding:2px 4px;">verde</span> clasifican directamente a 16vos. Los 8 mejores terceros aparecen en <span style="background:#fff3cd;">amarillo</span>.</p>`;
    let todosTerceros = [];
    for (let g of grupos) {
        const equiposGrupo = equiposCache.filter(eq => eq.grupo === g);
        const idsEquipos = equiposGrupo.map(eq => eq.id);
        // Solo partidos donde ambos equipos pertenezcan a este grupo
        const partidosGrupo = partidosCache.filter(p => p.fase === 'grupos' && idsEquipos.includes(p.equipo_local_id) && idsEquipos.includes(p.equipo_visitante_id));
        let tabla = equiposGrupo.map(eq => ({ nombre: eq.nombre, puntos: 0, gf: 0, gc: 0, pj: 0 }));
        for (let partido of partidosGrupo) {
            const prono = pronosGrupos.find(pr => pr.partido_id === partido.id);
            if (!prono) continue;
            const local = tabla.find(t => t.nombre === getNombreEquipo(partido.equipo_local_id));
            const visit = tabla.find(t => t.nombre === getNombreEquipo(partido.equipo_visitante_id));
            if (prono.goles_local > prono.goles_visitante) local.puntos += 3;
            else if (prono.goles_local < prono.goles_visitante) visit.puntos += 3;
            else { local.puntos += 1; visit.puntos += 1; }
            local.gf += prono.goles_local; local.gc += prono.goles_visitante;
            visit.gf += prono.goles_visitante; visit.gc += prono.goles_local;
            local.pj++; visit.pj++;
        }
        tabla.sort((a,b) => b.puntos - a.puntos || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf);
        if (tabla.length >= 3) {
            todosTerceros.push({ grupo: g, equipo: tabla[2].nombre, puntos: tabla[2].puntos, dif: tabla[2].gf - tabla[2].gc, gf: tabla[2].gf });
        }
        let tablaHtml = `<table class="simulacion-tabla"><thead><tr><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr></thead><tbody>`;
        tabla.forEach((eq, idx) => {
            let clase = '';
            if (idx === 0 || idx === 1) clase = 'fila-clasificado-directo';
            else if (idx === 2) clase = 'fila-opcion-tercero';
            tablaHtml += `<tr class="${clase}">
                <td>${getEquipoConBandera(eq.nombre)}</td>
                <td>${eq.pj}</td>
                <td>${Math.floor(eq.puntos/3)}</td><td>${eq.puntos%3===1?1:0}</td><td>${eq.pj - Math.floor(eq.puntos/3) - (eq.puntos%3===1?1:0)}</td>
                <td>${eq.gf}</td><td>${eq.gc}</td><td>${eq.gf - eq.gc}</td>
                <td><b>${eq.puntos}</b></td>
            </tr>`;
        });
        tablaHtml += `</tbody></table>`;
        html += `<div class="simulacion-grupo"><h4>Grupo ${g}</h4>${tablaHtml}</div>`;
    }
    todosTerceros.sort((a,b) => b.puntos - a.puntos || b.dif - a.dif || b.gf - a.gf);
    const mejores8 = todosTerceros.slice(0,8);
    html += `<div class="lista-terceros"><h4>🏆 Los 8 mejores terceros (según tus pronósticos)</h4><ul>`;
    todosTerceros.forEach((t, idx) => {
        const clase = idx < 8 ? 'resaltado-tercero' : '';
        html += `<li class="${clase}"><strong>Grupo ${t.grupo}:</strong> ${getEquipoConBandera(t.equipo)} - ${t.puntos} pts, DG: ${t.dif}</li>`;
    });
    html += `</ul></div>`;
    // Clasificados
    html += `<div class="lista-terceros"><h4>✅ Equipos que avanzarían a 16vos de final</h4><ul>`;
    for (let g of grupos) {
        const equiposGrupo = equiposCache.filter(eq => eq.grupo === g);
        const idsEquipos = equiposGrupo.map(eq => eq.id);
        const partidosGrupo = partidosCache.filter(p => p.fase === 'grupos' && idsEquipos.includes(p.equipo_local_id) && idsEquipos.includes(p.equipo_visitante_id));
        let tabla = equiposGrupo.map(eq => ({ nombre: eq.nombre, puntos: 0, gf:0, gc:0 }));
        for (let partido of partidosGrupo) {
            const prono = pronosGrupos.find(pr => pr.partido_id === partido.id);
            if (!prono) continue;
            const local = tabla.find(t => t.nombre === getNombreEquipo(partido.equipo_local_id));
            const visit = tabla.find(t => t.nombre === getNombreEquipo(partido.equipo_visitante_id));
            if (prono.goles_local > prono.goles_visitante) local.puntos += 3;
            else if (prono.goles_local < prono.goles_visitante) visit.puntos += 3;
            else { local.puntos += 1; visit.puntos += 1; }
            local.gf += prono.goles_local; local.gc += prono.goles_visitante;
            visit.gf += prono.goles_visitante; visit.gc += prono.goles_local;
        }
        tabla.sort((a,b) => b.puntos - a.puntos || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf);
        const primeros = tabla.slice(0,2);
        primeros.forEach(eq => {
            html += `<li>Grupo ${g}: ${getEquipoConBandera(eq.nombre)} (${eq.puntos} pts)</li>`;
        });
    }
    mejores8.forEach(t => {
        html += `<li>Mejor tercero Grupo ${t.grupo}: ${getEquipoConBandera(t.equipo)} (${t.puntos} pts)</li>`;
    });
    html += `</ul></div>`;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-content" style="max-width: 90vw; max-height: 85vh; overflow-y: auto;">${html}<button id="cerrarSimulacion" style="margin-top:20px; background:#0a5c2e; color:white; border:none; padding:8px 16px; border-radius:30px;">Cerrar</button></div>`;
    document.body.appendChild(modal);
    document.getElementById('cerrarSimulacion').onclick = () => modal.remove();
}

async function mostrarSimulacionTerceros() {
    const { data: pronosticos } = await _supabase.from('pronosticos_partidos')
        .select('*, partidos:partido_id(fase, equipo_local_id, equipo_visitante_id)')
        .eq('usuario_id', currentUser.id);
    const pronosGrupos = pronosticos.filter(p => p.partidos?.fase === 'grupos');
    if (pronosGrupos.length === 0) {
        alert("No hay pronósticos para fase de grupos.");
        return;
    }
    const grupos = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    let terceros = [];
    for (let g of grupos) {
        const equiposGrupo = equiposCache.filter(eq => eq.grupo === g);
        const idsEquipos = equiposGrupo.map(eq => eq.id);
        const partidosGrupo = partidosCache.filter(p => p.fase === 'grupos' && idsEquipos.includes(p.equipo_local_id) && idsEquipos.includes(p.equipo_visitante_id));
        let stats = [];
        for (let eq of equiposGrupo) {
            let puntos=0, gf=0, gc=0;
            for (let partido of partidosGrupo) {
                const prono = pronosGrupos.find(pr => pr.partido_id === partido.id);
                if (!prono) continue;
                if (partido.equipo_local_id === eq.id) {
                    gf += prono.goles_local; gc += prono.goles_visitante;
                    if (prono.goles_local > prono.goles_visitante) puntos+=3;
                    else if (prono.goles_local === prono.goles_visitante) puntos+=1;
                } else if (partido.equipo_visitante_id === eq.id) {
                    gf += prono.goles_visitante; gc += prono.goles_local;
                    if (prono.goles_visitante > prono.goles_local) puntos+=3;
                    else if (prono.goles_visitante === prono.goles_local) puntos+=1;
                }
            }
            stats.push({ nombre: eq.nombre, puntos, gf, gc, dif: gf-gc });
        }
        stats.sort((a,b) => b.puntos - a.puntos || b.dif - a.dif || b.gf - a.gf);
        if (stats[2]) terceros.push({ grupo: g, equipo: stats[2].nombre, puntos: stats[2].puntos, dif: stats[2].dif, gf: stats[2].gf });
    }
    terceros.sort((a,b) => b.puntos - a.puntos || b.dif - a.dif || b.gf - a.gf);
    const todos = terceros;
    const modalHtml = `
        <div class="modal-overlay" id="modalSimulacionTerceros">
            <div class="modal-content" style="max-width: 600px; padding:1rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                    <h3>🏆 Mejores 3ros (según tus pronósticos)</h3>
                    <button id="cerrarSimulacionTerceros" style="background:#c00; color:white; border:none; border-radius:50%; width:32px;">✕</button>
                </div>
                <table class="simulacion-tabla">
                    <thead><tr><th>Pos</th><th>Grupo</th><th>Equipo</th><th>Pts</th><th>DG</th><th>GF</th></tr></thead>
                    <tbody>
                        ${todos.map((t,idx) => `<tr class="${idx<8?'resaltado-tercero':''}"><td>${idx+1}</td><td>${t.grupo}</td><td>${getEquipoConBandera(t.equipo)}</td><td>${t.puntos}</td><td>${t.dif}</td><td>${t.gf}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('cerrarSimulacionTerceros').onclick = () => document.getElementById('modalSimulacionTerceros').remove();
}

function mostrarModalGoleador() {
    _supabase.from('pronosticos_goleador').select('jugador_nombre').eq('usuario_id', currentUser.id).maybeSingle()
        .then(({ data }) => {
            if (data) {
                alert(`Ya elegiste a ${data.jugador_nombre} como goleador. No puedes cambiarlo.`);
                return;
            }
            const nombre = prompt("Ingresa el nombre del jugador que crees será el máximo goleador del torneo:", "Kylian Mbappé");
            if (nombre && nombre.trim()) {
                _supabase.from('pronosticos_goleador').insert({ usuario_id: currentUser.id, jugador_nombre: nombre.trim() })
                    .then(({ error }) => {
                        if (error) alert("Error: " + error.message);
                        else alert("Pronóstico de goleador guardado. No podrás modificarlo.");
                    });
            }
        });
}

// ==================== PESTAÑA ELIMINATORIAS (BRACKET) ====================
async function renderEliminatorias() {
    const container = document.getElementById('eliminatorias');
    container.innerHTML = `
        <div style="margin-bottom:20px;">
            <button id="btnBracketReal" class="btn-ranking">Resultados reales</button>
            <button id="btnBracketPronostico" class="btn-ranking">Mi pronóstico</button>
        </div>
        <div id="bracketContent"></div>
    `;
    const bracketDiv = document.getElementById('bracketContent');
    
    async function cargarBracket(esReal) {
        let partidosElim = partidosCache.filter(p => p.fase !== 'grupos');
        if (!esReal) {
            const { data: pronosticos } = await _supabase.from('pronosticos_partidos')
                .select('*').eq('usuario_id', currentUser.id);
            const pronoMap = new Map();
            pronosticos.forEach(p => pronoMap.set(p.partido_id, p));
            partidosElim = partidosElim.map(p => {
                const prono = pronoMap.get(p.id);
                if (prono) {
                    return {
                        ...p,
                        goles_local_real: prono.goles_local,
                        goles_visitante_real: prono.goles_visitante,
                        ganador_penaltis_real: prono.penaltis ? true : null,
                        estado: 'finalizado'
                    };
                }
                return p;
            });
        }
        const fasesOrden = ['16vos', '8vos', '4tos', 'semis', 'tercero', 'final'];
        let html = `<div class="bracket-container"><div class="bracket">`;
        for (let fase of fasesOrden) {
            const partidosFase = partidosElim.filter(p => p.fase === fase).sort((a,b) => a.numero - b.numero);
            if (partidosFase.length === 0) continue;
            html += `<div class="bracket-round"><h4 style="text-align:center;">${fase.toUpperCase()}</h4>`;
            partidosFase.forEach(p => {
                const local = p.equipo_local_id ? getNombreEquipo(p.equipo_local_id) : '?';
                const visit = p.equipo_visitante_id ? getNombreEquipo(p.equipo_visitante_id) : '?';
                const resultado = (p.goles_local_real !== null && p.goles_visitante_real !== null) ? `${p.goles_local_real} - ${p.goles_visitante_real}` : 'Sin jugar';
                const fecha = new Date(p.fecha_hora).toLocaleString();
                html += `<div class="bracket-match">
                            <div class="equipos">
                                <span>${getEquipoConBandera(local)}</span>
                                <span>vs</span>
                                <span>${getEquipoConBandera(visit)}</span>
                            </div>
                            <div class="resultado">${resultado}</div>
                            <div class="fecha">${fecha}</div>
                        </div>`;
            });
            html += `</div>`;
        }
        html += `</div></div>`;
        bracketDiv.innerHTML = html;
    }
    
    document.getElementById('btnBracketReal').onclick = () => cargarBracket(true);
    document.getElementById('btnBracketPronostico').onclick = () => cargarBracket(false);
    cargarBracket(true);
}

// ==================== ADMIN ====================
function renderAdmin() {
    const container = document.getElementById('admin');
    container.innerHTML = `
        <div style="background:#f8fafc; padding:20px; border-radius:24px;">
            <h3><i class="fas fa-cogs"></i> Configuración del sistema</h3>
            <hr style="margin:10px 0;">
            <h4>📜 Reglas y puntuación</h4>
            <textarea id="reglasTexto" rows="15" style="width:100%; font-family:monospace; padding:8px;"></textarea>
            <br>
            <button id="btnGuardarReglas" class="btn-guardar" style="margin-top:10px;">Guardar cambios</button>
            <div id="msgReglas" style="margin-top:10px;"></div>
        </div>
    `;
    _supabase.from('configuracion').select('valor').eq('clave', 'reglas_puntuacion').single()
        .then(({ data }) => {
            if (data) document.getElementById('reglasTexto').value = data.valor;
        });
    document.getElementById('btnGuardarReglas').onclick = async () => {
        const nuevoTexto = document.getElementById('reglasTexto').value;
        const { error } = await _supabase.from('configuracion').update({ valor: nuevoTexto }).eq('clave', 'reglas_puntuacion');
        const msgDiv = document.getElementById('msgReglas');
        if (error) msgDiv.innerHTML = '<span style="color:red;">❌ Error al guardar.</span>';
        else {
            msgDiv.innerHTML = '<span style="color:green;">✅ Reglas actualizadas correctamente.</span>';
            setTimeout(() => msgDiv.innerHTML = '', 3000);
        }
    };
}

// ==================== RANKING ====================
async function mostrarRanking() {
    const { data: perfiles } = await _supabase.from('perfiles').select('nombre, puntos_totales').order('puntos_totales', { ascending: false });
    let html = `<div class="modal-content" style="padding:1rem;"><h3>🏆 Ranking de usuarios</h3><ul>`;
    perfiles.forEach((p,i) => { html += `<li>${i+1}. ${p.nombre} - ${p.puntos_totales} pts</li>`; });
    html += `</ul><button id="cerrarRanking" style="background:#0a5c2e; color:white; border:none; padding:8px 16px; border-radius:30px;">Cerrar</button></div>`;
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
