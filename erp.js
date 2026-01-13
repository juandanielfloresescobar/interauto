// ==========================================
// ERP DATA ENTRY - GRUPO SAA
// Con Supabase Auth
// ==========================================

// ==========================================
// 1. CONFIGURACIÓN SUPABASE
// ==========================================
const SUPABASE_URL = 'https://zzelbikylbbxclnskgkf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6ZWxiaWt5bGJieGNsbnNrZ2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MjA4NDMsImV4cCI6MjA4MTQ5Njg0M30.VGqblbw-vjQWUTpz8Xdhk5MNLyNniXvAO9moMWVAd8s';

// Cliente principal para Auth
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Cliente para esquema STAGING
const supabaseStaging = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'staging' },
});

// ==========================================
// 2. MAPEO DE USUARIOS A TIPO
// ==========================================
const USER_ROLES = {
  'rentacar@groupsaa.com': { tipo: 'rentacar', nombre: 'Rent a Car Admin', badge: 'RENT A CAR' },
  'interauto@groupsaa.com': { tipo: 'interauto', nombre: 'Interauto Admin', badge: 'INTERAUTO' }
};

// ==========================================
// 3. ESTADO DE LA APLICACIÓN
// ==========================================
let estado = {
  usuario: null,
  tipoUsuario: null,
  tabActiva: null,
  notificaciones: [],
  formPendiente: null,
  tablaPendiente: null,
  tipoRegistroPendiente: null
};

// ==========================================
// 4. ELEMENTOS DEL DOM
// ==========================================
const elementos = {};

// ==========================================
// 5. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  inicializarElementos();
  cargarNotificaciones();
  inicializarEventos();
  verificarSesion();
});

function inicializarElementos() {
  // Login
  elementos.loginSection = document.getElementById('login-section');
  elementos.loginForm = document.getElementById('login-form');
  elementos.loginError = document.getElementById('login-error');
  elementos.inputEmail = document.getElementById('email');
  elementos.inputPassword = document.getElementById('password');
  elementos.btnLogin = document.getElementById('btn-login');

  // Dashboard
  elementos.erpDashboard = document.getElementById('erp-dashboard');
  elementos.userBadge = document.getElementById('user-badge');
  elementos.welcomeTitle = document.getElementById('welcome-title');
  elementos.welcomeSubtitle = document.getElementById('welcome-subtitle');
  elementos.btnLogout = document.getElementById('btn-logout');

  // Tabs
  elementos.tabsRentacar = document.getElementById('tabs-rentacar');
  elementos.tabsInterauto = document.getElementById('tabs-interauto');

  // Formularios
  elementos.formContainers = {
    'rentacar-ingresos': document.getElementById('form-rentacar-ingresos'),
    'rentacar-cobranzas': document.getElementById('form-rentacar-cobranzas'),
    'interauto-ventas': document.getElementById('form-interauto-ventas'),
    'interauto-ingresos': document.getElementById('form-interauto-ingresos')
  };

  // Forms
  elementos.formRcIngresos = document.getElementById('form-rc-ingresos');
  elementos.formRcCobranzas = document.getElementById('form-rc-cobranzas');
  elementos.formIaVentas = document.getElementById('form-ia-ventas');
  elementos.formIaIngresos = document.getElementById('form-ia-ingresos');

  // Checkbox anticipo
  elementos.checkAnticipo = document.getElementById('check-anticipo');
  elementos.campoAnticipo = document.getElementById('campo-anticipo');

  // Modal confirmación
  elementos.modalConfirm = document.getElementById('modal-confirm');
  elementos.btnCloseConfirm = document.getElementById('btn-close-confirm');
  elementos.btnCancelConfirm = document.getElementById('btn-cancel-confirm');
  elementos.btnConfirmSubmit = document.getElementById('btn-confirm-submit');

  // Notificaciones
  elementos.btnNotifications = document.getElementById('btn-notifications');
  elementos.notificationCount = document.getElementById('notification-count');
  elementos.modalNotifications = document.getElementById('modal-notifications');
  elementos.notificationList = document.getElementById('notification-list');
  elementos.btnCloseModal = document.getElementById('btn-close-modal');
  elementos.btnClearNotifications = document.getElementById('btn-clear-notifications');

  // Toast
  elementos.toastContainer = document.getElementById('toast-container');
}

