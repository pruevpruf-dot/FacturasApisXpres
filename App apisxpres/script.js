let cajaAbierta = false;
let montoInicial = 0;
let usuarioActual = "";
let pedidosDia = [];
let historialDeCambios = []; // NUEVA VARIABLE
let carrito = {};
let pedidoCounter = 0;
let gastosDia = [];
const ADMIN_PASSWORD = '123';
let currentSessionKey = null;
let currentSessionStart = null; // ISO string
let currentSessionEnd = null;   // ISO string

// --- Persistencia por sesión/fecha ---
function getSessionKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `session_${y}-${m}-${d}`;
}

function saveSession() {
    const key = currentSessionKey || getSessionKey();
    const payload = {
        cajaAbierta,
        usuarioActual,
        montoInicial,
        pedidosDia,
        historialDeCambios,
        sessionMeta: {
            start: currentSessionStart || null,
            end: currentSessionEnd || null
        },
        pedidoCounter,
        gastosDia,
        carrito
    };
    localStorage.setItem(key, JSON.stringify(payload));
    // También actualizar claves antiguas por compatibilidad (opcional)
    localStorage.setItem('pedidosDia', JSON.stringify(pedidosDia));
    localStorage.setItem('gastosDia', JSON.stringify(gastosDia));
}

function loadSession(date = new Date()) {
    const key = getSessionKey(date);
    const raw = localStorage.getItem(key);
    if (raw) {
        try {
            const s = JSON.parse(raw);
            cajaAbierta = !!s.cajaAbierta;
            usuarioActual = s.usuarioActual || '';
            montoInicial = parseFloat(s.montoInicial) || 0;
            pedidosDia = Array.isArray(s.pedidosDia) ? s.pedidosDia : [];
            historialDeCambios = Array.isArray(s.historialDeCambios) ? s.historialDeCambios : [];
            pedidoCounter = parseInt(s.pedidoCounter) || 0;
            gastosDia = Array.isArray(s.gastosDia) ? s.gastosDia : [];
            carrito = s.carrito || {};
            return true;
        } catch (e) {
            console.error('Error parseando sesión:', e);
            return false;
        }
    }

    // Fallback: intentar cargar claves antiguas si existen
    try {
        const pedidosGuardados = localStorage.getItem('pedidosDia');
        pedidosDia = pedidosGuardados ? JSON.parse(pedidosGuardados) : [];
        const cambiosGuardados = localStorage.getItem('historialDeCambios');
        historialDeCambios = cambiosGuardados ? JSON.parse(cambiosGuardados) : [];
        pedidoCounter = parseInt(localStorage.getItem('pedidoCounter')) || 0;
        const gastosGuardados = localStorage.getItem('gastosDia');
        gastosDia = gastosGuardados ? JSON.parse(gastosGuardados) : [];
        usuarioActual = localStorage.getItem('usuarioActual') || '';
        montoInicial = parseFloat(localStorage.getItem('montoInicial')) || 0;
        cajaAbierta = localStorage.getItem('cajaAbierta') === 'true';
        return true;
    } catch (e) {
        console.error('Error cargando estado legacy:', e);
        return false;
    }
}

function listSessions() {
    // Prefer index if exists
    try {
        const idxRaw = localStorage.getItem('sessions_index');
        if (idxRaw) {
            const idx = JSON.parse(idxRaw);
            return idx.slice().reverse(); // devolver más recientes primero
        }
    } catch (e) {
        console.error('Error leyendo sessions_index', e);
    }

    const keys = Object.keys(localStorage).filter(k => k.startsWith('session_')).sort().reverse();
    return keys.map(k => ({ key: k, date: k.replace('session_', '') }));
}

// 🚨 PRECIOS ACTUALIZADOS 🚨
const precios = {
    'Api Morado': 7.00, 'Api Blanco': 7.00, 'Api Mixto': 7.00,
    'Tojori C/L': 7.00, 'Tojori S/L': 7.00,
    'Arroz C/L C/C': 10.00, 'Arroz C/L S/C': 10.00,
    'Pastel C/A': 7.00, 'Pastel S/A': 7.00,
    'Buñuelo C/M': 0.50, 'Buñuelo S/M': 0.50,
    'Tawa Tawa C/M': 1.00, 'Tawa Tawa S/M': 1.00,
    'Tawa Tawa C/A': 1.00, 'Tawa Tawa S/A': 1.00,
    'Chocolatada': 10.00
};

// --- FUNCIONES DE ESTADO Y PERSISTENCIA ---
function limpiarEstado() {
    cajaAbierta = false;
    usuarioActual = '';
    montoInicial = 0;
    pedidosDia = [];
    historialDeCambios = []; // Limpiar también el historial de cambios
    carrito = {};
    pedidoCounter = 0;
    gastosDia = [];
    localStorage.setItem('cajaAbierta', 'false');
    localStorage.removeItem('usuarioActual');
    localStorage.removeItem('montoInicial');
    localStorage.removeItem('pedidosDia');
    localStorage.removeItem('historialDeCambios'); // Limpiar localStorage
    localStorage.removeItem('pedidoCounter');
    localStorage.removeItem('gastosDia');
    actualizarBotones();
    actualizarUsuarioActivo();
    document.getElementById('statusInicio').style.display = 'none';
    document.getElementById('formInicio').style.display = 'block';
    document.getElementById('statusCierre').style.display = 'none';
    document.getElementById('formCierre').reset();
}

