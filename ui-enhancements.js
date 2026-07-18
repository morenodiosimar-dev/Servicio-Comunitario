/**
 * Utilidades compartidas: validaciones, Flatpickr, TomSelect,
 * cambio de contraseña y badge de operador activo.
 */

let tomSelectInstances = [];
let flatpickrInstances = [];

/* ─── Validación de formularios ─── */
function limpiarErroresFormulario(form) {
    if (!form) return;
    form.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
    form.querySelectorAll('.field-error-msg').forEach(el => el.remove());
    form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    const alerta = form.querySelector('.form-validation-alert');
    if (alerta) alerta.remove();
}

function obtenerValorCampo(campo) {
    if (!campo) return '';

    if (campo._flatpickr) {
        if (campo._flatpickr.selectedDates && campo._flatpickr.selectedDates.length > 0) {
            return campo._flatpickr.formatDate(campo._flatpickr.selectedDates[0], 'Y-m-d');
        }
        if (campo._flatpickr.altInput && campo._flatpickr.altInput.value) {
            return campo._flatpickr.altInput.value.trim();
        }
        if (campo.value) return campo.value.trim();
        return '';
    }

    if (campo.tomselect) {
        return (campo.tomselect.getValue() || '').toString().trim();
    }

    return (campo.value || '').toString().trim();
}

function obtenerCampoVisible(campo) {
    if (campo._flatpickr && campo._flatpickr.altInput) {
        return campo._flatpickr.altInput;
    }
    if (campo.tomselect && campo.tomselect.control) {
        return campo.tomselect.control;
    }
    return campo;
}

function esCampoValidable(campo) {
    if (campo.type === 'button' || campo.type === 'submit') return false;
    if (campo.disabled) return false;
    if (campo.type === 'hidden' && campo.id !== 'edit-id') {
        return campo.hasAttribute('required') || campo.classList.contains('date-picker') || campo._flatpickr;
    }
    if (campo.classList.contains('flatpickr-input') && campo !== document.getElementById(campo.id)) {
        return false;
    }
    return true;
}

function marcarCampoError(campo, mensaje) {
    const grupo = campo.closest('.form-group') || campo.closest('.qty-item') || campo.parentElement;
    const visible = obtenerCampoVisible(campo);

    if (grupo) {
        grupo.classList.add('field-error');
        if (!grupo.querySelector('.field-error-msg')) {
            const msg = document.createElement('span');
            msg.className = 'field-error-msg';
            msg.textContent = mensaje;
            grupo.appendChild(msg);
        }
    }

    visible.classList.add('input-error', 'shake-error');
    setTimeout(() => visible.classList.remove('shake-error'), 500);
}

function limpiarErrorCampo(campo) {
    const grupo = campo.closest('.form-group') || campo.closest('.qty-item');
    const visible = obtenerCampoVisible(campo);

    if (grupo) {
        grupo.classList.remove('field-error');
        const msg = grupo.querySelector('.field-error-msg');
        if (msg) msg.remove();
    }
    visible.classList.remove('input-error');
}

