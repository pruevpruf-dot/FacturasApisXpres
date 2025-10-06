let cajaAbierta = false;
let montoInicial = 0;
let usuarioActual = "";
let pedidosDia = [];
let historialDeCambios = []; // NUEVA VARIABLE
let carrito = {};
let pedidoCounter = 0;
let gastosDia = [];
const ADMIN_PASSWORD = '123';

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
    localStorage.setItem('cajaAbierta', cajaAbierta.toString());
    localStorage.setItem('usuarioActual', usuarioActual);
    localStorage.setItem('montoInicial', montoInicial.toString());
    localStorage.setItem('pedidosDia', JSON.stringify(pedidosDia));
    localStorage.setItem('historialDeCambios', JSON.stringify(historialDeCambios)); // Guardar Cambios
    localStorage.setItem('pedidoCounter', pedidoCounter.toString());
    localStorage.setItem('gastosDia', JSON.stringify(gastosDia));
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
        id: ++pedidoCounter,
        total: totalPedido,
        cliente: cliente,
        usuario: usuarioActual,
        fecha: new Date().toLocaleString('es-BO'),
        detalles: detallesPedido
    };

    pedidosDia.push(nuevoPedido);
    guardarEstado();

    let detallesHTML = detallesPedido.map(d =>
        `<p>${d.cantidad}x ${d.producto} (Bs ${d.precioUnitario.toFixed(2)} c/u) = Bs ${d.subtotal.toFixed(2)}</p>`
    ).join('');

    document.getElementById('facturaUsuario').innerHTML = usuarioActual;
    document.getElementById('facturaCliente').innerHTML = `Cliente: ${cliente}`;
    document.getElementById('facturaDetalles').innerHTML = detallesHTML;
    document.getElementById('facturaTotal').innerHTML = `<strong>Total: Bs ${totalPedido.toFixed(2)}</strong>`;
    document.getElementById('facturaFecha').innerHTML = nuevoPedido.fecha;
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
    if (historialDeCambios.length === 0) {
        listaCambiosElem.innerHTML = '<p>No se han registrado modificaciones o eliminaciones de pedidos.</p>';
        return;
    }

    let html = '';
    // Mostrar los cambios más recientes primero
    [...historialDeCambios].reverse().forEach(cambio => {
        const color = cambio.tipo === 'ELIMINACION' ? 'style="border-color: #f44336; color: #f44336;"' : 'style="border-color: #008CBA; color: #008CBA;"';
        
        // Usamos pedido-item con un estilo modificado para el historial de cambios
        html += `
            <div class="pedido-item" ${color}>
                <p><strong>Tipo:</strong> ${cambio.tipo}</p>
                <p><strong>Pedido ID:</strong> ${cambio.pedidoId}</p>
                <p><strong>Fecha/Hora:</strong> ${cambio.fecha}</p>
                <p><strong>Usuario:</strong> ${cambio.usuario}</p>
                <p><strong>Detalle:</strong> ${cambio.detalle}</p>
            </div>
        `;
    });

    listaCambiosElem.innerHTML = html;
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
    if (pedidosDia.length === 0) {
        listaPedidosElem.innerHTML = '<p>No se han registrado pedidos en esta caja.</p>';
        return;
    }

    let html = '';
    pedidosDia.forEach(pedido => {
        const detallesHTML = pedido.detalles.map(d =>
            `<li>${d.cantidad}x ${d.producto} (Bs ${d.precioUnitario.toFixed(2)})</li>`
        ).join('');

        html += `
            <div class="pedido-item" id="pedido-${pedido.id}">
                <p><strong>Pedido ID:</strong> ${pedido.id}</p>
                <p><strong>Cliente:</strong> <span id="cliente-display-${pedido.id}">${pedido.cliente}</span></p>
                <p><strong>Atendido por:</strong> ${pedido.usuario}</p>
                <p><strong>Fecha/Hora:</strong> ${pedido.fecha}</p>
                <p><strong>Total:</strong> <span class="total">Bs ${pedido.total.toFixed(2)}</span></p>
                <p><strong>Detalles:</strong></p>
                <ul>${detallesHTML}</ul>
                <div id="edit-form-${pedido.id}" style="display:none; margin-top: 10px;"></div>
                <div class="actions">
                    <button class="edit-button" onclick="iniciarEdicionPedido(${pedido.id})"><i class="fas fa-pencil-alt"></i> Editar Cliente</button>
                    <button style="background-color: #f44336 !important;" onclick="eliminarPedido(${pedido.id})"><i class="fas fa-trash-alt"></i> Eliminar</button>
                </div>
            </div>
        `;
    });

    listaPedidosElem.innerHTML = html;
}

/**
 * Elimina un pedido y registra el cambio.
 * @param {number} pedidoId - El ID (timestamp) del pedido a eliminar.
 */
window.eliminarPedido = function(pedidoId) {
    let password = prompt('Ingrese la contraseña para eliminar el pedido:');
    if (password !== '1234') {
        alert('Contraseña incorrecta.');
        return;
    }

    if (!confirm(`¿Está seguro de que desea ELIMINAR el pedido con ID ${pedidoId}? Esta acción es irreversible y afectará el cálculo del cierre de caja.`)) {
        return;
    }

    const index = pedidosDia.findIndex(p => p.id === pedidoId);
    if (index !== -1) {
        const pedidoEliminado = pedidosDia[index];
        pedidosDia.splice(index, 1);
        
        // REGISTRAR CAMBIO
        registrarCambio(
            'ELIMINACION',
            pedidoId,
            `Pedido de Bs ${pedidoEliminado.total.toFixed(2)} para "${pedidoEliminado.cliente}" eliminado. Venta total disminuida.`
        );

        guardarEstado();
        alert(`✅ Pedido ID ${pedidoId} eliminado con éxito.`);
        cargarHistorial();
    } else {
        alert(`❌ Error: No se encontró el pedido con ID ${pedidoId}.`);
    }
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

    formContainer.innerHTML = `
        <label for="nuevoCliente-${pedidoId}">Nuevo Cliente:</label>
        <input type="text" id="nuevoCliente-${pedidoId}" value="${pedido.cliente}" placeholder="Nombre del cliente" required>
        <button onclick="guardarEdicionPedido(${pedidoId}, document.getElementById('nuevoCliente-${pedidoId}').value, '${pedido.cliente}')">Guardar</button>
        <button style="background-color: #6c757d !important;" onclick="cancelarEdicionPedido(${pedidoId})">Cancelar</button>
    `;
    document.getElementById(`nuevoCliente-${pedidoId}`).focus();
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
        limpiarEstado();
        alert('Caja cerrada con éxito. Los datos del día han sido borrados.');
        showTab('inicio');
    }
}
