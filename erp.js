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

// Cliente para operaciones de BD (esquema staging)
const supabaseDB = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'staging' }
});

// ==========================================
// 2. MAPEO DE USUARIOS A TIPO Y PERMISOS MULTI-MÓDULO
// ==========================================
const USER_ROLES = {
  'pablo.toro@saavrentacar.com': {
    modulos: ['rentacar'],
    nombre: 'Rent a Car Admin',
    permisos: ['ver', 'crear', 'editar']
  },
  'daniela.eguez@groupsaa.com': {
    modulos: ['interauto', 'leads'],
    nombre: 'Interauto Admin',
    permisos: ['ver', 'crear', 'editar']
  },
  'yngrid.numbela@groupsaa.com': {
    modulos: ['leads'],
    nombre: 'Leads Manager',
    permisos: ['ver']
  },
  'diego.zapata@groupsaa.com': {
    modulos: ['ejecutivo_leads'],
    nombre: 'Ejecutivo de Leads',
    permisos: ['ver', 'crear', 'editar']
  },
  'juan.flores@groupsaa.com': {
    modulos: ['jetour', 'interauto'],
    nombre: 'Stock Jetour',
    permisos: ['ver', 'crear', 'editar']
  },
  'german.decebal@groupsaa.com': {
    modulos: ['leads'],
    nombre: 'Leads Manager',
    permisos: ['ver']
  }
};

// Configuración de módulos disponibles
const MODULOS_CONFIG = {
  rentacar: {
    nombre: 'Rent a Car',
    descripcion: 'Ingresos, cobranzas y flota',
    icono: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`,
    badge: 'RENT A CAR'
  },
  interauto: {
    nombre: 'Interauto',
    descripcion: 'Ventas, facturación y stock',
    icono: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    badge: 'INTERAUTO'
  },
  leads: {
    nombre: 'Leads',
    descripcion: 'Gestión de prospectos',
    icono: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    badge: 'LEADS'
  },
  ejecutivo_leads: {
    nombre: 'Ejecutivo Leads',
    descripcion: 'Gestión avanzada de leads',
    icono: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`,
    badge: 'EJECUTIVO'
  },
  jetour: {
    nombre: 'Stock Jetour',
    descripcion: 'Gestión de inventario Jetour',
    icono: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    badge: 'JETOUR'
  }
};