function cargarEstadoInicial() {
    try {
        // Intentar cargar la sesión del día actual; si no existe, hacer fallback
        const ok = loadSession(new Date());
        if (!ok) {
            cajaAbierta = localStorage.getItem('cajaAbierta') === 'true';
            usuarioActual = localStorage.getItem('usuarioActual') || '';
            montoInicial = parseFloat(localStorage.getItem('montoInicial')) || 0;
            const pedidosGuardados = localStorage.getItem('pedidosDia');
            pedidosDia = pedidosGuardados ? JSON.parse(pedidosGuardados) : [];
            const cambiosGuardados = localStorage.getItem('historialDeCambios'); // Cargar Cambios
            historialDeCambios = cambiosGuardados ? JSON.parse(cambiosGuardados) : [];
            pedidoCounter = parseInt(localStorage.getItem('pedidoCounter')) || 0;
            const gastosGuardados = localStorage.getItem('gastosDia');
            gastosDia = gastosGuardados ? JSON.parse(gastosGuardados) : [];
        }

    } catch (e) {
        console.error('Error cargando estado:', e);
        limpiarEstado();
    }

    actualizarBotones();
    actualizarUsuarioActivo();

    if (cajaAbierta) {
        const totalVentas = pedidosDia.reduce((sum, p) => sum + p.total, 0);
        document.getElementById('statusInicio').innerHTML =
            `<p>✅ Caja ABIERTA por: ${usuarioActual}<br>
            Monto inicial: Bs ${montoInicial.toFixed(2)} | Ventas: Bs ${totalVentas.toFixed(2)}</p>
            <button onclick="showTab('pedido')" style="background-color: #4CAF50; margin-top: 10px;">
                ➡️ ¡Listo! Ir a Realizar Pedido
            </button>
            `;
        document.getElementById('statusInicio').style.display = 'block';
        document.getElementById('formInicio').style.display = 'none';
    }
}

function guardarEstado() {
    // Guardar en la sesión del día y también en claves legacy para compatibilidad
    localStorage.setItem('cajaAbierta', cajaAbierta.toString());
    localStorage.setItem('usuarioActual', usuarioActual);
    localStorage.setItem('montoInicial', montoInicial.toString());
    localStorage.setItem('historialDeCambios', JSON.stringify(historialDeCambios)); // Guardar Cambios
    localStorage.setItem('pedidoCounter', pedidoCounter.toString());
    saveSession();
}

// --- Helpers: modal y toast ---
function showToast(msg, timeout = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), timeout);
}

function showModal(message, { input = false } = {}) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal');
        const msgEl = document.getElementById('modal-message');
        const inputEl = document.getElementById('modal-input');
        const okBtn = document.getElementById('modal-ok');
        const cancelBtn = document.getElementById('modal-cancel');

        msgEl.textContent = message;
        inputEl.style.display = input ? 'block' : 'none';
        inputEl.value = '';
        modal.style.display = 'flex';

        function cleanup() {
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            modal.style.display = 'none';
        }

        function onOk() {
            const value = input ? inputEl.value : true;
            cleanup();
            resolve(value);
        }

        function onCancel() {
            cleanup();
            resolve(null);
        }

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        if (input) inputEl.focus();
    });
}

function actualizarBotones() {
    // Se añade 'btnCambios' a la lista
    const btns = ['btnPedido', 'btnHistorial', 'btnCambios', 'btnCierre', 'btnGastos'];
    btns.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = !cajaAbierta;
    });
}

function actualizarUsuarioActivo() {
    const usuarioElem = document.getElementById('usuarioActivo');
    const nombreUsuarioSpan = document.getElementById('nombreUsuario');
    if (cajaAbierta && usuarioActual) {
        nombreUsuarioSpan.textContent = usuarioActual;
        usuarioElem.style.display = 'flex'; // Usar flex para alinear icono y texto
    } else {
        usuarioElem.style.display = 'none';
    }
}

window.showTab = function(tabName) {
    if (!cajaAbierta && tabName !== 'inicio') {
        alert('Debe abrir la caja primero para acceder a esta función.');
        showTab('inicio');
        return;
    }

    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabName).classList.add('active');
    document.querySelector(`button[onclick="showTab('${tabName}')"]`).classList.add('active');

    if (tabName === 'historial') {
        cargarHistorial();
    }
    // NUEVO: Cargar historial de cambios
    if (tabName === 'cambios') {
        cargarHistorialCambios();
    }
    if (tabName === 'pedido') {
        actualizarCarritoVisual();
        document.getElementById('factura').style.display = 'none';
    }
    if (tabName === 'cierre') {
        document.getElementById('statusCierre').style.display = 'none';
    }
    if (tabName === 'gastos') {
        cargarGastos();
    }
}

// --- LÓGICA DE CARRITO (PEDIDO) ---

