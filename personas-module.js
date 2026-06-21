/**
 * Módulo Ver Personas: buscador y tabla con todos los registros.
 */

let todasLasPersonas = [];
let personasFiltradas = [];

function formatearFecha(fecha) {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-VE');
}

function escaparHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function filtrarPersonasLista() {
    const input = document.getElementById('busqueda-personas-lista');
    const termino = input ? input.value.toLowerCase().trim() : '';

    if (!termino) {
        personasFiltradas = [...todasLasPersonas];
    } else {
        personasFiltradas = todasLasPersonas.filter(p =>
            (p.nombre && p.nombre.toLowerCase().includes(termino)) ||
            (p.apellido && p.apellido.toLowerCase().includes(termino)) ||
            (p.cedula && p.cedula.toString().includes(termino))
        );
    }

    renderizarTablaPersonas();
    actualizarContadorPersonas();
}

function actualizarContadorPersonas() {
    const contador = document.getElementById('contador-personas');
    if (contador) {
        contador.textContent = `${personasFiltradas.length} de ${todasLasPersonas.length} personas registradas`;
    }
}

function renderizarTablaPersonas() {
    const tbody = document.getElementById('tabla-personas');
    if (!tbody) return;

    if (personasFiltradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding: 2rem; color: var(--text-muted);">No se encontraron personas</td></tr>`;
        return;
    }

    tbody.innerHTML = personasFiltradas.map(p => {
        const estatus = p.estatus || 'Activo';
        return `
            <tr>
                <td>${escaparHtml(p.cedula)}</td>
                <td>${escaparHtml(p.nombre)}</td>
                <td>${escaparHtml(p.apellido)}</td>
                <td>${escaparHtml(p.sexo)}</td>
                <td>${escaparHtml(p.edad || '-')}</td>
                <td>${escaparHtml(p.estado_civil || '-')}</td>
                <td>${escaparHtml(p.celular || '-')}</td>
                <td>${escaparHtml(p.carga_familiar ?? 0)}</td>
                <td>${escaparHtml(p.calle || '-')}</td>
                <td><span class="badge badge-${estatus.toLowerCase()}">${escaparHtml(estatus)}</span></td>
                <td>${formatearFecha(p.fecha_registro)}</td>
                <td>
                    <button type="button" class="btn-edit-persona" onclick="abrirModalEditarPersona(${p.id_persona})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </td>
            </tr>`;
    }).join('');
}

function abrirModalEditarPersona(id) {
    const p = todasLasPersonas.find(x => x.id_persona == id);
    if (!p || typeof abrirModalEditar !== 'function') return;
    abrirModalEditar(
        p.id_persona,
        p.cedula,
        p.nombre,
        p.apellido,
        p.sexo,
        p.edad || '',
        p.id_estado_civil || 1,
        p.celular || '',
        p.carga_familiar || 0,
        p.calle || '',
        p.estatus || 'Activo',
        p.fecha_registro || ''
    );
}

async function verDetallesPersonas() {
    const busqueda = document.getElementById('busqueda-personas-lista');
    const contenedor = document.getElementById('contenedor-tabla-personas');

    if (busqueda) busqueda.value = '';

    await cargarPersonas();

    personasFiltradas = [...todasLasPersonas];
    renderizarTablaPersonas();
    actualizarContadorPersonas();

    if (contenedor) {
        contenedor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

async function cargarPersonas() {
    try {
        const response = await fetch('/personas');
        const data = await response.json();
        todasLasPersonas = data.personas || [];
        personasFiltradas = [...todasLasPersonas];

        renderizarTablaPersonas();
        actualizarContadorPersonas();
    } catch (error) {
        console.error('Error al cargar personas:', error);
    }
}