// ==========================================
// 3. ESTADO DE LA APLICACIÓN
// ==========================================
let estado = {
  usuario: null,
  userRole: null,
  moduloActivo: null,
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

  // Pantalla de selección
  elementos.selectionScreen = document.getElementById('selection-screen');
  elementos.selectionGrid = document.getElementById('selection-grid');
  elementos.selectionTitle = document.getElementById('selection-title');
  elementos.btnLogoutSelection = document.getElementById('btn-logout-selection');

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
    'interauto-stock': document.getElementById('form-interauto-stock'),
    'leads-registro': document.getElementById('form-leads-registro'),
    'leads-seguimiento': document.getElementById('form-leads-seguimiento'),
    'jetour-stock': document.getElementById('form-jetour-stock'),
    'jetour-dashboard': document.getElementById('form-jetour-dashboard')
  };

  // Forms
  elementos.formRcIngresos = document.getElementById('form-rc-ingresos');
  elementos.formRcCobranzas = document.getElementById('form-rc-cobranzas');
  elementos.formRcFlota = document.getElementById('form-rc-flota');
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

  // Logout (ambos botones)
  elementos.btnLogout.addEventListener('click', handleLogout);
  if (elementos.btnLogoutSelection) {
    elementos.btnLogoutSelection.addEventListener('click', handleLogout);
  }

  // Tabs
  document.querySelectorAll('.erp-tab').forEach(tab => {
    tab.addEventListener('click', () => cambiarTab(tab.dataset.tab));
  });

  // Formularios - abrir modal de confirmación
  elementos.formRcIngresos.addEventListener('submit', (e) => abrirConfirmacion(e, 'staging_rentacar_ingresos', 'Ingresos Rent a Car'));
  elementos.formRcCobranzas.addEventListener('submit', (e) => abrirConfirmacion(e, 'staging_rentacar_cobranzas', 'Cuenta por Cobrar'));
  if (elementos.formRcFlota) {
    elementos.formRcFlota.addEventListener('submit', (e) => abrirConfirmacion(e, 'staging_rentacar_flota', 'Flota Mensual'));
  }
  elementos.formIaVentas.addEventListener('submit', (e) => abrirConfirmacion(e, 'staging_interauto_ventas', 'Venta Interauto'));
  elementos.formIaIngresos.addEventListener('submit', (e) => abrirConfirmacion(e, 'staging_interauto_ingresos', 'Ingreso Facturado'));

  // Leads y Jetour forms
  if (elementos.formLeadsRegistro) {
    elementos.formLeadsRegistro.addEventListener('submit', (e) => abrirConfirmacion(e, 'staging_leads', 'Lead'));
  }
  if (elementos.formJetourStock) {
    elementos.formJetourStock.addEventListener('submit', (e) => abrirConfirmacion(e, 'staging_jetour_stock', 'Stock Jetour'));

    // Calcular margen automáticamente (Precio CIF vs Cliente Final)
    const precioCIF = elementos.formJetourStock.querySelector('input[name="precio_costo"]');
    const precioClienteFinal = elementos.formJetourStock.querySelector('input[name="precio_cliente_final"]');
    const margenCalculado = document.getElementById('margen-calculado');

    const calcularMargen = () => {
      const cif = parseFloat(precioCIF.value) || 0;
      const venta = parseFloat(precioClienteFinal.value) || 0;
      if (cif > 0 && venta > 0) {
        const margen = ((venta - cif) / cif * 100).toFixed(1);
        const utilidad = (venta - cif).toFixed(2);
        margenCalculado.value = `${margen}% ($${utilidad})`;
        margenCalculado.style.color = margen > 0 ? '#22c55e' : '#ef4444';
      } else {
        margenCalculado.value = '--%';
        margenCalculado.style.color = 'rgba(255,255,255,0.5)';
      }
    };

    precioCIF.addEventListener('input', calcularMargen);
    precioClienteFinal.addEventListener('input', calcularMargen);
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
    estado.userRole = userRole;

    // Si tiene múltiples módulos, mostrar pantalla de selección
    if (userRole.modulos.length > 1) {
      mostrarPantallaSeleccion(userRole);
    } else {
      // Solo un módulo, ir directo
      estado.moduloActivo = userRole.modulos[0];
      mostrarDashboard(userRole.modulos[0]);
    }
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
  estado.userRole = null;
  estado.moduloActivo = null;

  // Ocultar todo y mostrar login
  elementos.erpDashboard.style.display = 'none';
  if (elementos.selectionScreen) elementos.selectionScreen.classList.remove('active');
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
        estado.userRole = userRole;

        // Si tiene múltiples módulos, mostrar selección
        if (userRole.modulos.length > 1) {
          mostrarPantallaSeleccion(userRole);
        } else {
          estado.moduloActivo = userRole.modulos[0];
          mostrarDashboard(userRole.modulos[0]);
        }
        return;
      }
    }
  } catch (error) {
    console.error('Error al verificar sesión:', error);
  }
}

// ==========================================
// 7. PANTALLA DE SELECCIÓN Y DASHBOARD
// ==========================================
function mostrarPantallaSeleccion(userRole) {
  elementos.loginSection.style.display = 'none';
  elementos.erpDashboard.style.display = 'none';
  elementos.selectionScreen.classList.add('active');

  elementos.selectionTitle.textContent = `Bienvenido, ${userRole.nombre}`;

  // Generar tarjetas de módulos disponibles
  elementos.selectionGrid.innerHTML = userRole.modulos.map(modulo => {
    const config = MODULOS_CONFIG[modulo];
    if (!config) return '';
    return `
      <div class="selection-card" onclick="seleccionarModulo('${modulo}')">
        <div class="selection-card-icon">${config.icono}</div>
        <div class="selection-card-title">${config.nombre}</div>
        <div class="selection-card-desc">${config.descripcion}</div>
      </div>
    `;
  }).join('');
}