function actualizarHighlightProductos() {
    document.querySelectorAll('.producto-card').forEach(card => {
        const producto = card.getAttribute('data-producto');
        const input = card.querySelector('.cantidad-input');

        if (input && parseInt(input.value) > 0) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

function actualizarCarritoVisual() {
    const carritoItemsElem = document.getElementById('carritoItems');
    let total = 0;
    let html = '';

    for (const producto in carrito) {
        const item = carrito[producto];
        if (item.cantidad > 0) {
            const subtotal = item.cantidad * item.precio;
            total += subtotal;
            html += `
                <div class="carrito-item">
                    <span>${item.cantidad} x ${producto} (Bs ${item.precio.toFixed(2)})</span>
                    <span>Bs ${subtotal.toFixed(2)}</span>
                </div>
            `;
        }
    }

    carritoItemsElem.innerHTML = html || '<p>Aún no hay productos en el carrito.</p>';
    document.getElementById('carritoTotal').innerHTML = `Total: Bs ${total.toFixed(2)}`;
    return total;
}

window.actualizarCantidad = function(producto, cantidadInput) {
    const cant = parseInt(cantidadInput.value);
    const card = cantidadInput.closest('.producto-card');

    if (cant < 0 || isNaN(cant)) {
        cantidadInput.value = (carrito[producto] && carrito[producto].cantidad) || 0;
        return;
    }

    if (cant === 0) {
        delete carrito[producto];
    } else {
        carrito[producto] = {
            cantidad: cant,
            precio: precios[producto]
        };
    }

    if (cant > 0) {
        card.classList.add('active');
    } else {
        card.classList.remove('active');
    }

    actualizarCarritoVisual();
}

document.addEventListener('DOMContentLoaded', () => {
    cargarEstadoInicial();
    document.querySelectorAll('.cantidad-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const producto = e.target.getAttribute('data-producto');
            window.actualizarCantidad(producto, e.target);
        });
        input.closest('.producto-card').addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() !== 'input') {
                let currentVal = parseInt(input.value) || 0;
                input.value = currentVal + 1;
                input.dispatchEvent(new Event('change'));
            }
        });
    });
});

window.ocultarFactura = function() {
    setTimeout(() => {
        document.getElementById('factura').style.display = 'none';
        carrito = {};
        document.getElementById('formPedido').reset();
        document.querySelectorAll('.cantidad-input').forEach(input => input.value = 0);
        actualizarCarritoVisual();
        actualizarHighlightProductos();
    }, 100);
}

// --- INICIO DE CAJA LISTENER ---

document.getElementById('formInicio').addEventListener('submit', function(e) {
    e.preventDefault();

    usuarioActual = document.getElementById('usuario').value.trim();
    montoInicial = document.getElementById('montoInicial').valueAsNumber;

    if (!usuarioActual) {
        alert('Por favor, ingrese un nombre de usuario.');
        return;
    }

    if (isNaN(montoInicial) || montoInicial < 0.01) {
        alert('❌ Por favor, ingrese un monto inicial válido (mayor o igual a Bs 0.01).');
        return;
    }

    cajaAbierta = true;
    pedidoCounter = 0; // Reiniciar contador de pedidos
    pedidosDia = []; // Iniciar un nuevo día de pedidos
    historialDeCambios = []; // Iniciar un nuevo historial de cambios
    gastosDia = []; // Iniciar un nuevo día de gastos

    // Iniciar metadata de sesión
    currentSessionStart = new Date().toISOString();
    // key con timestamp para permitir múltiples sesiones por día
    currentSessionKey = `session_${new Date().toISOString().replace(/[:.]/g, '-')}`;

    document.getElementById('statusInicio').innerHTML = `
        <p>✅ Caja ABIERTA por: ${usuarioActual}<br>
        Monto inicial: Bs ${montoInicial.toFixed(2)} | Ventas: Bs 0.00</p>
        <button onclick="showTab('pedido')" style="background-color: #4CAF50; margin-top: 10px;">
            ➡️ ¡Listo! Ir a Realizar Pedido
        </button>
    `;
    document.getElementById('statusInicio').style.display = 'block';
    document.getElementById('formInicio').style.display = 'none';

    guardarEstado();
    actualizarBotones();
    actualizarUsuarioActivo();
});

// --- REALIZAR PEDIDO (FORMULARIO CON CARRO) ---

document.getElementById('formPedido').addEventListener('submit', function(e) {
    e.preventDefault();

    const totalPedido = actualizarCarritoVisual();

    if (totalPedido === 0) {
        alert('El carrito está vacío. Agregue productos antes de facturar.');
        return;
    }

    const btnConfirm = document.getElementById('btnConfirmarPedido');
    btnConfirm.classList.add('shake-on-confirm');
    setTimeout(() => {
        btnConfirm.classList.remove('shake-on-confirm');
    }, 500);

    const cliente = document.getElementById('cliente').value || 'Cliente anónimo';

    const detallesPedido = [];
    for (const producto in carrito) {
        const item = carrito[producto];
        if (item.cantidad > 0) {
            detallesPedido.push({
                producto: producto,
                cantidad: item.cantidad,
                precioUnitario: item.precio,
                subtotal: item.cantidad * item.precio
            });
        }
    }

    const nuevoPedido = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        total: totalPedido,
        cliente: cliente,
        usuario: usuarioActual,
        fecha: new Date().toLocaleString('es-BO'),
        detalles: detallesPedido
    };

    pedidosDia.push(nuevoPedido);
    guardarEstado();

    const facturaUsuario = document.getElementById('facturaUsuario');
    const facturaCliente = document.getElementById('facturaCliente');
    const facturaDetalles = document.getElementById('facturaDetalles');
    const facturaTotal = document.getElementById('facturaTotal');
    const facturaFecha = document.getElementById('facturaFecha');

    facturaUsuario.textContent = usuarioActual;
    facturaCliente.textContent = `Cliente: ${cliente}`;
    // limpiar y construir detalles
    facturaDetalles.innerHTML = '';
    detallesPedido.forEach(d => {
        const p = document.createElement('p');
        p.textContent = `${d.cantidad}x ${d.producto} (Bs ${d.precioUnitario.toFixed(2)} c/u) = Bs ${d.subtotal.toFixed(2)}`;
        facturaDetalles.appendChild(p);
    });
    facturaTotal.innerHTML = `<strong>Total: Bs ${totalPedido.toFixed(2)}</strong>`;
    facturaFecha.textContent = nuevoPedido.fecha;
    document.getElementById('factura').style.display = 'block';
    document.getElementById('factura').scrollIntoView({ behavior: 'smooth' });
});

