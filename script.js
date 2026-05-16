// ==================== CONFIGURACIÓN SUPABASE ====================
const SUPABASE_URL = 'https://tylnpyuerchhkrinpixn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5bG5weXVlcmNoaGtyaW5waXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDAzNDQsImV4cCI6MjA5NDUxNjM0NH0.ZnCQmrFNXrJuiqxQEQSTxtPSzRKBSjtzVoTIbB0evao';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globales
let currentUser = null;
let currentUserRol = 'usuario';
let currentUserPuntos = 0;
let partidosCache = [];
let equiposCache = [];

// Elemento donde se renderiza todo
const app = document.getElementById('contenido');

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

// ==================== VISTA DE BIENVENIDA ====================
async function mostrarBienvenida() {
    let reglasTexto = "Cargando reglas...";
    const { data, error } = await _supabase.from('configuracion').select('valor').eq('clave', 'reglas_puntuacion').maybeSingle();
    if (!error && data) reglasTexto = data.valor;

    app.innerHTML = `
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

// ==================== LOGIN / REGISTRO ====================
function mostrarLogin() {
    app.innerHTML = `
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
            if (error) {
                errorSpan.innerText = error.message;
                return;
            }
            currentUser = data.user;
            await cargarPerfilUsuario();
            await cargarEquipos();
            await cargarPartidos();
            renderizar();
        } catch (err) {
            errorSpan.innerText = err.message;
        }
    };

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
            // Insertar en tabla perfiles
            const { error: perfilError } = await _supabase.from('perfiles').insert([{ id: data.user.id, nombre: nombre, rol: 'usuario', puntos_totales: 0 }]);
            if (perfilError) console.error(perfilError);
            alert("Registro exitoso, ahora inicia sesión");
            mostrarLogin();
        } catch (err) {
            errorSpan.innerText = err.message;
        }
    };
}