function mostrarAlertaFormulario(form, mensaje) {
    let alerta = form.querySelector('.form-validation-alert');
    if (!alerta) {
        alerta = document.createElement('div');
        alerta.className = 'form-validation-alert';
        form.insertBefore(alerta, form.firstChild);
    }
    alerta.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${mensaje}`;
    alerta.style.display = 'flex';
}

function obtenerNombreCampo(campo) {
    const id = campo.id || '';
    const mapa = {
        'p-cedula': 'Cédula', 'edit-cedula': 'Cédula',
        'p-nombre': 'Nombre', 'edit-nombre': 'Nombre',
        'p-apellido': 'Apellido', 'edit-apellido': 'Apellido',
        'p-sexo': 'Sexo', 'edit-sexo': 'Sexo',
        'p-edad': 'Edad', 'edit-edad': 'Edad',
        'p-civil': 'Estado Civil', 'edit-civil': 'Estado Civil',
        'p-celular': 'Celular', 'edit-celular': 'Celular',
        'p-carga': 'Carga Familiar', 'edit-carga': 'Carga Familiar',
        'p-calle': 'Calle', 'edit-calle': 'Calle',
        'p-fecha': 'Fecha de Registro', 'edit-fecha': 'Fecha de Registro',
        'p-estatus': 'Estatus', 'edit-estatus': 'Estatus',
        'u-cedula': 'Cédula de Persona',
        'u-login': 'Usuario',
        'u-password': 'Contraseña',
        'u-rol': 'Rol',
        'pwd-actual': 'Contraseña Actual',
        'pwd-nueva': 'Nueva Contraseña',
        'pwd-confirmar': 'Confirmar Contraseña'
    };
    if (mapa[id]) return mapa[id];
    const label = campo.closest('.form-group')?.querySelector('label');
    if (label) return label.textContent.trim();
    return campo.name || id || 'Campo';
}

function validarFormulario(form, reglasExtra = {}) {
    limpiarErroresFormulario(form);
    let primerError = null;
    let hayErrores = false;
    const camposFaltantes = [];

    const campos = form.querySelectorAll('input, select, textarea');
    campos.forEach(campo => {
        if (!esCampoValidable(campo)) return;

        const valor = obtenerValorCampo(campo);
        const esRequerido = campo.hasAttribute('required') || campo.dataset.required === 'true';

        if (esRequerido && !valor) {
            marcarCampoError(campo, 'Este campo es obligatorio');
            if (!primerError) primerError = campo;
            hayErrores = true;
            camposFaltantes.push(obtenerNombreCampo(campo));
            return;
        }

        if (valor && campo.pattern) {
            const regex = new RegExp(campo.pattern);
            if (!regex.test(valor)) {
                marcarCampoError(campo, campo.title || 'Formato inválido');
                if (!primerError) primerError = campo;
                hayErrores = true;
                camposFaltantes.push(obtenerNombreCampo(campo));
            }
        }

        if (reglasExtra[campo.id]) {
            const resultado = reglasExtra[campo.id](valor, campo);
            if (resultado !== true) {
                marcarCampoError(campo, resultado);
                if (!primerError) primerError = campo;
                hayErrores = true;
                camposFaltantes.push(obtenerNombreCampo(campo));
            }
        }
    });

    if (hayErrores) {
        let mensaje;
        if (camposFaltantes.length === 1) {
            mensaje = `El campo "${camposFaltantes[0]}" es obligatorio.`;
        } else if (camposFaltantes.length <= 3) {
            mensaje = `Faltan campos: ${camposFaltantes.join(', ')}.`;
        } else {
            mensaje = `Faltan ${camposFaltantes.length} campos obligatorios: ${camposFaltantes.slice(0, 3).join(', ')} y otros.`;
        }
        mostrarAlertaFormulario(form, mensaje);
        if (primerError) {
            const visible = obtenerCampoVisible(primerError);
            visible.scrollIntoView({ behavior: 'smooth', block: 'center' });
            visible.focus();
        }
        return false;
    }
    return true;
}

function initValidacionFormularios() {
    document.querySelectorAll('form[data-validate]').forEach(form => {
        form.setAttribute('novalidate', 'novalidate');

        const limpiarSiValido = (campo) => {
            if (!campo) return;
            const valor = obtenerValorCampo(campo);
            if (valor) limpiarErrorCampo(campo);
        };

        form.addEventListener('input', (e) => limpiarSiValido(e.target));
        form.addEventListener('change', (e) => limpiarSiValido(e.target));
    });
}

/* ─── Flatpickr ─── */
function initFlatpickr() {
    if (typeof flatpickr === 'undefined') return;
    document.querySelectorAll('.date-picker, input[type="date"]').forEach(input => {
        if (input._flatpickr || input.classList.contains('flatpickr-input')) return;
        const fp = flatpickr(input, {
            dateFormat: 'Y-m-d',
            altInput: true,
            altFormat: 'd/m/Y',
            locale: 'es',
            allowInput: true,
            disableMobile: true,
            animate: true,
            onChange: () => limpiarErrorCampo(input)
        });
        flatpickrInstances.push(fp);
    });
}

/* ─── TomSelect ─── */
function initTomSelect() {
    if (typeof TomSelect === 'undefined') return;
    document.querySelectorAll('select.modern-select, .form-group select, .form-grid select, #form-editar-persona select').forEach(select => {
        if (select.id === 'select-persona-bombona') return;
        if (select.tomselect) return;
        const ts = new TomSelect(select, {
            create: false,
            sortField: { field: 'text', direction: 'asc' },
            placeholder: select.querySelector('option[value=""]')?.textContent || 'Seleccione...',
            allowEmptyOption: true,
            plugins: ['dropdown_input'],
            onChange: () => limpiarErrorCampo(select),
            render: {
                no_results: () => '<div class="no-results">Sin resultados</div>'
            }
        });
        tomSelectInstances.push(ts);
    });
}

function refreshTomSelect(selectEl) {
    if (selectEl && selectEl.tomselect) {
        selectEl.tomselect.sync();
    }
}

function resetFormularioLimpio(form) {
    if (!form) return;
    form.reset();
    form.querySelectorAll('select').forEach(select => {
        if (select.tomselect) {
            select.tomselect.clear();
            select.tomselect.sync();
        }
    });
    form.querySelectorAll('input').forEach(input => {
        if (input._flatpickr) {
            input._flatpickr.clear();
        }
    });
    limpiarErroresFormulario(form);
}

/* ─── Toggle contraseña ─── */
function crearTogglePassword(input) {
    const wrapper = document.createElement('div');
    wrapper.className = 'password-input-wrapper';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-toggle-password';
    btn.innerHTML = '<i class="fas fa-eye"></i>';
    btn.setAttribute('aria-label', 'Mostrar u ocultar contraseña');
    btn.onclick = () => {
        const esTexto = input.type === 'text';
        input.type = esTexto ? 'password' : 'text';
        btn.innerHTML = esTexto
            ? '<i class="fas fa-eye"></i>'
            : '<i class="fas fa-eye-slash"></i>';
    };
    wrapper.appendChild(btn);
}

/* ─── Modal cambio de contraseña ─── */
function abrirModalCambiarPassword() {
    let modal = document.getElementById('modal-cambiar-password');
    if (modal) {
        modal.style.display = 'flex';
        limpiarErroresFormulario(modal.querySelector('form'));
        modal.querySelector('form').reset();
        return;
    }

    modal = document.createElement('div');
    modal.id = 'modal-cambiar-password';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content modal-scale">
            <div class="modal-header">
                <h3><i class="fas fa-lock"></i> Cambiar Contraseña</h3>
                <button type="button" class="modal-close" onclick="cerrarModalCambiarPassword()">&times;</button>
            </div>
            <form id="form-cambiar-password" data-validate>
                <div class="form-group">
                    <label>Contraseña Actual</label>
                    <input type="password" id="pwd-actual" required placeholder="Ingrese su contraseña actual">
                </div>
                <div class="form-group">
                    <label>Nueva Contraseña</label>
                    <input type="password" id="pwd-nueva" required placeholder="Mínimo 8 caracteres y 1 número"
                        pattern="^(?=.*\\d).{8,}$" title="Mínimo 8 caracteres y al menos 1 número">
                </div>
                <div class="form-group">
                    <label>Repetir Nueva Contraseña</label>
                    <input type="password" id="pwd-confirmar" required placeholder="Confirme la nueva contraseña">
                </div>
                <div id="alerta-password" class="alert" style="display:none;"></div>
                <div class="modal-footer">
                    <button type="button" class="btn-back" onclick="cerrarModalCambiarPassword()">Cancelar</button>
                    <button type="submit" class="btn-submit" style="width:auto; margin-top:0;">
                        <i class="fas fa-save"></i> Actualizar
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelectorAll('input[type="password"]').forEach(crearTogglePassword);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModalCambiarPassword();
    });

    document.getElementById('form-cambiar-password').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        limpiarErroresFormulario(form);

        const actual = document.getElementById('pwd-actual').value;
        const nueva = document.getElementById('pwd-nueva').value;
        const confirmar = document.getElementById('pwd-confirmar').value;
        const alertBox = document.getElementById('alerta-password');

        if (!validarFormulario(form)) return;

        if (nueva !== confirmar) {
            marcarCampoError(document.getElementById('pwd-confirmar'), 'Las contraseñas no coinciden');
            alertBox.textContent = 'Las contraseñas no coinciden';
            alertBox.className = 'alert alert-error';
            alertBox.style.display = 'block';
            return;
        }

        const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}');
        if (!usuario.id_usuario) {
            alertBox.textContent = 'Sesión no válida. Inicie sesión nuevamente.';
            alertBox.className = 'alert alert-error';
            alertBox.style.display = 'block';
            return;
        }

        try {
            const res = await fetch('/usuarios/cambiar-password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_usuario: usuario.id_usuario,
                    password_actual: actual,
                    password_nueva: nueva
                })
            });
            const data = await res.json();

            if (res.ok) {
                alertBox.style.display = 'none';
                mostrarMensajeExito('Contraseña actualizada correctamente', data.message || 'Su contraseña ha sido cambiada exitosamente.', 'fa-lock');
                cerrarModalCambiarPassword();
            } else {
                if (data.error && data.error.includes('incorrecta')) {
                    marcarCampoError(document.getElementById('pwd-actual'), 'Contraseña actual incorrecta');
                }
                alertBox.textContent = data.error || 'Error al cambiar contraseña';
                alertBox.className = 'alert alert-error';
                alertBox.style.display = 'block';
            }
        } catch {
            alertBox.textContent = 'Error de conexión con el servidor';
            alertBox.className = 'alert alert-error';
            alertBox.style.display = 'block';
        }
    });

    modal.style.display = 'flex';
}

function cerrarModalCambiarPassword() {
    const modal = document.getElementById('modal-cambiar-password');
    if (modal) modal.style.display = 'none';
}

/* ─── Badge operador + botón configuración ─── */
function initOperadorBadge(textoBadge) {
    const profile = document.querySelector('.user-profile');
    if (!profile || profile.querySelector('.operador-status')) return;

    const statusDiv = document.createElement('div');
    statusDiv.className = 'stat-info';
    statusDiv.innerHTML = `
        <div class="operador-status">
            <span class="badge badge-online"><span class="status-dot"></span> ${textoBadge}</span>
            <button type="button" class="btn-settings" onclick="abrirModalCambiarPassword()" title="Configuración">
                <i class="fas fa-cog"></i>
            </button>
        </div>
    `;
    profile.insertBefore(statusDiv, profile.firstChild);
}

/* ─── Subida de archivos estilizada ─── */
function initFileUploads() {
    document.querySelectorAll('.file-upload-input').forEach(input => {
        if (input.dataset.fileInit) return;
        input.dataset.fileInit = 'true';

        input.addEventListener('change', () => {
            const nameEl = document.getElementById(`${input.id}-name`);
            if (!nameEl) return;
            if (input.files && input.files.length > 0) {
                nameEl.textContent = input.files[0].name;
                nameEl.classList.add('has-file');
            } else {
                nameEl.textContent = 'Ningún archivo seleccionado';
                nameEl.classList.remove('has-file');
            }
        });
    });
}

function resetFileUpload(inputId) {
    const input = document.getElementById(inputId);
    const nameEl = document.getElementById(`${inputId}-name`);
    if (input) input.value = '';
    if (nameEl) {
        nameEl.textContent = 'Ningún archivo seleccionado';
        nameEl.classList.remove('has-file');
    }
}

/* ─── Inicialización global ─── */
function initUIEnhancements(opciones = {}) {
    initOperadorBadge(opciones.badgeText || 'Online');
    initFlatpickr();
    initTomSelect();
    initValidacionFormularios();
    initFileUploads();
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof initUIEnhancementsAuto === 'function') {
        initUIEnhancementsAuto();
    }
});