// --- AGREGAR GASTO ---

document.getElementById('formGasto').addEventListener('submit', function(e) {
    e.preventDefault();

    const detalle = document.getElementById('detalleGasto').value.trim();
    const monto = document.getElementById('montoGasto').valueAsNumber;

    if (!detalle || isNaN(monto) || monto <= 0) {
        alert('Ingrese detalle y monto válido.');
        return;
    }

    const nuevoGasto = {
        detalle: detalle,
        monto: monto,
        fecha: new Date().toLocaleString('es-BO')
    };

    gastosDia.push(nuevoGasto);
    guardarEstado();
    document.getElementById('formGasto').reset();
    cargarGastos();
    alert('Gasto agregado.');
});

// --- FUNCIONES DE REGISTRO DE CAMBIOS ---

/**
 * Registra un cambio (edición o eliminación) en el historial.
 * @param {string} tipo - 'ELIMINACION' o 'EDICION_CLIENTE'.
 * @param {number} pedidoId - El ID del pedido afectado.
 * @param {string} detalle - Descripción del cambio.
 */
function registrarCambio(tipo, pedidoId, detalle) {
    const nuevoCambio = {
        timestamp: Date.now(),
        fecha: new Date().toLocaleString('es-BO'),
        usuario: usuarioActual,
        tipo: tipo,
        pedidoId: pedidoId,
        detalle: detalle
    };
    historialDeCambios.push(nuevoCambio);
    guardarEstado();
}

/**
 * Carga y muestra el historial de cambios.
 */
window.cargarHistorialCambios = function() {
    const listaCambiosElem = document.getElementById('listaCambios');
    listaCambiosElem.innerHTML = '';
    if (historialDeCambios.length === 0) {
        const p = document.createElement('p');
        p.textContent = 'No se han registrado modificaciones o eliminaciones de pedidos.';
        listaCambiosElem.appendChild(p);
        return;
    }

    [...historialDeCambios].reverse().forEach(cambio => {
        const item = document.createElement('div');
        item.className = 'pedido-item';
        if (cambio.tipo === 'ELIMINACION') item.style.borderColor = '#f44336'; else item.style.borderColor = '#008CBA';

        const tipo = document.createElement('p'); tipo.innerHTML = `<strong>Tipo:</strong> ${cambio.tipo}`;
        const pid = document.createElement('p'); pid.innerHTML = `<strong>Pedido ID:</strong> ${cambio.pedidoId}`;
        const fh = document.createElement('p'); fh.innerHTML = `<strong>Fecha/Hora:</strong> ${cambio.fecha}`;
        const us = document.createElement('p'); us.innerHTML = `<strong>Usuario:</strong> ${cambio.usuario}`;
        const det = document.createElement('p'); det.innerHTML = `<strong>Detalle:</strong> ${cambio.detalle}`;

        item.appendChild(tipo);
        item.appendChild(pid);
        item.appendChild(fh);
        item.appendChild(us);
        item.appendChild(det);
        listaCambiosElem.appendChild(item);
    });
}

/**
 * Carga y muestra la lista de gastos.
 */
window.cargarGastos = function() {
    const listaGastosElem = document.getElementById('listaGastos');
    if (gastosDia.length === 0) {
        listaGastosElem.innerHTML = '<p>No se han registrado gastos.</p>';
        return;
    }

    let html = '';
    gastosDia.forEach(gasto => {
        html += `
            <div class="pedido-item">
                <p><strong>Detalle:</strong> ${gasto.detalle}</p>
                <p><strong>Monto:</strong> Bs ${gasto.monto.toFixed(2)}</p>
                <p><strong>Fecha:</strong> ${gasto.fecha}</p>
            </div>
        `;
    });

    listaGastosElem.innerHTML = html;
}

// --- HISTORIAL DE PEDIDOS: FUNCIONES DE GESTIÓN ---

/**
 * Carga y muestra la lista de pedidos en la pestaña de Historial.
 */