function inicializarEventos() {
  // Login
  elementos.loginForm.addEventListener('submit', handleLogin);

  // Logout
  elementos.btnLogout.addEventListener('click', handleLogout);

  // Tabs
  document.querySelectorAll('.erp-tab').forEach(tab => {
    tab.addEventListener('click', () => cambiarTab(tab.dataset.tab));
  });

  // Formularios - abrir modal de confirmación
  elementos.formRcIngresos.addEventListener('submit', (e) => abrirConfirmacion(e, 'staging_rentacar_ingresos', 'Ingresos Rent a Car'));
  elementos.formRcCobranzas.addEventListener('submit', (e) => abrirConfirmacion(e, 'staging_rentacar_cobranzas', 'Cuenta por Cobrar'));
  elementos.formIaVentas.addEventListener('submit', (e) => abrirConfirmacion(e, 'staging_interauto_ventas', 'Venta Interauto'));
  elementos.formIaIngresos.addEventListener('submit', (e) => abrirConfirmacion(e, 'staging_interauto_ingresos', 'Ingreso Facturado'));

  // Checkbox anticipo
  if (elementos.checkAnticipo) {
    elementos.checkAnticipo.addEventListener('change', () => {
      elementos.campoAnticipo.classList.toggle('show', elementos.checkAnticipo.checked);
      const inputPendiente = elementos.campoAnticipo.querySelector('input');
      if (elementos.checkAnticipo.checked) {
        inputPendiente.required = true;
      } else {
        inputPendiente.required = false;
        inputPendiente.value = '';
      }
    });
  }

  // Modal confirmación
  elementos.btnCloseConfirm.addEventListener('click', cerrarConfirmacion);
  elementos.btnCancelConfirm.addEventListener('click', cerrarConfirmacion);
  elementos.btnConfirmSubmit.addEventListener('click', confirmarEnvio);
  elementos.modalConfirm.addEventListener('click', (e) => {
    if (e.target === elementos.modalConfirm) cerrarConfirmacion();
  });

  // Notificaciones
  elementos.btnNotifications.addEventListener('click', abrirModalNotificaciones);
  elementos.btnCloseModal.addEventListener('click', cerrarModalNotificaciones);
  elementos.btnClearNotifications.addEventListener('click', limpiarNotificaciones);
  elementos.modalNotifications.addEventListener('click', (e) => {
    if (e.target === elementos.modalNotifications) cerrarModalNotificaciones();
  });

  // Cerrar modales con ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (elementos.modalNotifications.classList.contains('active')) cerrarModalNotificaciones();
      if (elementos.modalConfirm.classList.contains('active')) cerrarConfirmacion();
    }
  });
}

// ==========================================
// 6. AUTENTICACIÓN CON SUPABASE
// ==========================================
async function handleLogin(e) {
  e.preventDefault();

  const email = elementos.inputEmail.value.trim();
  const password = elementos.inputPassword.value;

  // Deshabilitar botón
  elementos.btnLogin.disabled = true;
  elementos.btnLogin.textContent = 'Iniciando...';

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // Verificar si el usuario tiene rol asignado
    const userRole = USER_ROLES[email.toLowerCase()];
    if (!userRole) {
      await supabase.auth.signOut();
      throw new Error('Usuario no autorizado para este sistema');
    }

    // Login exitoso
    estado.usuario = data.user;
    estado.tipoUsuario = userRole.tipo;

    mostrarDashboard(userRole);
    agregarNotificacion('info', `Sesión iniciada como ${userRole.nombre}`);

  } catch (error) {
    console.error('Error de login:', error);
    elementos.loginError.textContent = error.message || 'Credenciales incorrectas';
    elementos.loginError.classList.add('show');
    elementos.inputPassword.value = '';
    setTimeout(() => {
      elementos.loginError.classList.remove('show');
    }, 4000);
  } finally {
    elementos.btnLogin.disabled = false;
    elementos.btnLogin.textContent = 'Iniciar Sesión';
  }
}

async function handleLogout() {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }

  estado.usuario = null;
  estado.tipoUsuario = null;

  // Mostrar login
  elementos.erpDashboard.style.display = 'none';
  elementos.loginSection.style.display = 'flex';

  // Limpiar formularios
  elementos.loginForm.reset();
  limpiarTodosLosFormularios();
}

