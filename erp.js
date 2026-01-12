// ==========================================
// ERP DATA ENTRY - GRUPO SAA
// ==========================================

// ==========================================
// 1. CONFIGURACIÓN SUPABASE
// ==========================================
const SUPABASE_URL = 'https://zzelbikylbbxclnskgkf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6ZWxiaWt5bGJieGNsbnNrZ2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MjA4NDMsImV4cCI6MjA4MTQ5Njg0M30.VGqblbw-vjQWUTpz8Xdhk5MNLyNniXvAO9moMWVAd8s';

// Cliente para esquema STAGING (datos pendientes de validación)
const supabaseStaging = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'staging' },
});

// ==========================================
// 2. CREDENCIALES DE USUARIOS (Hardcodeadas)
// ==========================================
const USUARIOS = {
  rentacar_admin: {
    password: 'rentacar2025',
    tipo: 'rentacar',
    nombre: 'Rent a Car Admin',
    badge: 'RENT A CAR'
  },
  interauto_admin: {
    password: 'interauto2025',
    tipo: 'interauto',
    nombre: 'Interauto Admin',
    badge: 'INTERAUTO'
  }
};

// ==========================================
// 3. ESTADO DE LA APLICACIÓN
// ==========================================
let estado = {
  usuarioActivo: null,
  tipoUsuario: null,
  tabActiva: null,
  notificaciones: []
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
  elementos.inputUsername = document.getElementById('username');
  elementos.inputPassword = document.getElementById('password');

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

  // Formularios
  elementos.formRcIngresos.addEventListener('submit', (e) => handleSubmit(e, 'staging_rentacar_ingresos', 'Ingresos Rent a Car'));
  elementos.formRcCobranzas.addEventListener('submit', (e) => handleSubmit(e, 'staging_rentacar_cobranzas', 'Cuenta por Cobrar'));
  elementos.formIaVentas.addEventListener('submit', (e) => handleSubmit(e, 'staging_interauto_ventas', 'Venta Interauto'));
  elementos.formIaIngresos.addEventListener('submit', (e) => handleSubmit(e, 'staging_interauto_ingresos', 'Ingresos Interauto'));

  // Notificaciones
  elementos.btnNotifications.addEventListener('click', abrirModalNotificaciones);
  elementos.btnCloseModal.addEventListener('click', cerrarModalNotificaciones);
  elementos.btnClearNotifications.addEventListener('click', limpiarNotificaciones);
  elementos.modalNotifications.addEventListener('click', (e) => {
    if (e.target === elementos.modalNotifications) cerrarModalNotificaciones();
  });

  // Cerrar modal con ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elementos.modalNotifications.classList.contains('active')) {
      cerrarModalNotificaciones();
    }
  });
}

// ==========================================
// 6. AUTENTICACIÓN
// ==========================================
function handleLogin(e) {
  e.preventDefault();

  const username = elementos.inputUsername.value.trim();
  const password = elementos.inputPassword.value;

  // Validar credenciales
  const usuario = USUARIOS[username];

  if (!usuario || usuario.password !== password) {
    elementos.loginError.classList.add('show');
    elementos.inputPassword.value = '';
    setTimeout(() => {
      elementos.loginError.classList.remove('show');
    }, 3000);
    return;
  }

  // Login exitoso
  estado.usuarioActivo = username;
  estado.tipoUsuario = usuario.tipo;

  // Guardar sesión
  sessionStorage.setItem('erp_user', username);
  sessionStorage.setItem('erp_tipo', usuario.tipo);

  mostrarDashboard(usuario);
  agregarNotificacion('info', `Sesión iniciada como ${usuario.nombre}`);
}

function handleLogout() {
  estado.usuarioActivo = null;
  estado.tipoUsuario = null;

  sessionStorage.removeItem('erp_user');
  sessionStorage.removeItem('erp_tipo');

  // Mostrar login
  elementos.erpDashboard.style.display = 'none';
  elementos.loginSection.style.display = 'flex';

  // Limpiar formularios
  elementos.loginForm.reset();
  limpiarTodosLosFormularios();
}

function verificarSesion() {
  const savedUser = sessionStorage.getItem('erp_user');
  const savedTipo = sessionStorage.getItem('erp_tipo');

  if (savedUser && USUARIOS[savedUser]) {
    estado.usuarioActivo = savedUser;
    estado.tipoUsuario = savedTipo;
    mostrarDashboard(USUARIOS[savedUser]);
  }
}

// ==========================================
// 7. DASHBOARD
// ==========================================
function mostrarDashboard(usuario) {
  // Ocultar login, mostrar dashboard
  elementos.loginSection.style.display = 'none';
  elementos.erpDashboard.style.display = 'block';

  // Actualizar header
  elementos.userBadge.textContent = usuario.badge;
  elementos.welcomeTitle.textContent = `Bienvenido, ${usuario.nombre}`;

  // Mostrar tabs correspondientes
  if (usuario.tipo === 'rentacar') {
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
}

// ==========================================
// 8. MANEJO DE FORMULARIOS
// ==========================================
async function handleSubmit(e, tabla, tipoRegistro) {
  e.preventDefault();

  const form = e.target;
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
    if (['ingreso_bs', 'ingreso_usd', 'monto_bs', 'monto_usd', 'precio_bs', 'precio_usd',
         'cant_vehiculos', 'cant_camionetas', 'cant_suv', 'cant_fullsize'].includes(key)) {
      datos[key] = parseFloat(value) || 0;
    } else {
      datos[key] = value;
    }
  });

  // Agregar metadatos
  datos.created_at = new Date().toISOString();
  datos.created_by = estado.usuarioActivo;
  datos.status = 'pendiente';

  try {
    const { data, error } = await supabaseStaging
      .from(tabla)
      .insert([datos]);

    if (error) throw error;

    // Éxito
    mostrarToast('success', '¡Registro guardado!', `${tipoRegistro} enviado para validación.`);
    agregarNotificacion('success', `${tipoRegistro} guardado correctamente`);
    form.reset();

    // Restaurar valores por defecto en selects
    const selectAnio = form.querySelector('select[name="anio"]');
    if (selectAnio) selectAnio.value = '2025';

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
// 9. SISTEMA DE NOTIFICACIONES
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
// 10. SISTEMA DE TOASTS
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
// 11. ESTILOS DINÁMICOS
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