window.cargarHistorial = function() {
    const listaPedidosElem = document.getElementById('listaPedidos');
    listaPedidosElem.innerHTML = '';
    if (pedidosDia.length === 0) {
        const p = document.createElement('p');
        p.textContent = 'No se han registrado pedidos en esta caja.';
        listaPedidosElem.appendChild(p);
        return;
    }

    pedidosDia.forEach(pedido => {
        const item = document.createElement('div');
        item.className = 'pedido-item';
        item.id = `pedido-${pedido.id}`;

        const pid = document.createElement('p'); pid.innerHTML = `<strong>Pedido ID:</strong> ${pedido.id}`;
        const clienteP = document.createElement('p');
        clienteP.innerHTML = `<strong>Cliente:</strong> <span id="cliente-display-${pedido.id}"></span>`;
        clienteP.querySelector(`#cliente-display-${pedido.id}`).textContent = pedido.cliente;
        const usuarioP = document.createElement('p'); usuarioP.innerHTML = `<strong>Atendido por:</strong> ${pedido.usuario}`;
        const fechaP = document.createElement('p'); fechaP.innerHTML = `<strong>Fecha/Hora:</strong> ${pedido.fecha}`;
        const totalP = document.createElement('p'); totalP.innerHTML = `<strong>Total:</strong> <span class="total">Bs ${pedido.total.toFixed(2)}</span>`;
        const detallesTitle = document.createElement('p'); detallesTitle.innerHTML = '<strong>Detalles:</strong>';
        const ul = document.createElement('ul');
        pedido.detalles.forEach(d => {
            const li = document.createElement('li');
            li.textContent = `${d.cantidad}x ${d.producto} (Bs ${d.precioUnitario.toFixed(2)})`;
            ul.appendChild(li);
        });

        const editForm = document.createElement('div'); editForm.id = `edit-form-${pedido.id}`; editForm.style.display = 'none'; editForm.style.marginTop = '10px';
        const actions = document.createElement('div'); actions.className = 'actions';
        const editBtn = document.createElement('button'); editBtn.className = 'edit-button'; editBtn.type = 'button'; editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i> Editar Cliente'; editBtn.addEventListener('click', () => iniciarEdicionPedido(pedido.id));
        const delBtn = document.createElement('button'); delBtn.type = 'button'; delBtn.style.backgroundColor = '#f44336'; delBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Eliminar'; delBtn.addEventListener('click', () => eliminarPedido(pedido.id));
        actions.appendChild(editBtn); actions.appendChild(delBtn);

        item.appendChild(pid);
        item.appendChild(clienteP);
        item.appendChild(usuarioP);
        item.appendChild(fechaP);
        item.appendChild(totalP);
        item.appendChild(detallesTitle);
        item.appendChild(ul);
        item.appendChild(editForm);
        item.appendChild(actions);

        listaPedidosElem.appendChild(item);
    });
}

/**
 * Elimina un pedido y registra el cambio.
 * @param {number} pedidoId - El ID (timestamp) del pedido a eliminar.
 */
window.eliminarPedido = async function(pedidoId) {
    // Solicitar contraseña
    const pw = await showModal('Ingrese la contraseña para eliminar el pedido:', { input: true });
    if (pw === null) return; // usuario canceló
    if (pw !== ADMIN_PASSWORD) {
        showToast('Contraseña incorrecta');
        return;
    }

    // Confirmación final
    const ok = await showModal(`¿Está seguro de que desea ELIMINAR el pedido con ID ${pedidoId}? Esta acción es irreversible y afectará el cálculo del cierre de caja.`, { input: false });
    if (!ok) return;

    // Realizar eliminación con pequeño retardo para UX
    setTimeout(() => {
        const index = pedidosDia.findIndex(p => p.id === pedidoId);
        if (index === -1) return;
        const pedidoEliminado = pedidosDia[index];
        pedidosDia.splice(index, 1);
        registrarCambio(
            'ELIMINACION',
            pedidoId,
            `Pedido de Bs ${pedidoEliminado.total.toFixed(2)} para "${pedidoEliminado.cliente}" eliminado. Venta total disminuida.`
        );
        guardarEstado();
        showToast(`Pedido ID ${pedidoId} eliminado con éxito.`);
        cargarHistorial();
    }, 250);
}

/**
 * Muestra un formulario en línea para editar el nombre del cliente.
 */
window.iniciarEdicionPedido = function(pedidoId) {
    const pedido = pedidosDia.find(p => p.id === pedidoId);
    if (!pedido) return;

    const formContainer = document.getElementById(`edit-form-${pedido.id}`);
    const currentDisplay = document.getElementById(`cliente-display-${pedido.id}`);

    // Ocultar cualquier otro formulario de edición abierto (opcional)
    document.querySelectorAll('[id^="edit-form-"]').forEach(f => f.style.display = 'none');
    document.querySelectorAll('[id^="cliente-display-"]').forEach(d => d.style.display = 'inline');

    currentDisplay.style.display = 'none';
    formContainer.style.display = 'block';
    formContainer.innerHTML = '';

    const label = document.createElement('label');
    label.htmlFor = `nuevoCliente-${pedidoId}`;
    label.textContent = 'Nuevo Cliente:';

    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.id = `nuevoCliente-${pedidoId}`;
    inputEl.value = pedido.cliente || '';
    inputEl.placeholder = 'Nombre del cliente';
    inputEl.required = true;

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'Guardar';
    saveBtn.addEventListener('click', () => guardarEdicionPedido(pedidoId, inputEl.value, pedido.cliente));

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.style.backgroundColor = '#6c757d';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => cancelarEdicionPedido(pedidoId));

    formContainer.appendChild(label);
    formContainer.appendChild(inputEl);
    formContainer.appendChild(saveBtn);
    formContainer.appendChild(cancelBtn);

    inputEl.focus();
}

/**
 * Cancela la edición y vuelve a mostrar el nombre del cliente.
 */
window.cancelarEdicionPedido = function(pedidoId) {
    document.getElementById(`edit-form-${pedidoId}`).style.display = 'none';
    document.getElementById(`cliente-display-${pedidoId}`).style.display = 'inline';
}

/**
 * Guarda el nuevo nombre del cliente para el pedido y registra el cambio.
 * @param {number} pedidoId - El ID (timestamp) del pedido.
 * @param {string} nuevoCliente - El nuevo nombre del cliente.
 * @param {string} clienteAnterior - El nombre del cliente antes de la edición.
 */