// Cargar perfil del usuario (crea uno si no existe)
async function cargarPerfilUsuario() {
    // Intentar obtener el perfil
    let { data, error } = await _supabase.from('perfiles').select('*').eq('id', currentUser.id).maybeSingle();
    if (error) {
        console.error("Error al cargar perfil:", error);
        // Si hay error, intentar crear perfil automáticamente
        const nuevoPerfil = { id: currentUser.id, nombre: currentUser.email, rol: 'usuario', puntos_totales: 0 };
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

// Renderizado principal
async function renderizar() {
    if (!currentUser) {
        await mostrarBienvenida();
    } else {
        await mostrarDashboard();
    }
}

// ==================== DASHBOARD PRINCIPAL ====================
async function mostrarDashboard() {
    // Asegurar datos cargados
    if (equiposCache.length === 0) await cargarEquipos();
    if (partidosCache.length === 0) await cargarPartidos();

    // Verificar si ya tiene pronóstico de goleador
    const { data: goleadorExistente } = await _supabase.from('pronosticos_goleador').select('jugador_nombre').eq('usuario_id', currentUser.id).maybeSingle();
    const yaVotoGoleador = !!goleadorExistente;
    const nombreGoleador = goleadorExistente?.jugador_nombre || '';

    const html = `
        <div class="container">
            <div class="header">
                <div class="logo"><h1>⚽ Mundial 2026 <span>Quiniela</span></h1></div>
                <div class="user-info">
                    <i class="fas fa-user"></i> ${currentUser.email} 
                    <i class="fas fa-trophy"></i> Puntos: ${currentUserPuntos}
                    <button id="btnRankingGlobal" class="btn-ranking"><i class="fas fa-chart-line"></i> Ranking</button>
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
    app.innerHTML = html;

    // Cargar contenido de cada pestaña
    await renderGrupos();
    await renderPartidos();
    await renderMejoresTerceros();
    renderGoleador(yaVotoGoleador, nombreGoleador);
    if (currentUserRol === 'admin') renderAdmin();

    // Eventos de pestañas
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
}

// ==================== RENDER GRUPOS ====================
async function renderGrupos() {
    const container = document.getElementById('grupos');
    const grupos = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    let html = '<div class="grupos-grid">';
    for (let g of grupos) {
        const equiposGrupo = equiposCache.filter(eq => eq.grupo === g);
        html += `
            <div class="card-grupo">
                <h3>Grupo ${g}</h3>
                <table class="tabla-posiciones">
                    <tr><th>Equipo</th><th>Confederación</th></tr>
                    ${equiposGrupo.map(eq => `<tr><td>${eq.nombre}</td><td>${eq.confederacion}</td></tr>`).join('')}
                </table>
                <small>Posiciones según tus pronósticos (simulación automática)</small>
                <div id="simulacion-${g}">Calculando...</div>
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
    for (let g of grupos) {
        const divSim = document.getElementById(`simulacion-${g}`);
        const posiciones = await simularPosicionesGrupo(g, currentUser.id);
        if (posiciones.length) {
            divSim.innerHTML = `<ol>${posiciones.map(p => `<li>${p.nombre} (${p.puntos} pts)</li>`).join('')}</ol>`;
        } else {
            divSim.innerHTML = 'Pronostica los partidos de este grupo para ver la simulación.';
        }
    }
}

async function simularPosicionesGrupo(grupoLetra, usuarioId) {
    const equiposGrupo = equiposCache.filter(eq => eq.grupo === grupoLetra);
    const idsEquipos = equiposGrupo.map(e => e.id);
    const partidosGrupo = partidosCache.filter(p => p.fase === 'grupos' && idsEquipos.includes(p.equipo_local_id) && idsEquipos.includes(p.equipo_visitante_id));
    const { data: pronos } = await _supabase.from('pronosticos_partidos').select('*')
        .eq('usuario_id', usuarioId)
        .in('partido_id', partidosGrupo.map(p => p.id));
    if (!pronos || pronos.length === 0) return [];

    let tabla = equiposGrupo.map(eq => ({ id: eq.id, nombre: eq.nombre, puntos: 0, gf: 0, gc: 0 }));
    for (let partido of partidosGrupo) {
        const prono = pronos.find(pr => pr.partido_id === partido.id);
        if (!prono) continue;
        const gLocal = prono.goles_local;
        const gVisit = prono.goles_visitante;
        const local = tabla.find(t => t.id === partido.equipo_local_id);
        const visit = tabla.find(t => t.id === partido.equipo_visitante_id);
        if (gLocal > gVisit) local.puntos += 3;
        else if (gLocal < gVisit) visit.puntos += 3;
        else { local.puntos += 1; visit.puntos += 1; }
        local.gf += gLocal; local.gc += gVisit;
        visit.gf += gVisit; visit.gc += gLocal;
    }
    tabla.sort((a,b) => {
        if (a.puntos !== b.puntos) return b.puntos - a.puntos;
        const difA = a.gf - a.gc;
        const difB = b.gf - b.gc;
        if (difA !== difB) return difB - difA;
        return b.gf - a.gf;
    });
    return tabla;
}

// ==================== RENDER PARTIDOS ====================
async function renderPartidos() {
    const container = document.getElementById('partidos');
    const partidosGrupo = partidosCache.filter(p => p.fase === 'grupos');
    const partidosElim = partidosCache.filter(p => p.fase !== 'grupos');
    let html = `<h3>Fase de Grupos</h3><div class="partidos-lista">`;
    for (let p of partidosGrupo) {
        html += await generarCardPartido(p);
    }
    html += `</div><h3>Eliminatorias</h3><div class="partidos-lista">`;
    for (let p of partidosElim) {
        html += await generarCardPartido(p);
    }
    html += `</div>`;
    container.innerHTML = html;

    document.querySelectorAll('.btn-guardar-prono').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const partidoId = parseInt(btn.dataset.partidoId);
            const localInput = document.getElementById(`gol_local_${partidoId}`);
            const visitInput = document.getElementById(`gol_visit_${partidoId}`);
            const penaltisCheck = document.getElementById(`penaltis_${partidoId}`);
            const gLocal = parseInt(localInput.value);
            const gVisit = parseInt(visitInput.value);
            const penaltis = penaltisCheck ? penaltisCheck.checked : false;
            if (isNaN(gLocal) || isNaN(gVisit)) { alert("Ingresa números de goles"); return; }
            const partido = partidosCache.find(p => p.id === partidoId);
            const fechaPartido = new Date(partido.fecha_hora);
            const ahora = new Date();
            const diffHoras = (fechaPartido - ahora) / (1000*60*60);
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
            else alert("Pronóstico guardado");
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
    const puntosObtenidos = prono ? prono.puntos_obtenidos : 0;
    return `
        <div class="partido-item">
            <div class="info-partido">
                <div class="fecha-partido">${new Date(partido.fecha_hora).toLocaleDateString()}</div>
                <div class="equipos">${getNombreEquipo(partido.equipo_local_id)} vs ${getNombreEquipo(partido.equipo_visitante_id)}</div>
                <div class="resultado-real"><i class="fas fa-flag-checkered"></i> Real: ${resultadoReal}</div>
                <div>Puntos obtenidos: ${puntosObtenidos}</div>
            </div>
            <div class="pronostico-inputs">
                <input type="number" id="gol_local_${partido.id}" placeholder="Local" value="${gLocal}" style="width:70px">
                <span>-</span>
                <input type="number" id="gol_visit_${partido.id}" placeholder="Visit" value="${gVisit}" style="width:70px">
                <label><input type="checkbox" id="penaltis_${partido.id}" ${penaltis ? 'checked' : ''}> ¿Penales?</label>
                <button class="btn-guardar btn-guardar-prono" data-partido-id="${partido.id}">Guardar</button>
            </div>
        </div>
    `;
}

// ==================== MEJORES 3ROS ====================
async function renderMejoresTerceros() {
    const container = document.getElementById('terceros');
    container.innerHTML = '<p>Calculando mejores terceros según tus pronósticos...</p><div id="lista-terceros"></div>';
    const grupos = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    let terceros = [];
    for (let g of grupos) {
        const tabla = await simularPosicionesGrupo(g, currentUser.id);
        if (tabla && tabla.length >= 3) {
            terceros.push({ grupo: g, equipo: tabla[2], puntos: tabla[2].puntos, difGol: (tabla[2].gf - tabla[2].gc) });
        }
    }
    terceros.sort((a,b) => {
        if (a.puntos !== b.puntos) return b.puntos - a.puntos;
        return b.difGol - a.difGol;
    });
    const mejores8 = terceros.slice(0,8);
    const html = `<h4>Los 8 mejores terceros (según tus pronósticos)</h4><ul>${mejores8.map(t => `<li>Grupo ${t.grupo}: ${t.equipo.nombre} (${t.puntos} pts)</li>`).join('')}</ul>`;
    document.getElementById('lista-terceros').innerHTML = html;
}

// ==================== GOLEADOR ====================
function renderGoleador(yaVoto, nombreActual) {
    const container = document.getElementById('goleador');
    if (yaVoto) {
        container.innerHTML = `
            <div class="goleador-area">
                <i class="fas fa-trophy" style="font-size:3rem;"></i>
                <h3>Tu pronóstico de goleador</h3>
                <p><strong>${nombreActual}</strong></p>
                <p>✅ Ya has elegido y no puedes modificar tu selección.</p>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="goleador-area">
                <h3>🏅 Elige al campeón de goleo</h3>
                <input type="text" id="goleador-input" placeholder="Escribe el nombre del jugador">
                <button id="guardarGoleadorBtn" class="btn-goleador">Guardar pronóstico (único e inmodificable)</button>
            </div>
        `;
        document.getElementById('guardarGoleadorBtn').onclick = async () => {
            const jugador = document.getElementById('goleador-input').value.trim();
            if (!jugador) return alert("Escribe un nombre");
            const { error } = await _supabase.from('pronosticos_goleador').insert({
                usuario_id: currentUser.id,
                jugador_nombre: jugador,
                puntos_obtenidos: 0
            });
            if (error) alert("Error: " + error.message);
            else {
                alert("Pronóstico guardado. No podrás modificarlo.");
                renderizar();
            }
        };
    }
}

// ==================== ADMIN ====================
function renderAdmin() {
    const container = document.getElementById('admin');
    const partidosPendientes = partidosCache.filter(p => p.estado === 'pendiente');
    if (!partidosPendientes.length) {
        container.innerHTML = '<p>No hay partidos pendientes por cargar.</p>';
        return;
    }
    let html = `<h3>Cargar resultados reales</h3><div class="partidos-lista">`;
    partidosPendientes.forEach(p => {
        html += `
            <div class="partido-item">
                <div>${getNombreEquipo(p.equipo_local_id)} vs ${getNombreEquipo(p.equipo_visitante_id)}</div>
                <div>
                    <input type="number" id="real_local_${p.id}" placeholder="Goles local" style="width:60px"> -
                    <input type="number" id="real_visit_${p.id}" placeholder="Goles visit" style="width:60px">
                    <label><input type="checkbox" id="penales_real_${p.id}"> ¿Penales?</label>
                    <button class="btn-guardar" data-partido="${p.id}">Finalizar</button>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
    document.querySelectorAll('#admin .btn-guardar').forEach(btn => {
        btn.addEventListener('click', async () => {
            const partidoId = parseInt(btn.dataset.partido);
            const localReal = parseInt(document.getElementById(`real_local_${partidoId}`).value);
            const visitReal = parseInt(document.getElementById(`real_visit_${partidoId}`).value);
            const penales = document.getElementById(`penales_real_${partidoId}`).checked;
            if (isNaN(localReal) || isNaN(visitReal)) { alert("Ingresa goles reales"); return; }
            const { error } = await _supabase.from('partidos').update({
                goles_local_real: localReal,
                goles_visitante_real: visitReal,
                ganador_penaltis_real: penales,
                estado: 'finalizado'
            }).eq('id', partidoId);
            if (error) alert(error.message);
            else {
                alert("Resultado guardado. Calculando puntos...");
                await calcularPuntosPartido(partidoId);
                renderizar();
            }
        });
    });
}

async function calcularPuntosPartido(partidoId) {
    const { data: partido } = await _supabase.from('partidos').select('*').eq('id', partidoId).single();
    const { data: pronosticos } = await _supabase.from('pronosticos_partidos').select('*').eq('partido_id', partidoId);
    if (!pronosticos) return;
    for (let prono of pronosticos) {
        let puntos = 0;
        const aciertoExacto = (prono.goles_local === partido.goles_local_real && prono.goles_visitante === partido.goles_visitante_real);
        if (aciertoExacto) puntos += 6;
        else {
            let ganadorReal = null;
            if (partido.goles_local_real > partido.goles_visitante_real) ganadorReal = 'local';
            else if (partido.goles_local_real < partido.goles_visitante_real) ganadorReal = 'visitante';
            else ganadorReal = 'empate';
            let ganadorProno = null;
            if (prono.goles_local > prono.goles_visitante) ganadorProno = 'local';
            else if (prono.goles_local < prono.goles_visitante) ganadorProno = 'visitante';
            else ganadorProno = 'empate';
            if (ganadorReal === ganadorProno) puntos += 3;
        }
        await _supabase.from('pronosticos_partidos').update({ puntos_obtenidos: puntos }).eq('id', prono.id);
        const { data: perfil } = await _supabase.from('perfiles').select('puntos_totales').eq('id', prono.usuario_id).single();
        const nuevosTotales = (perfil.puntos_totales || 0) + puntos;
        await _supabase.from('perfiles').update({ puntos_totales: nuevosTotales }).eq('id', prono.usuario_id);
    }
}

// ==================== RANKING ====================
async function mostrarRanking() {
    const { data: perfiles } = await _supabase.from('perfiles').select('nombre, puntos_totales').order('puntos_totales', { ascending: false });
    if (!perfiles) return;
    let rankingHtml = '<div style="background:white; border-radius:24px; padding:1rem; max-width:500px; margin:auto;"><h3>🏆 Ranking de usuarios</h3><ul class="ranking-lista">';
    perfiles.forEach((p, idx) => {
        rankingHtml += `<li><strong>${idx+1}.</strong> ${p.nombre} <span style="float:right">${p.puntos_totales} pts</span></li>`;
    });
    rankingHtml += '</ul><button onclick="this.closest(\'div\').remove()">Cerrar</button></div>';
    const modal = document.createElement('div');
    modal.style.position = 'fixed'; modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100%'; modal.style.height = '100%'; modal.style.background = 'rgba(0,0,0,0.7)'; modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center'; modal.style.zIndex = '1000';
    modal.innerHTML = rankingHtml;
    document.body.appendChild(modal);
}

// ==================== INICIO ====================
(async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        await cargarPerfilUsuario();
        await cargarEquipos();
        await cargarPartidos();
    }
    renderizar();
})();