async function verificarSesion() {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session && session.user) {
      const userRole = USER_ROLES[session.user.email.toLowerCase()];
      if (userRole) {
        estado.usuario = session.user;
        estado.tipoUsuario = userRole.tipo;
        mostrarDashboard(userRole);
        return;
      }
    }
  } catch (error) {
    console.error('Error al verificar sesión:', error);
  }
}

// ==========================================
// 7. DASHBOARD
// ==========================================
function mostrarDashboard(userRole) {
  // Ocultar login, mostrar dashboard
  elementos.loginSection.style.display = 'none';
  elementos.erpDashboard.style.display = 'block';

  // Actualizar header
  elementos.userBadge.textContent = userRole.badge;
  elementos.welcomeTitle.textContent = `Bienvenido, ${userRole.nombre}`;

  // Mostrar tabs correspondientes
  if (userRole.tipo === 'rentacar') {
    elementos.tabsRentacar.style.display = 'flex';
    elementos.tabsInterauto.style.display = 'none';
    elementos.welcomeSubtitle.textContent = 'Portal de ingesta de datos - Rent a Car';
    cambiarTab('rentacar-ingresos');
  } else {
    elementos.tabsRentacar.style.display = 'none';
    elementos.tabsInterauto.style.display = 'flex';
    elementos.welcomeSubtitle.textContent = 'Portal de ingesta de datos - Interauto';
    cambiarTab('interauto-ventas');
  }
}

function cambiarTab(tabId) {
  estado.tabActiva = tabId;

  // Actualizar estado visual de tabs
  document.querySelectorAll('.erp-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });

  // Mostrar formulario correspondiente
  Object.entries(elementos.formContainers).forEach(([id, container]) => {
    if (container) {
      container.classList.toggle('active', id === tabId);
    }
  });

  // Cargar registros correspondientes
  cargarRegistrosSegunTab(tabId);
}

function cargarRegistrosSegunTab(tabId) {
  switch (tabId) {
    case 'rentacar-ingresos':
      cargarRegistros('staging_rentacar_ingresos', 'list-rc-ingresos');
      break;
    case 'rentacar-cobranzas':
      cargarRegistros('staging_rentacar_cobranzas', 'list-rc-cobranzas', true);
      break;
    case 'interauto-ventas':
      cargarRegistros('staging_interauto_ventas', 'list-ia-ventas');
      break;
    case 'interauto-ingresos':
      cargarRegistros('staging_interauto_ingresos', 'list-ia-ingresos');
      break;
  }
}

// ==========================================
// 8. CONFIRMACIÓN ANTES DE ENVIAR
// ==========================================
function abrirConfirmacion(e, tabla, tipoRegistro) {
  e.preventDefault();

  // Validar formulario
  const form = e.target;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  // Guardar datos para envío posterior
  estado.formPendiente = form;
  estado.tablaPendiente = tabla;
  estado.tipoRegistroPendiente = tipoRegistro;

  // Abrir modal
  elementos.modalConfirm.classList.add('active');
}

function cerrarConfirmacion() {
  elementos.modalConfirm.classList.remove('active');
  estado.formPendiente = null;
  estado.tablaPendiente = null;
  estado.tipoRegistroPendiente = null;
}

async function confirmarEnvio() {
  if (!estado.formPendiente) return;

  cerrarConfirmacion();
  await handleSubmit(estado.formPendiente, estado.tablaPendiente, estado.tipoRegistroPendiente);
}

// ==========================================
// 9. MANEJO DE FORMULARIOS
// ==========================================
async function handleSubmit(form, tabla, tipoRegistro) {
  const submitBtn = form.querySelector('.btn-submit');
  const formData = new FormData(form);

  // Deshabilitar botón
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <svg class="spin" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    Guardando...
  `;

  // Construir objeto de datos
  const datos = {};
  formData.forEach((value, key) => {
    // Convertir números
    if (['ingreso_bs', 'ingreso_usd', 'monto_bs', 'monto_usd', 'precio_bs', 'precio_usd', 'utilidad', 'monto_pendiente'].includes(key)) {
      datos[key] = parseFloat(value) || 0;
    } else if (key === 'es_anticipo') {
      datos[key] = value === 'on';
    } else {
      datos[key] = value;
    }
  });

  // Manejar checkbox que no está marcado
  if (!datos.hasOwnProperty('es_anticipo')) {
    datos.es_anticipo = false;
  }

  // Agregar metadatos
  datos.created_at = new Date().toISOString();
  datos.created_by = estado.usuario?.email || 'unknown';
  datos.status = 'pendiente';
  datos.updated_at = new Date().toISOString();

  try {
    const { data, error } = await supabaseStaging
      .from(tabla)
      .insert([datos]);

    if (error) throw error;

    // Éxito
    mostrarToast('success', '¡Registro guardado!', `${tipoRegistro} enviado para validación.`);
    agregarNotificacion('success', `${tipoRegistro} guardado correctamente`);
    form.reset();

    // Restaurar valores por defecto
    const selectAnio = form.querySelector('select[name="anio"]');
    if (selectAnio) selectAnio.value = '2025';

    // Ocultar campo anticipo si existe
    if (elementos.campoAnticipo) {
      elementos.campoAnticipo.classList.remove('show');
    }

    // Recargar lista de registros
    cargarRegistrosSegunTab(estado.tabActiva);

  } catch (error) {
    console.error('Error al guardar:', error);
    mostrarToast('error', 'Error al guardar', error.message || 'Intente nuevamente');
    agregarNotificacion('error', `Error al guardar ${tipoRegistro}: ${error.message}`);
  } finally {
    // Restaurar botón
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/>
      </svg>
      Guardar Registro
    `;
  }
}