window.guardarEdicionPedido = function(pedidoId, nuevoCliente, clienteAnterior) {
    const pedido = pedidosDia.find(p => p.id === pedidoId);
    if (!pedido) return;

    const clienteNormalizado = nuevoCliente.trim() || 'Cliente anónimo';

    if (clienteNormalizado === clienteAnterior) {
        alert('No se detectaron cambios en el nombre del cliente.');
        cancelarEdicionPedido(pedidoId);
        return;
    }

    pedido.cliente = clienteNormalizado;

    // REGISTRAR CAMBIO
    registrarCambio(
        'EDICION_CLIENTE',
        pedidoId,
        `Cambio de cliente: de "${clienteAnterior}" a "${clienteNormalizado}".`
    );

    guardarEstado();

    alert(`✅ Cliente del Pedido ID ${pedidoId} actualizado a: ${clienteNormalizado}`);
    cargarHistorial();
}

// --- CIERRE DE CAJA ---

document.getElementById('formCierre').addEventListener('submit', function(e) {
    e.preventDefault();

    const montoFinal = document.getElementById('montoFinal').valueAsNumber;

    if (isNaN(montoFinal) || montoFinal < 0) {
        alert('❌ Por favor, ingrese un monto final válido.');
        return;
    }

    const fechaCierre = new Date().toLocaleDateString('es-BO');
    const horaCierre = new Date().toLocaleTimeString('es-BO');
    const totalVentas = pedidosDia.reduce((sum, p) => sum + p.total, 0);
    const totalGastos = gastosDia.reduce((sum, g) => sum + g.monto, 0);
    const montoEsperado = montoInicial + totalVentas - totalGastos;
    const diferencia = montoFinal - montoEsperado;
    const estadoCaja = diferencia === 0 ? 'Exacta' : (diferencia > 0 ? 'Sobrante' : 'Faltante');

    let detallesPedidosHtml = pedidosDia.map((p, index) => {
        const productosVendidos = p.detalles.map(d => `${d.cantidad} ${d.producto}`).join(', ');
        return `
            <div class="pedido-cierre-item">
                <strong>#${index + 1}</strong>: Bs ${p.total.toFixed(2)} (Cliente: ${p.cliente}) - ${productosVendidos}
            </div>
        `;
    }).join('');

    let detallesGastosHtml = gastosDia.map(g =>
        `<p>${g.detalle}: Bs ${g.monto.toFixed(2)}</p>`
    ).join('');

    const resumenHTML = `
        <h3>Resumen de Cierre de Caja</h3>
        <p class="resumen-item" style="font-weight: bold; color: #800080;"><strong>Usuario:</strong> ${usuarioActual}</p>
        <p class="resumen-item"><strong>Fecha de Cierre:</strong> ${fechaCierre}</p>
        <p class="resumen-item"><strong>Hora de Cierre:</strong> ${horaCierre}</p>
        <p class="resumen-item"><strong>Monto Inicial:</strong> Bs ${montoInicial.toFixed(2)}</p>
        <p class="resumen-item" style="color: green;"><strong>Total Ventas:</strong> +Bs ${totalVentas.toFixed(2)}</p>
        <p class="resumen-item" style="color: red;"><strong>Total Gastos:</strong> -Bs ${totalGastos.toFixed(2)}</p>
        <p class="resumen-item"><strong>Monto Esperado:</strong> Bs ${montoEsperado.toFixed(2)}</p>
        <p class="resumen-item"><strong>Monto Contado:</strong> Bs ${montoFinal.toFixed(2)}</p>
        <div class="total" style="color: ${diferencia === 0 ? '#4CAF50' : '#f44336'};">
            Diferencia (${estadoCaja}): Bs ${diferencia.toFixed(2)}
        </div>

        <div class="detalle-gastos-cierre">
            <h4>Gastos Varios (${gastosDia.length} total)</h4>
            ${detallesGastosHtml || '<p>No hubo gastos.</p>'}
        </div>

        <div class="detalle-pedidos-cierre">
            <h4>Detalle de Pedidos (${pedidosDia.length} total)</h4>
            ${detallesPedidosHtml || '<p>No hubo pedidos.</p>'}
        </div>

        <button onclick="imprimirResumen()"><i class="fas fa-print"></i> Imprimir Resumen</button>
        <button onclick="enviarWhatsApp()"><i class="fab fa-whatsapp"></i> Enviar por WhatsApp</button>
        <button style="background-color:rgb(239, 230, 230) !important;" onclick="cerrarCajaDefinitivo()"><i class="fas fa-lock"></i> Cerrar Caja y Borrar Datos</button>
    `;

    document.getElementById('statusCierre').innerHTML = resumenHTML;
    document.getElementById('statusCierre').style.display = 'block';

    document.getElementById('printArea').innerHTML = `
        <h3 style="text-align: center;">CIERRE DE CAJA - APIS XPRESS</h3>
        <p><strong>Usuario:</strong> ${usuarioActual}</p>
        <p><strong>Fecha de Cierre:</strong> ${fechaCierre}</p>
        <p><strong>Hora de Cierre:</strong> ${horaCierre}</p>
        <p><strong>Monto Inicial:</strong> Bs ${montoInicial.toFixed(2)}</p>
        <p><strong>Total Ventas:</strong> Bs ${totalVentas.toFixed(2)}</p>
        <p><strong>Total Gastos:</strong> Bs ${totalGastos.toFixed(2)}</p>
        <p><strong>Monto Esperado:</strong> Bs ${montoEsperado.toFixed(2)}</p>
        <p><strong>Monto Contado:</strong> Bs ${montoFinal.toFixed(2)}</p>
        <p><strong>Diferencia (${estadoCaja}):</strong> Bs ${diferencia.toFixed(2)}</p>
        <p><strong>Total de Pedidos:</strong> ${pedidosDia.length}</p>
    `;
});