window.seleccionarModulo = function(modulo) {
  estado.moduloActivo = modulo;
  elementos.selectionScreen.classList.remove('active');
  mostrarDashboard(modulo);
};

function mostrarDashboard(modulo) {
  // Ocultar login y selección, mostrar dashboard
  elementos.loginSection.style.display = 'none';
  if (elementos.selectionScreen) elementos.selectionScreen.classList.remove('active');
  elementos.erpDashboard.style.display = 'block';

  // Cargar notificaciones específicas del usuario
  cargarNotificaciones();

  const config = MODULOS_CONFIG[modulo];
  elementos.userBadge.textContent = config ? config.badge : modulo.toUpperCase();
  elementos.welcomeTitle.textContent = `Bienvenido, ${estado.userRole?.nombre || 'Usuario'}`;

  // Ocultar todos los tabs primero
  elementos.tabsRentacar.style.display = 'none';
  elementos.tabsInterauto.style.display = 'none';
  if (elementos.tabsLeads) elementos.tabsLeads.style.display = 'none';
  if (elementos.tabsJetour) elementos.tabsJetour.style.display = 'none';

  // Mostrar tabs correspondientes según módulo
  switch (modulo) {
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

  // Mostrar indicador de conexión en tiempo real
  setTimeout(() => {
    const indicator = document.getElementById('realtime-indicator');
    if (indicator) {
      indicator.classList.add('show');
    }
  }, 1000);
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
      cargarRegistros('staging_interauto_ventas', 'list-ia-ventas', true);
      break;
    case 'interauto-ingresos':
      cargarRegistros('staging_interauto_ingresos', 'list-ia-ingresos');
      break;
    case 'interauto-stock':
      cargarStockParaInterauto();
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

  // Guardar referencias ANTES de limpiar
  const form = estado.formPendiente;
  const tabla = estado.tablaPendiente;
  const tipoRegistro = estado.tipoRegistroPendiente;

  // Cerrar modal (esto limpia estado.formPendiente)
  cerrarConfirmacion();

  // Usar las referencias guardadas
  await handleSubmit(form, tabla, tipoRegistro);
}

// ==========================================
// 9. MANEJO DE FORMULARIOS
// ==========================================

// Tipo de cambio USD/BS
const TIPO_CAMBIO = 6.96;

async function handleSubmit(form, tabla, tipoRegistro) {
  const submitBtn = form.querySelector('.btn-submit');
  const formData = new FormData(form);

  // Deshabilitar botón y mostrar estado de carga
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  submitBtn.innerHTML = `
    <svg class="spin" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    Guardando...
  `;

  // Campos numéricos decimales
  const camposDecimales = ['ingreso_bs', 'ingreso_usd', 'monto_bs', 'monto_usd', 'precio_bs', 'precio_usd', 'precio_costo', 'precio_cliente_final', 'precio_mayorista', 'precio_grupo', 'utilidad', 'monto_pendiente', 'presupuesto'];
  // Campos numéricos enteros
  const camposEnteros = ['anio', 'mes', 'automoviles', 'camionetas', 'suv', 'utilitarios', 'sin_mantenimiento', 'accidentados'];
  // Tablas que tienen es_anticipo
  const tablasConAnticipo = ['staging_rentacar_ingresos', 'staging_interauto_ventas'];

  // Construir objeto de datos
  const datos = {};
  formData.forEach((value, key) => {
    if (camposDecimales.includes(key)) {
      datos[key] = parseFloat(value) || 0;
    } else if (camposEnteros.includes(key)) {
      datos[key] = parseInt(value, 10) || 0;
    } else if (key === 'es_anticipo') {
      // Solo procesar es_anticipo si la tabla lo soporta
      if (tablasConAnticipo.includes(tabla)) {
        datos[key] = value === 'on' || value === 'true' || value === true;
      }
    } else if (value !== '') {
      datos[key] = value;
    }
  });

  // Manejar checkbox es_anticipo no marcado (solo para tablas que lo tienen)
  if (tablasConAnticipo.includes(tabla) && !datos.hasOwnProperty('es_anticipo')) {
    datos.es_anticipo = false;
  }

  // ========== CONVERSIÓN AUTOMÁTICA BS/USD ==========
  // Si hay ingreso_bs pero no ingreso_usd, calcular USD
  if (datos.ingreso_bs && !datos.ingreso_usd) {
    datos.ingreso_usd = parseFloat((datos.ingreso_bs / TIPO_CAMBIO).toFixed(2));
  }
  // Si hay ingreso_usd pero no ingreso_bs, calcular BS
  if (datos.ingreso_usd && !datos.ingreso_bs) {
    datos.ingreso_bs = parseFloat((datos.ingreso_usd * TIPO_CAMBIO).toFixed(2));
  }

  // Lo mismo para monto_bs/monto_usd
  if (datos.monto_bs && !datos.monto_usd) {
    datos.monto_usd = parseFloat((datos.monto_bs / TIPO_CAMBIO).toFixed(2));
  }
  if (datos.monto_usd && !datos.monto_bs) {
    datos.monto_bs = parseFloat((datos.monto_usd * TIPO_CAMBIO).toFixed(2));
  }

  // Lo mismo para precio_bs/precio_usd
  if (datos.precio_bs && !datos.precio_usd) {
    datos.precio_usd = parseFloat((datos.precio_bs / TIPO_CAMBIO).toFixed(2));
  }
  if (datos.precio_usd && !datos.precio_bs) {
    datos.precio_bs = parseFloat((datos.precio_usd * TIPO_CAMBIO).toFixed(2));
  }

  // Agregar metadatos
  datos.created_at = new Date().toISOString();
  datos.created_by = estado.usuario?.email || 'unknown';
  datos.status = 'pendiente';
  datos.updated_at = new Date().toISOString();

  console.log('📤 Enviando datos a', tabla, ':', JSON.stringify(datos, null, 2));

  try {
    // Usar cliente con esquema staging
    const { data, error } = await supabaseDB
      .from(tabla)
      .insert([datos])
      .select();

    console.log('📥 Respuesta Supabase:', { data, error });

    if (error) {
      console.error('❌ Error Supabase:', error);
      // Mostrar alerta con el error exacto
      alert(`ERROR DE SUPABASE:\n\nCódigo: ${error.code}\nMensaje: ${error.message}\nDetalles: ${error.details || 'N/A'}\nHint: ${error.hint || 'N/A'}`);
      throw error;
    }

    if (!data || data.length === 0) {
      const msg = 'No se recibió confirmación del servidor. Los datos pueden no haberse guardado.';
      alert(msg);
      throw new Error(msg);
    }

    // Éxito - Animación de confirmación
    submitBtn.classList.remove('loading');
    submitBtn.classList.add('success');
    submitBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      ¡Guardado!
    `;

    // Mostrar éxito con ID
    const registroId = data[0].id;
    mostrarToast('success', '¡Registro guardado!', `${tipoRegistro} guardado. ID: ${registroId}`);
    agregarNotificacion('success', `${tipoRegistro} guardado correctamente (ID: ${registroId})`);

    // Efecto visual de éxito en el formulario
    form.classList.add('form-success');
    setTimeout(() => form.classList.remove('form-success'), 1000);

    form.reset();

    // Restaurar valores por defecto
    const selectAnio = form.querySelector('select[name="anio"]');
    if (selectAnio) selectAnio.value = '2025';

    // Ocultar campo anticipo si existe
    if (elementos.campoAnticipo) {
      elementos.campoAnticipo.classList.remove('show');
    }

    // Recargar lista de registros después de guardar
    setTimeout(() => {
      cargarRegistrosSegunTab(estado.tabActiva);
    }, 800);

  } catch (error) {
    console.error('❌ Error al guardar:', error);

    submitBtn.classList.remove('loading');
    submitBtn.classList.add('error');
    submitBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      Error
    `;

    mostrarToast('error', 'Error al guardar', error.message || 'Intente nuevamente');
    agregarNotificacion('error', `Error al guardar ${tipoRegistro}: ${error.message}`);
  } finally {
    // Restaurar botón después de 2 segundos
    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading', 'success', 'error');
      submitBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/>
        </svg>
        Guardar Registro
      `;
    }, 2000);
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
// Guardar IDs conocidos para detectar nuevos
let registrosConocidos = {};

window.cargarRegistros = async function(tabla, containerId, conPago = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Mostrar estado de carga
  container.classList.add('loading');
  if (container.innerHTML.trim() === '' || container.querySelector('.registros-empty')) {
    container.innerHTML = '<div class="registros-empty"><span class="spin-text">Cargando registros...</span></div>';
  }

  try {
    console.log('🔄 Cargando registros de', tabla);

    // Usar cliente con esquema staging
    const { data, error } = await supabaseDB
      .from(tabla)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);

    console.log('📥 Registros recibidos:', data?.length || 0, data);

    if (error) {
      console.error('❌ Error al cargar:', error);
      throw error;
    }

    container.classList.remove('loading');

    if (!data || data.length === 0) {
      container.innerHTML = '<div class="registros-empty">No hay registros aún</div>';
      return;
    }

    // Detectar registros nuevos
    const idsAnteriores = registrosConocidos[tabla] || [];
    const nuevosIds = data.map(r => r.id);

    container.innerHTML = data.map((registro, index) => {
      const esNuevo = !idsAnteriores.includes(registro.id) && idsAnteriores.length > 0;
      return renderRegistro(registro, tabla, conPago, esNuevo);
    }).join('');

    // Actualizar IDs conocidos
    registrosConocidos[tabla] = nuevosIds;

    // Mostrar indicador de actualización
    mostrarIndicadorActualizacion();

  } catch (error) {
    console.error('❌ Error al cargar registros:', error);
    container.classList.remove('loading');
    container.innerHTML = `<div class="registros-empty">Error al cargar: ${error.message}</div>`;
  }
};

function mostrarIndicadorActualizacion() {
  const indicator = document.getElementById('realtime-indicator');
  if (indicator) {
    indicator.classList.add('show');
    indicator.querySelector('span').textContent = 'Sincronizado';

    setTimeout(() => {
      indicator.querySelector('span').textContent = 'Conectado';
    }, 2000);
  }
}

function renderRegistro(registro, tabla, conPago, esNuevo = false) {
  let titulo = '';
  let meta = '';

  // Determinar título y meta según la tabla
  switch (tabla) {
    case 'staging_rentacar_ingresos':
      titulo = registro.nombre_ingreso || `Ingreso ${registro.anio}-${registro.mes}`;
      const anticipoTag = registro.es_anticipo ? '<span class="tag-anticipo">ANTICIPO</span>' : '';
      meta = `${anticipoTag}Bs ${formatNumber(registro.ingreso_bs)} | $${formatNumber(registro.ingreso_usd)}`;
      break;
    case 'staging_rentacar_cobranzas':
      titulo = registro.cliente || 'Cliente';
      meta = `${registro.locacion} | Bs ${formatNumber(registro.monto_bs)}`;
      break;
    case 'staging_interauto_ventas':
      titulo = `${registro.marca} ${registro.modelo}`;
      meta = `${registro.vendedor} | $${formatNumber(registro.precio_usd)} | Utilidad: Bs ${formatNumber(registro.utilidad)}`;
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
      meta = `VIN: ${registro.vin || '-'} | $${formatNumber(registro.precio_cliente_final || registro.precio_venta)}`;
      break;
  }

  const fechaCreacion = formatearFechaCorta(registro.created_at);
  const fechaUpdate = registro.updated_at ? formatearFechaCorta(registro.updated_at) : fechaCreacion;
  const modificadoPor = registro.updated_by ? registro.updated_by.split('@')[0] : '-';
  const nuevoClass = esNuevo ? ' new' : '';

  // Determinar estado de pago
  let statusClass = registro.status || 'pendiente';
  let statusText = registro.status || 'Pendiente';

  if (registro.pagado) {
    if (registro.tipo_pago === 'total') {
      statusClass = 'pagado_total';
      statusText = 'Pagado Total';
    } else if (registro.tipo_pago === 'parcial') {
      statusClass = 'pagado_parcial';
      statusText = 'Pago Parcial';
    } else if (registro.tipo_pago === 'negociacion') {
      statusClass = 'negociacion';
      statusText = 'Negociación';
    } else {
      statusClass = 'pagado';
      statusText = 'Pagado';
    }
  }

  // Generar botones de pago si aplica
  let accionesHTML = '';
  if (conPago && !registro.pagado) {
    accionesHTML = `
      <div class="registro-payment-actions">
        <button class="btn-pago btn-pago-total" onclick="marcarPagadoTotal('${tabla}', ${registro.id})">
          Pagado Total
        </button>
        <button class="btn-pago btn-pago-parcial" onclick="marcarPagadoParcial('${tabla}', ${registro.id})">
          Pago Parcial
        </button>
        <button class="btn-pago btn-pago-negociacion" onclick="marcarPagoNegociacion('${tabla}', ${registro.id})">
          Negociación
        </button>
      </div>
    `;
  } else if (conPago && registro.pagado) {
    let pagoInfo = '';
    if (registro.tipo_pago === 'parcial' && registro.saldo_pendiente > 0) {
      pagoInfo = `<div class="pago-info parcial">Pagado: Bs ${formatNumber(registro.monto_pagado)} | Saldo: Bs ${formatNumber(registro.saldo_pendiente)}</div>`;
    } else if (registro.tipo_pago === 'negociacion') {
      pagoInfo = `<div class="pago-info negociacion">${registro.detalle_negociacion || 'Cerrado por negociación'}</div>`;
    }
    accionesHTML = pagoInfo;
  }

  return `
    <div class="registro-item${nuevoClass}">
      <div class="registro-info">
        <div class="registro-titulo">${titulo}</div>
        <div class="registro-meta">
          <span>${meta}</span>
          <span>Creado: ${fechaCreacion}</span>
          <span>Modificado: ${modificadoPor}</span>
        </div>
      </div>
      <span class="registro-status ${statusClass}">${statusText}</span>
      ${accionesHTML}
    </div>
  `;
}

window.marcarPagado = async function(tabla, id) {
  try {
    const { error } = await supabaseDB
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
    const { data, error } = await supabaseDB
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
    const { data: leadActual } = await supabaseDB
      .from('staging_leads')
      .select('estado_lead')
      .eq('id', id)
      .single();

    const estadoAnterior = leadActual?.estado_lead || 'desconocido';

    // Actualizar el lead
    const { error } = await supabaseDB
      .from('staging_leads')
      .update({
        estado_lead: nuevoEstado,
        updated_at: new Date().toISOString(),
        updated_by: estado.usuario?.email || 'unknown'
      })
      .eq('id', id);

    if (error) throw error;

    // Registrar en historial
    await supabaseDB
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
    const { data, error } = await supabaseDB
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
    const { data, error } = await supabaseDB
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
    const { data: stockActual } = await supabaseDB
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

    const { error } = await supabaseDB
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
    await supabaseDB
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
    const { data, error } = await supabaseDB
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
    const { data, error } = await supabaseDB
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
    const { data, error } = await supabaseDB
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

  const operativos = (item.automoviles || 0) + (item.camionetas || 0) + (item.suv || 0) + (item.utilitarios || 0);
  const noDisponibles = (item.sin_mantenimiento || 0) + (item.accidentados || 0);
  const total = operativos + noDisponibles;

  return `
    <div class="flota-item">
      <div class="flota-header">
        <span class="flota-periodo">${mesNombre} ${item.anio}</span>
        <span class="registro-status ${item.status}">${item.status}</span>
      </div>
      <div class="flota-categorias">
        <div class="flota-cat">
          <span class="cat-label">Automóviles</span>
          <span class="cat-valor">${item.automoviles || 0}</span>
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
          <span class="cat-label">Utilitarios</span>
          <span class="cat-valor">${item.utilitarios || 0}</span>
        </div>
      </div>
      <div class="flota-categorias" style="margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
        <div class="flota-cat no-disponible">
          <span class="cat-label">Sin Mantenimiento</span>
          <span class="cat-valor" style="color: #fbbf24;">${item.sin_mantenimiento || 0}</span>
        </div>
        <div class="flota-cat no-disponible">
          <span class="cat-label">Accidentados</span>
          <span class="cat-valor" style="color: #ef4444;">${item.accidentados || 0}</span>
        </div>
      </div>
      <div class="flota-total">
        <span>Operativos: <strong>${operativos}</strong></span>
        <span style="margin-left: 16px; color: rgba(255,255,255,0.6);">No disponibles: <strong>${noDisponibles}</strong></span>
        <span style="margin-left: 16px;">Total: <strong>${total}</strong> unidades</span>
      </div>
    </div>
  `;
}

// ==========================================
// 18. CONVERSIÓN DE MONEDA
// ==========================================
window.convertirMoneda = function(inputOrigen, inputDestino, direccion) {
  const origen = document.getElementById(inputOrigen);
  const destino = document.getElementById(inputDestino);

  if (!origen || !destino) return;

  const valor = parseFloat(origen.value) || 0;
  if (valor === 0) return;

  let resultado;
  if (direccion === 'bs-to-usd') {
    resultado = (valor / TIPO_CAMBIO).toFixed(2);
  } else {
    resultado = (valor * TIPO_CAMBIO).toFixed(2);
  }

  destino.value = resultado;
  destino.classList.add('form-success');
  setTimeout(() => destino.classList.remove('form-success'), 500);
};

// ==========================================
// 19. FUNCIONES DE PAGO (CUENTAS POR COBRAR)
// ==========================================
window.marcarPagadoTotal = async function(tabla, id) {
  if (!confirm('¿Confirma marcar esta cuenta como PAGADA en su totalidad?')) return;

  try {
    const { error } = await supabaseDB
      .from(tabla)
      .update({
        pagado: true,
        tipo_pago: 'total',
        monto_pagado: null, // Se asume el total
        updated_at: new Date().toISOString(),
        updated_by: estado.usuario?.email || 'unknown',
        fecha_pago: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    // Registrar en historial
    await registrarHistorialPago(tabla, id, 'pagado_total', null);

    mostrarToast('success', '¡Pago Total!', 'La cuenta ha sido marcada como pagada');
    cargarRegistros(tabla, tabla === 'staging_rentacar_cobranzas' ? 'list-rc-cobranzas' : 'list-ia-ventas', true);

  } catch (error) {
    console.error('Error al marcar pago:', error);
    mostrarToast('error', 'Error', 'No se pudo actualizar el registro');
  }
};

window.marcarPagadoParcial = async function(tabla, id) {
  const monto = prompt('Ingrese el monto pagado (Bs):');
  if (!monto || isNaN(monto)) return;

  const montoPagado = parseFloat(monto);
  if (montoPagado <= 0) {
    mostrarToast('error', 'Error', 'El monto debe ser mayor a 0');
    return;
  }

  try {
    // Obtener el registro actual para calcular el saldo
    const { data: registro } = await supabaseDB
      .from(tabla)
      .select('monto_bs, monto_pagado')
      .eq('id', id)
      .single();

    const pagoAnterior = parseFloat(registro?.monto_pagado) || 0;
    const totalPagado = pagoAnterior + montoPagado;
    const montoOriginal = parseFloat(registro?.monto_bs) || 0;
    const saldoPendiente = montoOriginal - totalPagado;

    const { error } = await supabaseDB
      .from(tabla)
      .update({
        tipo_pago: 'parcial',
        monto_pagado: totalPagado,
        saldo_pendiente: saldoPendiente > 0 ? saldoPendiente : 0,
        pagado: saldoPendiente <= 0,
        updated_at: new Date().toISOString(),
        updated_by: estado.usuario?.email || 'unknown',
        fecha_pago: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    await registrarHistorialPago(tabla, id, 'pago_parcial', montoPagado);

    mostrarToast('success', '¡Pago Parcial!', `Se registró un abono de Bs ${formatNumber(montoPagado)}`);
    cargarRegistros(tabla, tabla === 'staging_rentacar_cobranzas' ? 'list-rc-cobranzas' : 'list-ia-ventas', true);

  } catch (error) {
    console.error('Error al registrar pago parcial:', error);
    mostrarToast('error', 'Error', 'No se pudo actualizar el registro');
  }
};

window.marcarPagoNegociacion = async function(tabla, id) {
  const detalle = prompt('Describa el intercambio/negociación realizada:');
  if (!detalle) return;

  try {
    const { error } = await supabaseDB
      .from(tabla)
      .update({
        pagado: true,
        tipo_pago: 'negociacion',
        detalle_negociacion: detalle,
        updated_at: new Date().toISOString(),
        updated_by: estado.usuario?.email || 'unknown',
        fecha_pago: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    await registrarHistorialPago(tabla, id, 'negociacion', null, detalle);

    mostrarToast('success', '¡Negociación!', 'La cuenta ha sido cerrada por negociación');
    cargarRegistros(tabla, tabla === 'staging_rentacar_cobranzas' ? 'list-rc-cobranzas' : 'list-ia-ventas', true);

  } catch (error) {
    console.error('Error al registrar negociación:', error);
    mostrarToast('error', 'Error', 'No se pudo actualizar el registro');
  }
};

async function registrarHistorialPago(tabla, registroId, tipoPago, monto, detalle = null) {
  try {
    await supabaseDB
      .from('staging_pagos_historial')
      .insert({
        tabla_origen: tabla,
        registro_id: registroId,
        tipo_pago: tipoPago,
        monto: monto,
        detalle: detalle,
        registrado_por: estado.usuario?.email || 'unknown',
        fecha_registro: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error al registrar historial de pago:', error);
  }
}

// ==========================================
// 20. STOCK PARA INTERAUTO (SIN DASHBOARD)
// ==========================================
async function cargarStockParaInterauto() {
  const container = document.getElementById('list-interauto-stock');
  if (!container) return;

  container.innerHTML = '<div class="registros-empty">Cargando stock disponible...</div>';

  try {
    const { data, error } = await supabaseDB
      .from('staging_jetour_stock')
      .select('*')
      .eq('estado', 'disponible')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<div class="registros-empty">No hay vehículos disponibles</div>';
      return;
    }

    container.innerHTML = data.map(item => renderStockSimple(item)).join('');

  } catch (error) {
    console.error('Error al cargar stock:', error);
    container.innerHTML = '<div class="registros-empty">Error al cargar stock</div>';
  }
}

function renderStockSimple(item) {
  return `
    <div class="stock-item">
      <div class="stock-header">
        <div class="stock-modelo">${item.modelo || 'N/A'}</div>
        <span class="registro-status disponible">Disponible</span>
      </div>
      <div class="stock-details">
        <div class="stock-detail"><span>VIN:</span> ${item.vin || '-'}</div>
        <div class="stock-detail"><span>Color:</span> ${item.color || '-'}</div>
        <div class="stock-detail"><span>Año:</span> ${item.anio || '-'}</div>
        <div class="stock-detail"><span>Ubicación:</span> ${item.ubicacion || '-'}</div>
      </div>
      <div class="precio-row">
        <div class="precio-card">
          <div class="precio-card-label">Precio CIF</div>
          <div class="precio-card-value cif">$${formatNumber(item.precio_costo)}</div>
        </div>
        <div class="precio-card">
          <div class="precio-card-label">Cliente Final</div>
          <div class="precio-card-value venta">$${formatNumber(item.precio_cliente_final)}</div>
        </div>
        <div class="precio-card">
          <div class="precio-card-label">Mayorista</div>
          <div class="precio-card-value">$${formatNumber(item.precio_mayorista || 0)}</div>
        </div>
      </div>
    </div>
  `;
}

// ==========================================
// 21. MAYÚSCULAS EN INPUTS
// ==========================================
document.addEventListener('input', function(e) {
  if (e.target.classList.contains('erp-input') || e.target.classList.contains('erp-textarea')) {
    // No aplicar a inputs de tipo number, date, email
    const tipo = e.target.type;
    if (!['number', 'date', 'email', 'password'].includes(tipo)) {
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      e.target.value = e.target.value.toUpperCase();
      e.target.setSelectionRange(start, end);
    }
  }
});

// ==========================================
// 22. ESTILOS DINÁMICOS
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