function limpiarTodosLosFormularios() {
  [elementos.formRcIngresos, elementos.formRcCobranzas, elementos.formIaVentas, elementos.formIaIngresos]
    .forEach(form => {
      if (form) form.reset();
    });
}

// ==========================================
// 10. CARGAR LISTA DE REGISTROS
// ==========================================
window.cargarRegistros = async function(tabla, containerId, conPago = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '<div class="registros-empty">Cargando registros...</div>';

  try {
    const { data, error } = await supabaseStaging
      .from(tabla)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<div class="registros-empty">No hay registros aún</div>';
      return;
    }

    container.innerHTML = data.map(registro => renderRegistro(registro, tabla, conPago)).join('');

  } catch (error) {
    console.error('Error al cargar registros:', error);
    container.innerHTML = '<div class="registros-empty">Error al cargar registros</div>';
  }
};

function renderRegistro(registro, tabla, conPago) {
  let titulo = '';
  let meta = '';

  // Determinar título y meta según la tabla
  switch (tabla) {
    case 'staging_rentacar_ingresos':
      titulo = registro.nombre_ingreso || `Ingreso ${registro.anio}-${registro.mes}`;
      meta = `Bs ${formatNumber(registro.ingreso_bs)} | $${formatNumber(registro.ingreso_usd)}`;
      break;
    case 'staging_rentacar_cobranzas':
      titulo = registro.cliente || 'Cliente';
      meta = `${registro.locacion} | Bs ${formatNumber(registro.monto_bs)}`;
      break;
    case 'staging_interauto_ventas':
      titulo = `${registro.marca} ${registro.modelo}`;
      meta = `${registro.vendedor} | $${formatNumber(registro.precio_usd)}`;
      break;
    case 'staging_interauto_ingresos':
      titulo = registro.nombre_factura || `Factura ${registro.numero_factura}`;
      meta = `#${registro.numero_factura} | Bs ${formatNumber(registro.monto_bs)}`;
      break;
  }

  const fechaCreacion = formatearFechaCorta(registro.created_at);
  const fechaUpdate = registro.updated_at ? formatearFechaCorta(registro.updated_at) : fechaCreacion;
  const statusClass = registro.pagado ? 'pagado' : registro.status;

  let accionesHTML = '';
  if (conPago && !registro.pagado) {
    accionesHTML = `
      <div class="registro-actions">
        <button class="btn-marcar-pagado" onclick="marcarPagado('${tabla}', ${registro.id})">
          Marcar Pagado
        </button>
      </div>
    `;
  } else if (conPago && registro.pagado) {
    accionesHTML = `
      <div class="registro-actions">
        <span class="btn-marcar-pagado pagado">Pagado</span>
      </div>
    `;
  }

  return `
    <div class="registro-item">
      <div class="registro-info">
        <div class="registro-titulo">${titulo}</div>
        <div class="registro-meta">
          <span>${meta}</span>
          <span>Creado: ${fechaCreacion}</span>
          <span>Actualizado: ${fechaUpdate}</span>
        </div>
      </div>
      <span class="registro-status ${statusClass}">${registro.pagado ? 'Pagado' : registro.status}</span>
      ${accionesHTML}
    </div>
  `;
}