/**
 * Imprime el resumen de cierre.
 */
window.imprimirResumen = function() {
    const printArea = document.getElementById('printArea');
    printArea.style.display = 'block';
    window.print();
    printArea.style.display = 'none';
}

/**
 * Cierra la caja y limpia el estado de localStorage.
 */
window.enviarWhatsApp = function() {
    const fechaCierre = new Date().toLocaleDateString('es-BO');
    const horaCierre = new Date().toLocaleTimeString('es-BO');
    const totalVentas = pedidosDia.reduce((sum, p) => sum + p.total, 0);
    const totalGastos = gastosDia.reduce((sum, g) => sum + g.monto, 0);
    const montoFinal = parseFloat(document.getElementById('montoFinal').value);
    const montoEsperado = montoInicial + totalVentas - totalGastos;
    const diferencia = montoFinal - montoEsperado;
    const estadoCaja = diferencia === 0 ? 'Balanceada' : (diferencia > 0 ? 'Sobrante' : 'Faltante');

    // Crear PDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.text('CIERRE DE CAJA - APIS XPRESS', 20, 20);
    pdf.setFontSize(12);
    let y = 40;
    pdf.text(`Usuario: ${usuarioActual}`, 20, y);
    y += 10;
    pdf.text(`Fecha de Cierre: ${fechaCierre}`, 20, y);
    y += 10;
    pdf.text(`Hora de Cierre: ${horaCierre}`, 20, y);
    y += 10;
    pdf.text(`Monto Inicial: Bs ${montoInicial.toFixed(2)}`, 20, y);
    y += 10;
    pdf.text(`Total Ventas: +Bs ${totalVentas.toFixed(2)}`, 20, y);
    y += 10;
    pdf.text(`Total Gastos: -Bs ${totalGastos.toFixed(2)}`, 20, y);
    y += 10;
    pdf.text(`Monto Esperado: Bs ${montoEsperado.toFixed(2)}`, 20, y);
    y += 10;
    pdf.text(`Monto Contado: Bs ${montoFinal.toFixed(2)}`, 20, y);
    y += 10;
    pdf.text(`Diferencia (${estadoCaja}): Bs ${diferencia.toFixed(2)}`, 20, y);
    y += 10;
    pdf.text(`Total de Pedidos: ${pedidosDia.length}`, 20, y);
    y += 20;

    if (gastosDia.length > 0) {
        pdf.text('Detalle de Gastos:', 20, y);
        y += 10;
        gastosDia.forEach(g => {
            pdf.text(`${g.detalle} - Bs ${g.monto.toFixed(2)}`, 20, y);
            y += 10;
            if (y > 270) {
                pdf.addPage();
                y = 20;
            }
        });
    } else {
        pdf.text('No hubo gastos.', 20, y);
        y += 10;
    }

    y += 10;
    if (pedidosDia.length > 0) {
        pdf.text('Detalle de Pedidos:', 20, y);
        y += 10;
        pedidosDia.forEach(p => {
            pdf.text(`Pedido #${p.id}: ${p.cliente || 'Anónimo'} - Bs ${p.total.toFixed(2)}`, 20, y);
            y += 10;
            if (y > 270) {
                pdf.addPage();
                y = 20;
            }
        });
    } else {
        pdf.text('No hubo pedidos.', 20, y);
    }

    // Generar blob del PDF
    const pdfBlob = pdf.output('blob');
    const file = new File([pdfBlob], 'cierre_caja.pdf', { type: 'application/pdf' });

    // Compartir el archivo
    if (navigator.share) {
        navigator.share({
            title: 'Cierre de Caja - Apis Xpress',
            files: [file]
        }).catch(err => {
            console.error('Error al compartir:', err);
            alert('Error al compartir el PDF. Descárgalo manualmente.');
            // Fallback: descargar
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cierre_caja.pdf';
            a.click();
            URL.revokeObjectURL(url);
        });
    } else {
        // Fallback: descargar y enviar manualmente
        alert('Tu navegador no soporta compartir archivos. El PDF se descargará para que lo envíes manualmente por WhatsApp.');
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cierre_caja.pdf';
        a.click();
        URL.revokeObjectURL(url);
    }
};

window.cerrarCajaDefinitivo = function() {
    const totalVentas = pedidosDia.reduce((sum, p) => sum + p.total, 0);
    const totalGastos = gastosDia.reduce((sum, g) => sum + g.monto, 0);
    const montoEsperado = montoInicial + totalVentas - totalGastos;
    const diferencia = document.getElementById('montoFinal').valueAsNumber - montoEsperado;

    if (diferencia !== 0) {
        alert('No se puede cerrar la caja porque hay una diferencia en el monto. La diferencia debe ser 0.');
        return;
    }

    if (confirm('¡ATENCIÓN! ¿Está seguro de que desea CERRAR LA CAJA y borrar todos los datos del día?')) {
        // Registrar hora de fin y guardar la sesión final
        currentSessionEnd = new Date().toISOString();
        // Guardar la sesión final con metadata
        saveSession();

        // Mantener un índice de sesiones para listar (sessions_index)
        try {
            const idxRaw = localStorage.getItem('sessions_index');
            const idx = idxRaw ? JSON.parse(idxRaw) : [];
            // calcular totales
            const totalVentas = pedidosDia.reduce((sum, p) => sum + p.total, 0);
            const totalGastos = gastosDia.reduce((sum, g) => sum + g.monto, 0);
            idx.push({
                key: currentSessionKey,
                usuario: usuarioActual,
                start: currentSessionStart,
                end: currentSessionEnd,
                totalVentas,
                totalGastos,
                pedidos: pedidosDia.length
            });
            localStorage.setItem('sessions_index', JSON.stringify(idx));
        } catch (e) {
            console.error('Error actualizando sessions_index', e);
        }

        limpiarEstado();
        // Reset metadata
        currentSessionKey = null;
        currentSessionStart = null;
        currentSessionEnd = null;

        alert('Caja cerrada con éxito. Los datos del día han sido borrados y la sesión fue archivada.');
        showTab('inicio');
    }
}

