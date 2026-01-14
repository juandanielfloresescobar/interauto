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
  'pablo.toro@saavrentacar.com': { tipo: 'rentacar', nombre: 'Rent a Car Admin', badge: 'RENT A CAR', permisos: ['ver', 'crear', 'editar'] },
  'daniela.eguez@groupsaa.com': { tipo: 'interauto', nombre: 'Interauto Admin', badge: 'INTERAUTO', permisos: ['ver', 'crear', 'editar'] },
  'yngrid.numbela@groupsaa.com': { tipo: 'leads', nombre: 'Leads Manager', badge: 'LEADS', permisos: ['ver'] },
  'diego.zapata@groupsaa.com': { tipo: 'ejecutivo_leads', nombre: 'Ejecutivo de Leads', badge: 'EJECUTIVO', permisos: ['ver', 'crear', 'editar'] },
  'juan.flores@groupsaa.com': { tipo: 'jetour', nombre: 'Stock Jetour', badge: 'JETOUR', permisos: ['ver', 'crear', 'editar'] },
  'german.decebal@groupsaa.com': { tipo: 'leads', nombre: 'Leads Manager', badge: 'LEADS', permisos: ['ver'] }
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
  elementos.tabsLeads = document.getElementById('tabs-leads');
  elementos.tabsJetour = document.getElementById('tabs-jetour');

  // Formularios
  elementos.formContainers = {
    'rentacar-ingresos': document.getElementById('form-rentacar-ingresos'),
    'rentacar-cobranzas': document.getElementById('form-rentacar-cobranzas'),
    'rentacar-flota': document.getElementById('form-rentacar-flota'),
    'interauto-ventas': document.getElementById('form-interauto-ventas'),
    'interauto-ingresos': document.getElementById('form-interauto-ingresos'),
    'leads-registro': document.getElementById('form-leads-registro'),
    'leads-seguimiento': document.getElementById('form-leads-seguimiento'),
    'jetour-stock': document.getElementById('form-jetour-stock'),
    'jetour-dashboard': document.getElementById('form-jetour-dashboard')
  };

  // Forms
  elementos.formRcIngresos = document.getElementById('form-rc-ingresos');
  elementos.formRcCobranzas = document.getElementById('form-rc-cobranzas');
  elementos.formIaVentas = document.getElementById('form-ia-ventas');
  elementos.formIaIngresos = document.getElementById('form-ia-ingresos');
  elementos.formLeadsRegistro = document.getElementById('form-lead-registro');
  elementos.formJetourStock = document.getElementById('form-jetour-nuevo');

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

  // Leads y Jetour forms
  if (elementos.formLeadsRegistro) {
    elementos.formLeadsRegistro.addEventListener('submit', (e) => abrirConfirmacion(e, 'staging_leads', 'Lead'));
  }
  if (elementos.formJetourStock) {
    elementos.formJetourStock.addEventListener('submit', (e) => abrirConfirmacion(e, 'staging_jetour_stock', 'Stock Jetour'));

    // Calcular margen automáticamente
    const precioCosto = elementos.formJetourStock.querySelector('input[name="precio_costo"]');
    const precioVenta = elementos.formJetourStock.querySelector('input[name="precio_venta"]');
    const margenCalculado = document.getElementById('margen-calculado');

    const calcularMargen = () => {
      const costo = parseFloat(precioCosto.value) || 0;
      const venta = parseFloat(precioVenta.value) || 0;
      if (costo > 0 && venta > 0) {
        const margen = ((venta - costo) / costo * 100).toFixed(1);
        const utilidad = (venta - costo).toFixed(2);
        margenCalculado.value = `${margen}% ($${utilidad})`;
        margenCalculado.style.color = margen > 0 ? '#22c55e' : '#ef4444';
      } else {
        margenCalculado.value = '--%';
        margenCalculado.style.color = 'rgba(255,255,255,0.5)';
      }
    };

    precioCosto.addEventListener('input', calcularMargen);
    precioVenta.addEventListener('input', calcularMargen);
  }

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

  // Cargar notificaciones específicas del usuario
  cargarNotificaciones();

  // Actualizar header
  elementos.userBadge.textContent = userRole.badge;
  elementos.welcomeTitle.textContent = `Bienvenido, ${userRole.nombre}`;

  // Ocultar todos los tabs primero
  elementos.tabsRentacar.style.display = 'none';
  elementos.tabsInterauto.style.display = 'none';
  if (elementos.tabsLeads) elementos.tabsLeads.style.display = 'none';
  if (elementos.tabsJetour) elementos.tabsJetour.style.display = 'none';

  // Mostrar tabs correspondientes según tipo de usuario
  switch (userRole.tipo) {
    case 'rentacar':
      elementos.tabsRentacar.style.display = 'flex';
      elementos.welcomeSubtitle.textContent = 'Portal de ingesta de datos - Rent a Car';
      cambiarTab('rentacar-ingresos');
      break;
    case 'interauto':
      elementos.tabsInterauto.style.display = 'flex';
      elementos.welcomeSubtitle.textContent = 'Portal de ingesta de datos - Interauto';
      cambiarTab('interauto-ventas');
      break;
    case 'leads':
      // Solo puede ver, no editar
      if (elementos.tabsLeads) elementos.tabsLeads.style.display = 'flex';
      elementos.welcomeSubtitle.textContent = 'Gestión de Leads - Solo Visualización';
      cambiarTab('leads-seguimiento');
      break;
    case 'ejecutivo_leads':
      // Puede ver y editar leads
      if (elementos.tabsLeads) elementos.tabsLeads.style.display = 'flex';
      elementos.welcomeSubtitle.textContent = 'Gestión de Leads Calificados';
      cambiarTab('leads-registro');
      break;
    case 'jetour':
      if (elementos.tabsJetour) elementos.tabsJetour.style.display = 'flex';
      elementos.welcomeSubtitle.textContent = 'Gestión de Stock Jetour';
      cambiarTab('jetour-stock');
      break;
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
    case 'rentacar-flota':
      cargarFlotaMensual();
      break;
    case 'interauto-ventas':
      cargarRegistros('staging_interauto_ventas', 'list-ia-ventas');
      break;
    case 'interauto-ingresos':
      cargarRegistros('staging_interauto_ingresos', 'list-ia-ingresos');
      break;
    case 'leads-registro':
    case 'leads-seguimiento':
      cargarRegistrosLeads();
      break;
    case 'jetour-stock':
      cargarRegistrosStock();
      break;
    case 'jetour-dashboard':
      cargarDashboardJetour();
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
    case 'staging_leads':
      titulo = registro.nombre_cliente || 'Lead';
      meta = `${registro.telefono || '-'} | ${registro.marca_interes || '-'}`;
      break;
    case 'staging_jetour_stock':
      titulo = `${registro.modelo} - ${registro.color || 'N/A'}`;
      meta = `VIN: ${registro.vin || '-'} | $${formatNumber(registro.precio_venta)}`;
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
// 11. SISTEMA DE NOTIFICACIONES (por tipo de usuario)
// ==========================================
function getNotificationKey() {
  return `erp_notifications_${estado.tipoUsuario || 'general'}`;
}

function cargarNotificaciones() {
  const key = getNotificationKey();
  const saved = localStorage.getItem(key);
  if (saved) {
    estado.notificaciones = JSON.parse(saved);
    actualizarContadorNotificaciones();
  } else {
    estado.notificaciones = [];
  }
}

function guardarNotificaciones() {
  const key = getNotificationKey();
  localStorage.setItem(key, JSON.stringify(estado.notificaciones));
}

function agregarNotificacion(tipo, mensaje) {
  const notificacion = {
    id: Date.now(),
    tipo,
    mensaje,
    fecha: new Date().toISOString(),
    seccion: estado.tipoUsuario
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
// 14. FUNCIONES LEADS
// ==========================================
async function cargarRegistrosLeads() {
  const container = document.getElementById('list-leads');
  if (!container) return;

  container.innerHTML = '<div class="registros-empty">Cargando leads...</div>';

  try {
    const { data, error } = await supabaseStaging
      .from('staging_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<div class="registros-empty">No hay leads registrados</div>';
      return;
    }

    container.innerHTML = data.map(lead => renderLead(lead)).join('');

  } catch (error) {
    console.error('Error al cargar leads:', error);
    container.innerHTML = '<div class="registros-empty">Error al cargar leads</div>';
  }
}

function renderLead(lead) {
  const statusColors = {
    'pendiente_llamada': { bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', label: 'Pendiente Llamada' },
    'contactado': { bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', label: 'Contactado' },
    'insistir': { bg: 'rgba(249, 115, 22, 0.2)', color: '#f97316', label: 'Insistir' },
    'en_proceso': { bg: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6', label: 'En Proceso' },
    'cotizacion_enviada': { bg: 'rgba(14, 165, 233, 0.2)', color: '#0ea5e9', label: 'Cotización Enviada' },
    'negociacion': { bg: 'rgba(236, 72, 153, 0.2)', color: '#ec4899', label: 'Negociación' },
    'cerrado_ganado': { bg: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', label: 'Cerrado Ganado' },
    'cerrado_perdido': { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', label: 'Cerrado Perdido' },
    'no_interesado': { bg: 'rgba(107, 114, 128, 0.2)', color: '#6b7280', label: 'No Interesado' },
    'no_contesta': { bg: 'rgba(156, 163, 175, 0.2)', color: '#9ca3af', label: 'No Contesta' }
  };

  const statusInfo = statusColors[lead.estado_lead] || statusColors['pendiente_llamada'];
  const fechaCreacion = formatearFechaCorta(lead.created_at);
  const fechaUpdate = lead.updated_at ? formatearFecha(lead.updated_at) : '-';
  const puedeEditar = estado.tipoUsuario === 'ejecutivo_leads';
  const ultimoModificador = lead.updated_by ? lead.updated_by.split('@')[0] : '-';

  return `
    <div class="registro-item lead-item">
      <div class="registro-info">
        <div class="registro-titulo">${lead.nombre_cliente || 'Sin nombre'}</div>
        <div class="registro-meta">
          <span>${lead.telefono || '-'}</span>
          <span>${lead.email || '-'}</span>
          <span>${lead.marca_interes || '-'} ${lead.modelo_interes || ''}</span>
        </div>
        <div class="registro-meta">
          <span>Ejecutivo: <strong>${lead.ejecutivo_derivado || '-'}</strong></span>
          <span>Creado: ${fechaCreacion}</span>
        </div>
        <div class="registro-meta lead-historial">
          <span>Últ. modificación: ${fechaUpdate}</span>
          <span>Por: <strong>${ultimoModificador}</strong></span>
        </div>
        ${lead.notas ? `<div class="lead-notas">${lead.notas}</div>` : ''}
      </div>
      <div class="lead-actions">
        ${puedeEditar ? `
          <select class="lead-status-select" onchange="actualizarEstadoLead(${lead.id}, this.value)" style="background: ${statusInfo.bg}; color: ${statusInfo.color}; border-color: ${statusInfo.color};">
            <option value="pendiente_llamada" ${lead.estado_lead === 'pendiente_llamada' ? 'selected' : ''}>Pendiente Llamada</option>
            <option value="contactado" ${lead.estado_lead === 'contactado' ? 'selected' : ''}>Contactado</option>
            <option value="insistir" ${lead.estado_lead === 'insistir' ? 'selected' : ''}>Insistir</option>
            <option value="en_proceso" ${lead.estado_lead === 'en_proceso' ? 'selected' : ''}>En Proceso</option>
            <option value="cotizacion_enviada" ${lead.estado_lead === 'cotizacion_enviada' ? 'selected' : ''}>Cotización Enviada</option>
            <option value="negociacion" ${lead.estado_lead === 'negociacion' ? 'selected' : ''}>Negociación</option>
            <option value="cerrado_ganado" ${lead.estado_lead === 'cerrado_ganado' ? 'selected' : ''}>Cerrado Ganado</option>
            <option value="cerrado_perdido" ${lead.estado_lead === 'cerrado_perdido' ? 'selected' : ''}>Cerrado Perdido</option>
            <option value="no_interesado" ${lead.estado_lead === 'no_interesado' ? 'selected' : ''}>No Interesado</option>
            <option value="no_contesta" ${lead.estado_lead === 'no_contesta' ? 'selected' : ''}>No Contesta</option>
          </select>
          <button class="btn-ver-historial" onclick="verHistorialLead(${lead.id})" title="Ver historial">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </button>
        ` : `
          <span class="lead-status-badge" style="background: ${statusInfo.bg}; color: ${statusInfo.color};">${statusInfo.label}</span>
        `}
      </div>
    </div>
  `;
}

window.actualizarEstadoLead = async function(id, nuevoEstado) {
  // Verificar permisos
  if (estado.tipoUsuario !== 'ejecutivo_leads') {
    mostrarToast('error', 'Sin permisos', 'No tienes permisos para modificar leads');
    return;
  }

  try {
    // Primero obtener el estado actual para el historial
    const { data: leadActual } = await supabaseStaging
      .from('staging_leads')
      .select('estado_lead')
      .eq('id', id)
      .single();

    const estadoAnterior = leadActual?.estado_lead || 'desconocido';

    // Actualizar el lead
    const { error } = await supabaseStaging
      .from('staging_leads')
      .update({
        estado_lead: nuevoEstado,
        updated_at: new Date().toISOString(),
        updated_by: estado.usuario?.email || 'unknown'
      })
      .eq('id', id);

    if (error) throw error;

    // Registrar en historial
    await supabaseStaging
      .from('staging_leads_historial')
      .insert({
        lead_id: id,
        estado_anterior: estadoAnterior,
        estado_nuevo: nuevoEstado,
        modificado_por: estado.usuario?.email || 'unknown',
        fecha_modificacion: new Date().toISOString()
      });

    mostrarToast('success', '¡Actualizado!', 'Estado del lead actualizado');
    agregarNotificacion('success', `Estado del lead actualizado a: ${nuevoEstado}`);
    cargarRegistrosLeads();

  } catch (error) {
    console.error('Error al actualizar lead:', error);
    mostrarToast('error', 'Error', 'No se pudo actualizar el lead');
    cargarRegistrosLeads();
  }
};

window.verHistorialLead = async function(id) {
  try {
    const { data, error } = await supabaseStaging
      .from('staging_leads_historial')
      .select('*')
      .eq('lead_id', id)
      .order('fecha_modificacion', { ascending: false })
      .limit(20);

    if (error) throw error;

    let contenido = '<div class="historial-lista">';
    if (!data || data.length === 0) {
      contenido += '<p class="historial-vacio">No hay historial de modificaciones</p>';
    } else {
      data.forEach(h => {
        const fecha = new Date(h.fecha_modificacion).toLocaleString('es-ES');
        const usuario = h.modificado_por ? h.modificado_por.split('@')[0] : 'Sistema';
        contenido += `
          <div class="historial-item">
            <div class="historial-cambio">
              <span class="estado-anterior">${h.estado_anterior}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              <span class="estado-nuevo">${h.estado_nuevo}</span>
            </div>
            <div class="historial-meta">
              <span>${fecha}</span>
              <span>Por: <strong>${usuario}</strong></span>
            </div>
          </div>
        `;
      });
    }
    contenido += '</div>';

    mostrarModalHistorial('Historial del Lead', contenido);

  } catch (error) {
    console.error('Error al cargar historial:', error);
    mostrarToast('error', 'Error', 'No se pudo cargar el historial');
  }
};

function mostrarModalHistorial(titulo, contenido) {
  // Crear modal dinámico
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.id = 'modal-historial';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${titulo}</h3>
        <button class="modal-close" onclick="cerrarModalHistorial()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        ${contenido}
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrarModalHistorial();
  });
}

window.cerrarModalHistorial = function() {
  const modal = document.getElementById('modal-historial');
  if (modal) modal.remove();
};

// ==========================================
// 15. FUNCIONES STOCK JETOUR
// ==========================================
async function cargarRegistrosStock() {
  const container = document.getElementById('list-jetour-stock');
  if (!container) return;

  container.innerHTML = '<div class="registros-empty">Cargando stock...</div>';

  try {
    const { data, error } = await supabaseStaging
      .from('staging_jetour_stock')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<div class="registros-empty">No hay vehículos en stock</div>';
      return;
    }

    container.innerHTML = data.map(item => renderStockItem(item)).join('');

  } catch (error) {
    console.error('Error al cargar stock:', error);
    container.innerHTML = '<div class="registros-empty">Error al cargar stock</div>';
  }
}

function renderStockItem(item) {
  const statusColors = {
    'disponible': { bg: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' },
    'reservado': { bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' },
    'vendido': { bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' },
    'en_transito': { bg: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6' }
  };

  const statusInfo = statusColors[item.estado] || statusColors['disponible'];
  const margen = item.precio_venta && item.precio_costo ?
    ((item.precio_venta - item.precio_costo) / item.precio_costo * 100).toFixed(1) : 0;
  const utilidad = item.precio_venta && item.precio_costo ?
    (item.precio_venta - item.precio_costo) : 0;

  // Calcular días retenido
  const fechaIngreso = new Date(item.created_at);
  const fechaHoy = item.fecha_venta ? new Date(item.fecha_venta) : new Date();
  const diasRetenido = Math.floor((fechaHoy - fechaIngreso) / (1000 * 60 * 60 * 24));

  // Tipo de precio
  const tipoPrecio = item.tipo_precio === 'cif_porcentaje' ? `CIF + ${item.porcentaje_cif || 0}%` : 'Precio Fijo';

  return `
    <div class="stock-item">
      <div class="stock-header">
        <div class="stock-modelo">${item.modelo || 'N/A'}</div>
        <span class="registro-status" style="background: ${statusInfo.bg}; color: ${statusInfo.color};">${item.estado || 'disponible'}</span>
      </div>
      <div class="stock-details">
        <div class="stock-detail"><span>VIN:</span> ${item.vin || '-'}</div>
        <div class="stock-detail"><span>Color:</span> ${item.color || '-'}</div>
        <div class="stock-detail"><span>Año:</span> ${item.anio || '-'}</div>
        <div class="stock-detail"><span>Ubicación:</span> ${item.ubicacion || '-'}</div>
        <div class="stock-detail"><span>Días en stock:</span> <strong class="${diasRetenido > 60 ? 'texto-alerta' : ''}">${diasRetenido}</strong></div>
        <div class="stock-detail"><span>Tipo precio:</span> ${tipoPrecio}</div>
      </div>
      ${item.estado === 'vendido' ? `
        <div class="stock-venta-info">
          <div class="venta-cliente"><span>Vendido a:</span> ${item.vendido_a || '-'}</div>
          <div class="venta-fecha"><span>Fecha:</span> ${item.fecha_venta ? formatearFechaCorta(item.fecha_venta) : '-'}</div>
        </div>
      ` : ''}
      <div class="stock-precios">
        <div class="stock-precio">
          <span class="precio-label">Costo</span>
          <span class="precio-valor">$${formatNumber(item.precio_costo)}</span>
        </div>
        <div class="stock-precio">
          <span class="precio-label">Venta</span>
          <span class="precio-valor precio-venta">$${formatNumber(item.precio_venta)}</span>
        </div>
        <div class="stock-precio">
          <span class="precio-label">Utilidad</span>
          <span class="precio-valor ${utilidad > 0 ? 'positivo' : 'negativo'}">$${formatNumber(utilidad)}</span>
        </div>
        <div class="stock-precio">
          <span class="precio-label">Margen</span>
          <span class="precio-valor ${margen > 0 ? 'positivo' : 'negativo'}">${margen}%</span>
        </div>
      </div>
      <div class="stock-actions">
        <select class="stock-status-select" onchange="actualizarEstadoStock(${item.id}, this.value)">
          <option value="disponible" ${item.estado === 'disponible' ? 'selected' : ''}>Disponible</option>
          <option value="reservado" ${item.estado === 'reservado' ? 'selected' : ''}>Reservado</option>
          <option value="en_transito" ${item.estado === 'en_transito' ? 'selected' : ''}>En Tránsito</option>
          <option value="vendido" ${item.estado === 'vendido' ? 'selected' : ''}>Vendido</option>
        </select>
        <button class="btn-ver-historial" onclick="verHistorialStock(${item.id})" title="Ver historial">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </button>
      </div>
    </div>
  `;
}

window.actualizarEstadoStock = async function(id, nuevoEstado) {
  try {
    // Obtener estado actual para historial
    const { data: stockActual } = await supabaseStaging
      .from('staging_jetour_stock')
      .select('estado')
      .eq('id', id)
      .single();

    const estadoAnterior = stockActual?.estado || 'desconocido';

    // Si se marca como vendido, pedir datos del comprador
    let datosVenta = {};
    if (nuevoEstado === 'vendido') {
      const nombreComprador = prompt('Nombre del comprador:');
      if (nombreComprador) {
        datosVenta = {
          vendido_a: nombreComprador,
          fecha_venta: new Date().toISOString()
        };
      }
    }

    const { error } = await supabaseStaging
      .from('staging_jetour_stock')
      .update({
        estado: nuevoEstado,
        updated_at: new Date().toISOString(),
        updated_by: estado.usuario?.email || 'unknown',
        ...datosVenta
      })
      .eq('id', id);

    if (error) throw error;

    // Registrar en historial
    await supabaseStaging
      .from('staging_stock_historial')
      .insert({
        stock_id: id,
        estado_anterior: estadoAnterior,
        estado_nuevo: nuevoEstado,
        modificado_por: estado.usuario?.email || 'unknown',
        fecha_modificacion: new Date().toISOString(),
        detalle: datosVenta.vendido_a ? `Vendido a: ${datosVenta.vendido_a}` : null
      });

    mostrarToast('success', '¡Actualizado!', 'Estado del vehículo actualizado');
    cargarRegistrosStock();
    cargarDashboardJetour();

  } catch (error) {
    console.error('Error al actualizar stock:', error);
    mostrarToast('error', 'Error', 'No se pudo actualizar el vehículo');
  }
};

window.verHistorialStock = async function(id) {
  try {
    const { data, error } = await supabaseStaging
      .from('staging_stock_historial')
      .select('*')
      .eq('stock_id', id)
      .order('fecha_modificacion', { ascending: false })
      .limit(20);

    if (error) throw error;

    let contenido = '<div class="historial-lista">';
    if (!data || data.length === 0) {
      contenido += '<p class="historial-vacio">No hay historial de modificaciones</p>';
    } else {
      data.forEach(h => {
        const fecha = new Date(h.fecha_modificacion).toLocaleString('es-ES');
        const usuario = h.modificado_por ? h.modificado_por.split('@')[0] : 'Sistema';
        contenido += `
          <div class="historial-item">
            <div class="historial-cambio">
              <span class="estado-anterior">${h.estado_anterior}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              <span class="estado-nuevo">${h.estado_nuevo}</span>
            </div>
            ${h.detalle ? `<div class="historial-detalle">${h.detalle}</div>` : ''}
            <div class="historial-meta">
              <span>${fecha}</span>
              <span>Por: <strong>${usuario}</strong></span>
            </div>
          </div>
        `;
      });
    }
    contenido += '</div>';

    mostrarModalHistorial('Historial del Vehículo', contenido);

  } catch (error) {
    console.error('Error al cargar historial:', error);
    mostrarToast('error', 'Error', 'No se pudo cargar el historial');
  }
};

// ==========================================
// 16. DASHBOARD JETOUR
// ==========================================
async function cargarDashboardJetour() {
  const dashboardContainer = document.getElementById('jetour-dashboard-content');
  if (!dashboardContainer) return;

  try {
    const { data, error } = await supabaseStaging
      .from('staging_jetour_stock')
      .select('*');

    if (error) throw error;

    const stats = calcularEstadisticasStock(data || []);
    renderDashboard(dashboardContainer, stats);

  } catch (error) {
    console.error('Error al cargar dashboard:', error);
    dashboardContainer.innerHTML = '<div class="registros-empty">Error al cargar datos</div>';
  }
}

function calcularEstadisticasStock(data) {
  const stats = {
    total: data.length,
    disponibles: data.filter(d => d.estado === 'disponible').length,
    reservados: data.filter(d => d.estado === 'reservado').length,
    vendidos: data.filter(d => d.estado === 'vendido').length,
    enTransito: data.filter(d => d.estado === 'en_transito').length,
    valorTotalCosto: data.reduce((sum, d) => sum + (parseFloat(d.precio_costo) || 0), 0),
    valorTotalVenta: data.reduce((sum, d) => sum + (parseFloat(d.precio_venta) || 0), 0),
    utilidadPotencial: 0,
    margenPromedio: 0,
    porModelo: {},
    porUbicacion: {},
    porColor: {}
  };

  // Calcular utilidad potencial (solo disponibles)
  const disponibles = data.filter(d => d.estado === 'disponible');
  stats.utilidadPotencial = disponibles.reduce((sum, d) => {
    return sum + ((parseFloat(d.precio_venta) || 0) - (parseFloat(d.precio_costo) || 0));
  }, 0);

  // Margen promedio
  if (data.length > 0) {
    const margenes = data.map(d => {
      if (d.precio_costo && d.precio_venta) {
        return ((d.precio_venta - d.precio_costo) / d.precio_costo) * 100;
      }
      return 0;
    });
    stats.margenPromedio = margenes.reduce((a, b) => a + b, 0) / margenes.length;
  }

  // Agrupar por modelo
  data.forEach(d => {
    const modelo = d.modelo || 'Sin modelo';
    stats.porModelo[modelo] = (stats.porModelo[modelo] || 0) + 1;
  });

  // Agrupar por ubicación
  data.forEach(d => {
    const ubicacion = d.ubicacion || 'Sin ubicación';
    stats.porUbicacion[ubicacion] = (stats.porUbicacion[ubicacion] || 0) + 1;
  });

  // Agrupar por color
  data.forEach(d => {
    const color = d.color || 'Sin color';
    stats.porColor[color] = (stats.porColor[color] || 0) + 1;
  });

  return stats;
}

function renderDashboard(container, stats) {
  container.innerHTML = `
    <div class="dashboard-grid">
      <!-- KPIs principales -->
      <div class="dashboard-kpi">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-value">${stats.total}</span>
          <span class="kpi-label">Total Vehículos</span>
        </div>
      </div>

      <div class="dashboard-kpi">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #22c55e, #16a34a);">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-value">${stats.disponibles}</span>
          <span class="kpi-label">Disponibles</span>
        </div>
      </div>

      <div class="dashboard-kpi">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-value">${stats.reservados}</span>
          <span class="kpi-label">Reservados</span>
        </div>
      </div>

      <div class="dashboard-kpi">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-value">${stats.enTransito}</span>
          <span class="kpi-label">En Tránsito</span>
        </div>
      </div>

      <!-- KPIs financieros -->
      <div class="dashboard-kpi wide">
        <div class="kpi-icon" style="background: linear-gradient(135deg, var(--primary), var(--accent));">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-value">$${formatNumber(stats.valorTotalCosto)}</span>
          <span class="kpi-label">Valor Costo Total</span>
        </div>
      </div>

      <div class="dashboard-kpi wide">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-value">$${formatNumber(stats.valorTotalVenta)}</span>
          <span class="kpi-label">Valor Venta Total</span>
        </div>
      </div>

      <div class="dashboard-kpi">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #06b6d4, #0891b2);">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-value">$${formatNumber(stats.utilidadPotencial)}</span>
          <span class="kpi-label">Utilidad Potencial</span>
        </div>
      </div>

      <div class="dashboard-kpi">
        <div class="kpi-icon" style="background: linear-gradient(135deg, #ec4899, #db2777);">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-value">${stats.margenPromedio.toFixed(1)}%</span>
          <span class="kpi-label">Margen Promedio</span>
        </div>
      </div>
    </div>

    <!-- Distribución por modelo -->
    <div class="dashboard-section">
      <h3 class="dashboard-section-title">Distribución por Modelo</h3>
      <div class="distribution-bars">
        ${Object.entries(stats.porModelo).map(([modelo, count]) => `
          <div class="distribution-bar-item">
            <span class="bar-label">${modelo}</span>
            <div class="bar-container">
              <div class="bar-fill" style="width: ${(count / stats.total * 100)}%;"></div>
            </div>
            <span class="bar-value">${count}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Distribución por ubicación -->
    <div class="dashboard-section">
      <h3 class="dashboard-section-title">Distribución por Ubicación</h3>
      <div class="distribution-bars">
        ${Object.entries(stats.porUbicacion).map(([ubicacion, count]) => `
          <div class="distribution-bar-item">
            <span class="bar-label">${ubicacion}</span>
            <div class="bar-container">
              <div class="bar-fill ubicacion" style="width: ${(count / stats.total * 100)}%;"></div>
            </div>
            <span class="bar-value">${count}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ==========================================
// 17. FLOTA MENSUAL RENT A CAR
// ==========================================
async function cargarFlotaMensual() {
  const container = document.getElementById('list-flota-mensual');
  if (!container) return;

  container.innerHTML = '<div class="registros-empty">Cargando flota...</div>';

  try {
    const { data, error } = await supabaseStaging
      .from('staging_rentacar_flota')
      .select('*')
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })
      .limit(12);

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<div class="registros-empty">No hay registros de flota</div>';
      return;
    }

    container.innerHTML = data.map(item => renderFlotaMensual(item)).join('');

  } catch (error) {
    console.error('Error al cargar flota:', error);
    container.innerHTML = '<div class="registros-empty">Error al cargar flota</div>';
  }
}

function renderFlotaMensual(item) {
  const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mesNombre = meses[parseInt(item.mes)] || item.mes;

  return `
    <div class="flota-item">
      <div class="flota-header">
        <span class="flota-periodo">${mesNombre} ${item.anio}</span>
        <span class="registro-status ${item.status}">${item.status}</span>
      </div>
      <div class="flota-categorias">
        <div class="flota-cat">
          <span class="cat-label">Vehículos</span>
          <span class="cat-valor">${item.vehiculos || 0}</span>
        </div>
        <div class="flota-cat">
          <span class="cat-label">Camionetas</span>
          <span class="cat-valor">${item.camionetas || 0}</span>
        </div>
        <div class="flota-cat">
          <span class="cat-label">SUV</span>
          <span class="cat-valor">${item.suv || 0}</span>
        </div>
        <div class="flota-cat">
          <span class="cat-label">Full Size</span>
          <span class="cat-valor">${item.fullsize || 0}</span>
        </div>
      </div>
      <div class="flota-total">
        Total: <strong>${(item.vehiculos || 0) + (item.camionetas || 0) + (item.suv || 0) + (item.fullsize || 0)}</strong> unidades
      </div>
    </div>
  `;
}

// ==========================================
// 18. ESTILOS DINÁMICOS
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