window.marcarPagado = async function(tabla, id) {
  try {
    const { error } = await supabaseStaging
      .from(tabla)
      .update({
        pagado: true,
        updated_at: new Date().toISOString(),
        fecha_pago: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    mostrarToast('success', '¡Actualizado!', 'La deuda ha sido marcada como pagada');
    agregarNotificacion('success', 'Deuda marcada como pagada');

    // Recargar lista
    cargarRegistros(tabla, 'list-rc-cobranzas', true);

  } catch (error) {
    console.error('Error al marcar pagado:', error);
    mostrarToast('error', 'Error', 'No se pudo actualizar el registro');
  }
};

// ==========================================
// 11. SISTEMA DE NOTIFICACIONES
// ==========================================
function cargarNotificaciones() {
  const saved = localStorage.getItem('erp_notifications');
  if (saved) {
    estado.notificaciones = JSON.parse(saved);
    actualizarContadorNotificaciones();
  }
}

function guardarNotificaciones() {
  localStorage.setItem('erp_notifications', JSON.stringify(estado.notificaciones));
}

function agregarNotificacion(tipo, mensaje) {
  const notificacion = {
    id: Date.now(),
    tipo,
    mensaje,
    fecha: new Date().toISOString()
  };

  estado.notificaciones.unshift(notificacion);

  // Limitar a 50 notificaciones
  if (estado.notificaciones.length > 50) {
    estado.notificaciones = estado.notificaciones.slice(0, 50);
  }

  guardarNotificaciones();
  actualizarContadorNotificaciones();
  renderizarNotificaciones();
}

function actualizarContadorNotificaciones() {
  const count = estado.notificaciones.length;
  elementos.notificationCount.textContent = count > 9 ? '9+' : count;
  elementos.notificationCount.classList.toggle('hidden', count === 0);
}

function renderizarNotificaciones() {
  if (estado.notificaciones.length === 0) {
    elementos.notificationList.innerHTML = `
      <div class="notification-empty">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <p>No hay notificaciones</p>
      </div>
    `;
    return;
  }

  elementos.notificationList.innerHTML = estado.notificaciones.map(notif => `
    <div class="notification-item ${notif.tipo}">
      <div class="notification-text">${notif.mensaje}</div>
      <div class="notification-time">${formatearFecha(notif.fecha)}</div>
    </div>
  `).join('');
}

function abrirModalNotificaciones() {
  renderizarNotificaciones();
  elementos.modalNotifications.classList.add('active');
}

function cerrarModalNotificaciones() {
  elementos.modalNotifications.classList.remove('active');
}

function limpiarNotificaciones() {
  estado.notificaciones = [];
  guardarNotificaciones();
  actualizarContadorNotificaciones();
  renderizarNotificaciones();
  mostrarToast('success', 'Notificaciones limpiadas', 'Se han eliminado todas las notificaciones');
}

// ==========================================
// 12. SISTEMA DE TOASTS
// ==========================================
function mostrarToast(tipo, titulo, mensaje) {
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;

  const iconoSVG = tipo === 'success'
    ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

  toast.innerHTML = `
    <div class="toast-icon">${iconoSVG}</div>
    <div class="toast-content">
      <div class="toast-title">${titulo}</div>
      <div class="toast-message">${mensaje}</div>
    </div>
  `;

  elementos.toastContainer.appendChild(toast);

  // Auto-eliminar después de 4 segundos
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// ==========================================
// 13. UTILIDADES
// ==========================================
function formatNumber(num) {
  if (!num) return '0';
  return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

function formatearFecha(fechaISO) {
  const fecha = new Date(fechaISO);
  const ahora = new Date();
  const diff = ahora - fecha;

  // Menos de 1 minuto
  if (diff < 60000) return 'Hace un momento';

  // Menos de 1 hora
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `Hace ${mins} minuto${mins > 1 ? 's' : ''}`;
  }

  // Menos de 24 horas
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
  }

  // Más de 24 horas
  return fecha.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatearFechaCorta(fechaISO) {
  if (!fechaISO) return '-';
  const fecha = new Date(fechaISO);
  return fecha.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

// ==========================================
// 14. ESTILOS DINÁMICOS
// ==========================================
const style = document.createElement('style');
style.textContent = `
  .spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