// --- Funciones de UI para sesiones ---
window.exportSession = function() {
    const key = getSessionKey();
    const raw = localStorage.getItem(key);
    const payload = raw ? raw : JSON.stringify({ pedidosDia, gastosDia, historialDeCambios });
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${key}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

window.listSessionsUI = function() {
    const sessions = listSessions();
    if (!sessions || sessions.length === 0) {
        showModal('No hay sesiones archivadas.', { input: false });
        return;
    }

    // Construir un contenido HTML simple para mostrar sesiones en modal
    const modal = document.getElementById('modal');
    const msgEl = document.getElementById('modal-message');
    const inputEl = document.getElementById('modal-input');

    // Usaremos el modal-message para contener una lista interactiva
    msgEl.innerHTML = '';
    const list = document.createElement('div');
    list.style.maxHeight = '300px';
    list.style.overflow = 'auto';
    sessions.forEach(s => {
        const row = document.createElement('div');
        row.style.borderBottom = '1px solid #eee';
        row.style.padding = '8px 0';

        const title = document.createElement('div');
        title.innerHTML = `<strong>${s.key || s.date}</strong> — ${s.usuario || ''}`;
        const times = document.createElement('div');
        times.style.fontSize = '0.9em';
        times.style.color = '#555';
        const start = s.start ? new Date(s.start).toLocaleString() : (s.date || '—');
        const end = s.end ? new Date(s.end).toLocaleString() : 'En progreso';
        times.textContent = `Inicio: ${start} | Fin: ${end} | Pedidos: ${s.pedidos || 'N/A'} | Ventas: Bs ${Number(s.totalVentas || 0).toFixed(2)}`;

        const actions = document.createElement('div');
        actions.style.marginTop = '6px';

        const loadBtn = document.createElement('button');
        loadBtn.type = 'button';
        loadBtn.textContent = 'Cargar';
        loadBtn.addEventListener('click', () => {
            if (s.key) {
                loadSessionFromKey(s.key);
            } else {
                // fallback: try to build key from date
                const k = `session_${s.date}`;
                loadSessionFromKey(k);
            }
            // cerrar modal
            document.getElementById('modal').style.display = 'none';
        });

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.style.backgroundColor = '#f44336';
        delBtn.textContent = 'Eliminar';
        delBtn.addEventListener('click', async () => {
            const pw = await showModal('Ingrese contraseña para eliminar esta sesión:', { input: true });
            if (pw === null) return;
            if (pw !== ADMIN_PASSWORD) {
                showToast('Contraseña incorrecta');
                return;
            }
            // eliminar de storage
            if (s.key) {
                localStorage.removeItem(s.key);
            }
            // también eliminar del índice si existe
            try {
                const idxRaw = localStorage.getItem('sessions_index');
                if (idxRaw) {
                    const idx = JSON.parse(idxRaw).filter(x => x.key !== s.key);
                    localStorage.setItem('sessions_index', JSON.stringify(idx));
                }
            } catch (e) { console.error(e); }
            showToast('Sesión eliminada');
            // refrescar lista
            msgEl.innerHTML = '';
            document.getElementById('modal').style.display = 'none';
            setTimeout(() => window.listSessionsUI(), 300);
        });

        actions.appendChild(loadBtn);
        actions.appendChild(delBtn);

        row.appendChild(title);
        row.appendChild(times);
        row.appendChild(actions);
        list.appendChild(row);
    });

    msgEl.appendChild(list);
    inputEl.style.display = 'none';
    // mostrar modal con botón OK como cerrar
    const okBtn = document.getElementById('modal-ok');
    okBtn.textContent = 'Cerrar';
    document.getElementById('modal').style.display = 'flex';
}

window.importSessionFromFile = function(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            // si el JSON tiene una key top-level, permitir cargarla
            const key = data.key || getSessionKey();
            localStorage.setItem(key, JSON.stringify(data));
            showToast('Sesión importada: ' + key);
        } catch (err) {
            showToast('Error importando archivo: formato inválido');
            console.error(err);
        }
    };
    reader.readAsText(file);
}

function loadSessionFromKey(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    try {
        const s = JSON.parse(raw);
        cajaAbierta = !!s.cajaAbierta;
        usuarioActual = s.usuarioActual || '';
        montoInicial = parseFloat(s.montoInicial) || 0;
        pedidosDia = Array.isArray(s.pedidosDia) ? s.pedidosDia : [];
        historialDeCambios = Array.isArray(s.historialDeCambios) ? s.historialDeCambios : [];
        pedidoCounter = parseInt(s.pedidoCounter) || 0;
        gastosDia = Array.isArray(s.gastosDia) ? s.gastosDia : [];
        carrito = s.carrito || {};
        guardarEstado();
        showToast('Sesión cargada: ' + key);
        return true;
    } catch (e) {
        console.error('Error al cargar sesión por key:', e);
        return false;
    }
}
