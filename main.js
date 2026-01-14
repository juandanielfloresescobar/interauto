// ==========================================
// 1. CONFIGURACIÓN SUPABASE
// ==========================================
const SUPABASE_URL = 'https://zzelbikylbbxclnskgkf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6ZWxiaWt5bGJieGNsbnNrZ2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MjA4NDMsImV4cCI6MjA4MTQ5Njg0M30.VGqblbw-vjQWUTpz8Xdhk5MNLyNniXvAO9moMWVAd8s';

// Cliente para esquema SAAV (Rent a Car)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'saav' },
});

// Cliente para esquema INTERAUTO
const supabaseInterauto = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'interauto' },
});

// ==========================================
// 2. VARIABLES GLOBALES
// ==========================================
const charts = { mensual: null, locacion: null, cliente: null, ingresos: null, ingresosInterauto: null };
const elementos = {};

// Datos Rent a Car
let dataCompleta = [];
let dataFiltrada = [];
let fechasDisponibles = [];
let ingresosMensuales = [];

// Datos Interauto
let ventasInterauto = [];
let ventasInterautoAgrupadas = [];

let TASA_CAMBIO_INGRESOS = 6.96;

const estado = {
  fecha: null,
  cliente: '',
  filtroMes: '',
  filtroLoc: '',
  pareto: '80',
  mostrarGraficoCliente: false,
  mesIngresos: '',
  mesIngresosInterauto: '',
  dashboardActivo: null
};

let calendarioAbierto = false;

// ==========================================
// 3. FUNCIONES DE NAVEGACIÓN
// ==========================================
window.mostrarDashboard = function(tipo) {
  const landing = document.getElementById('landing-page');
  const dashInterauto = document.getElementById('dashboard-interauto');
  const dashRentacar = document.getElementById('dashboard-rentacar');

  landing.style.display = 'none';

  if (tipo === 'interauto') {
    dashInterauto.style.display = 'block';
    dashRentacar.style.display = 'none';
    estado.dashboardActivo = 'interauto';
    actualizarIngresosInterauto();
  } else {
    dashInterauto.style.display = 'none';
    dashRentacar.style.display = 'block';
    estado.dashboardActivo = 'rentacar';
    refrescarTodo();
  }

  window.scrollTo(0, 0);
};

window.volverAlInicio = function() {
  const landing = document.getElementById('landing-page');
  const dashInterauto = document.getElementById('dashboard-interauto');
  const dashRentacar = document.getElementById('dashboard-rentacar');

  dashInterauto.style.display = 'none';
  dashRentacar.style.display = 'none';
  landing.style.display = 'flex';
  estado.dashboardActivo = null;

  window.scrollTo(0, 0);
};

// ==========================================
// 4. FUNCIONES DE UI PREMIUM
// ==========================================
function actualizarLoaderProgress(porcentaje, texto) {
  const progressBar = document.getElementById('loader-progress');
  const loaderText = document.getElementById('loader-text');

  if (progressBar) progressBar.style.width = `${porcentaje}%`;
  if (loaderText && texto) loaderText.textContent = texto;
}

function mostrarOverlayActualizando() {
  const overlay = document.getElementById('updating-overlay');
  if (overlay) overlay.classList.add('active');
}

function ocultarOverlayActualizando() {
  const overlay = document.getElementById('updating-overlay');
  if (overlay) overlay.classList.remove('active');
}

// ==========================================
// 5. DESCARGA DE GRÁFICOS
// ==========================================
window.descargarGrafico = function(canvasId, nombreArchivo) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const chartInstance = Chart.getChart(canvas);
  if (!chartInstance) return;

  const tempCanvas = document.createElement('canvas');
  const ctx = tempCanvas.getContext('2d');

  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;

  const isOscuro = canvas.closest('.ingresos-chart-panel') !== null;

  ctx.fillStyle = isOscuro ? '#0b0f1a' : '#ffffff';
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  ctx.drawImage(canvas, 0, 0);

  const link = document.createElement('a');
  link.download = `${nombreArchivo}-${new Date().toISOString().split('T')[0]}.png`;
  link.href = tempCanvas.toDataURL('image/png', 1.0);
  link.click();
};

// ==========================================
// 6. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', initDashboard);

async function initDashboard() {
  const loader = document.getElementById('loader');
  const errorBanner = document.getElementById('error-message');

  try {
    console.log("📡 Iniciando dashboard...");
    actualizarLoaderProgress(10, 'Conectando con servidor...');

    // A. Cuentas por Cobrar (Rent a Car)
    actualizarLoaderProgress(20, 'Cargando cuentas por cobrar...');
    let { data: rawCuentas, error: errorCuentas } = await supabase.from('cuentas_por_cobrar').select('*');
    if (errorCuentas) console.warn("Aviso Cuentas:", errorCuentas.message);
    dataCompleta = (rawCuentas || []).map(normalizarFilaCuenta);

    // B. Ingresos Rent a Car
    actualizarLoaderProgress(40, 'Cargando ingresos Rent a Car...');
    let { data: rawIngresos, error: errorIngresos } = await supabase.from('ingresos').select('*');
    if (errorIngresos) console.warn("Error Ingresos Rent a Car:", errorIngresos.message);

    if (rawIngresos && rawIngresos.length > 0) {
      ingresosMensuales = procesarIngresosSupabase(rawIngresos);
      if (ingresosMensuales.length) {
        estado.mesIngresos = ingresosMensuales[0].clave;
      }
    }

    // C. Ingresos Interauto (esquema interauto)
    actualizarLoaderProgress(60, 'Cargando ventas Interauto...');
    let { data: rawVentas, error: errorVentas } = await supabaseInterauto.from('ingresos').select('*');
    if (errorVentas) console.warn("Error Ventas Interauto:", errorVentas.message);

    if (rawVentas && rawVentas.length > 0) {
      ventasInterauto = rawVentas;
      ventasInterautoAgrupadas = agruparVentasInterauto(rawVentas);
      if (ventasInterautoAgrupadas.length) {
        estado.mesIngresosInterauto = ventasInterautoAgrupadas[0].clave;
      }
    }

    actualizarLoaderProgress(80, 'Configurando interfaz...');
    console.log(`✅ Datos cargados. Rent a Car: ${ingresosMensuales.length}, Interauto: ${ventasInterauto.length} ventas`);

    // D. Configuración UI
    configurarReferencias();
    configurarInteracciones();

    fechasDisponibles = obtenerFechasOrdenadas(dataCompleta);
    estado.fecha = fechasDisponibles[0] || null;
    dataFiltrada = filtrarPorFecha(dataCompleta, estado.fecha);

    prepararSelectorIngresos();
    prepararSelectorIngresosInterauto();

    actualizarLoaderProgress(100, 'Listo');

    if (elementos.year) elementos.year.textContent = new Date().getFullYear();

  } catch (error) {
    console.error('❌ Error crítico:', error);
    if (errorBanner) {
        errorBanner.classList.remove('is-hidden');
        errorBanner.querySelector('p').textContent = "Error: " + error.message;
    }
  } finally {
    setTimeout(() => {
      if (loader) loader.classList.add('hidden');
      const landingPage = document.getElementById('landing-page');
      if (landingPage) landingPage.style.display = 'flex';
    }, 500);
  }
}

// ==========================================
// 7. PROCESAMIENTO INTERAUTO
// ==========================================
function agruparVentasInterauto(ventas) {
  const agrupado = {};

  ventas.forEach(v => {
    // Extraer año y mes del campo 'fecha' (formato date)
    if (!v.fecha) return;

    const fechaObj = new Date(v.fecha);
    if (isNaN(fechaObj.getTime())) return;

    const year = fechaObj.getFullYear();
    const mesNumero = fechaObj.getMonth(); // 0-11

    const clave = `${year}-${String(mesNumero + 1).padStart(2, '0')}`;

    if (!agrupado[clave]) {
      agrupado[clave] = {
        clave,
        anio: year,
        mesNumero,
        ingresoBs: 0,
        ingresoUsd: 0,
        unidades: 0,
        marcas: {},
        segmentos: { economico: 0, medio: 0, premium: 0, lujo: 0 }
      };
    }

    const precioBs = Number(v.precio_bs) || 0;
    const precioUsd = Number(v.precio_usd) || 0;
    const marca = (v.marca || 'Sin Marca').toUpperCase();

    agrupado[clave].ingresoBs += precioBs;
    agrupado[clave].ingresoUsd += precioUsd;
    agrupado[clave].unidades += 1;

    // Mix por marca
    agrupado[clave].marcas[marca] = (agrupado[clave].marcas[marca] || 0) + 1;

    // Segmentación por precio USD
    if (precioUsd < 40000) {
      agrupado[clave].segmentos.economico += 1;
    } else if (precioUsd >= 40000 && precioUsd < 100000) {
      agrupado[clave].segmentos.medio += 1;
    } else if (precioUsd >= 100000 && precioUsd < 150000) {
      agrupado[clave].segmentos.premium += 1;
    } else {
      agrupado[clave].segmentos.lujo += 1;
    }
  });

  return Object.values(agrupado).sort((a, b) => (b.anio - a.anio) || (b.mesNumero - a.mesNumero));
}

function calcularYoY(ventasAgrupadas, mesActual) {
  if (!mesActual) return 0;

  const anioActual = mesActual.anio;
  const anioAnterior = anioActual - 1;

  const totalActual = ventasAgrupadas
    .filter(v => v.anio === anioActual)
    .reduce((sum, v) => sum + v.ingresoBs, 0);

  const totalAnterior = ventasAgrupadas
    .filter(v => v.anio === anioAnterior)
    .reduce((sum, v) => sum + v.ingresoBs, 0);

  if (totalAnterior === 0) return totalActual > 0 ? 100 : 0;

  return ((totalActual - totalAnterior) / totalAnterior) * 100;
}

function calcularMoM(ventasAgrupadas, mesActual) {
  if (!mesActual) return 0;

  const idx = ventasAgrupadas.findIndex(v => v.clave === mesActual.clave);
  if (idx === -1 || idx >= ventasAgrupadas.length - 1) return 0;

  const mesAnterior = ventasAgrupadas[idx + 1];
  if (!mesAnterior || mesAnterior.ingresoBs === 0) return mesActual.ingresoBs > 0 ? 100 : 0;

  return ((mesActual.ingresoBs - mesAnterior.ingresoBs) / mesAnterior.ingresoBs) * 100;
}

// ==========================================
// 8. PROCESAMIENTO RENT A CAR
// ==========================================
function getVal(obj, key) {
    if (!obj) return undefined;
    return obj[key] !== undefined ? obj[key] : (obj[key.toLowerCase()] !== undefined ? obj[key.toLowerCase()] : undefined);
}

function normalizarFilaCuenta(d) {
  return {
    fecha_estado: getVal(d, 'FECHA_ESTADO') || getVal(d, 'fecha_estado'),
    mes_deuda: (getVal(d, 'MES_DEUDA') || getVal(d, 'mes_deuda') || '').toString().trim().toUpperCase(),
    locacion: getVal(d, 'LOCACION') || getVal(d, 'locacion') || 'Sin Locación',
    cliente: getVal(d, 'CLIENTE') || getVal(d, 'cliente') || 'Desconocido',
    monto_bs: Number(getVal(d, 'MONTO_BS') || getVal(d, 'monto_bs') || 0),
    monto_usd: Number(getVal(d, 'MONTO_USD') || getVal(d, 'monto_usd') || 0)
  };
}

function procesarIngresosSupabase(datos) {
  return datos.map(d => {
    const mesNombre = (getVal(d, 'month') || '').toString().toLowerCase();
    const mesNumero = indiceMesNombre(mesNombre);
    const anio = Number(getVal(d, 'year'));
    if (mesNumero === null || !anio) return null;

    const vVehiculos = Number(getVal(d, 'fleet_vehiculos')||0);
    const vCamionetas = Number(getVal(d, 'fleet_camionetas')||0);
    const vSuv = Number(getVal(d, 'fleet_suv')||0);
    const vFull = Number(getVal(d, 'fleet_full_size')||0);
    const vCamioncito = Number(getVal(d, 'fleet_camioncito')||0);

    const partesFlota = [];
    if (vVehiculos > 0) partesFlota.push(`Vehículos: ${vVehiculos}`);
    if (vCamionetas > 0) partesFlota.push(`Camionetas: ${vCamionetas}`);
    if (vSuv > 0) partesFlota.push(`SUV: ${vSuv}`);
    if (vFull > 0) partesFlota.push(`Full Size: ${vFull}`);

    let totalUnidades = Number(getVal(d, 'fleet_total') || 0);
    if (totalUnidades === 0) totalUnidades = vVehiculos + vCamionetas + vSuv + vFull + vCamioncito;

    return {
      mesNumero, anio,
      ingresoBs: Number(getVal(d, 'income_bs') || 0),
      ingresoUsd: Number(getVal(d, 'income_usd') || 0),
      unidades: totalUnidades,
      composicion: partesFlota.join(' · ') || 'Sin detalle',
      clave: `${anio}-${String(mesNumero + 1).padStart(2, '0')}`
    };
  }).filter(Boolean).sort((a,b) => (b.anio - a.anio) || (b.mesNumero - a.mesNumero));
}

// ==========================================
// 9. REFERENCIAS DOM
// ==========================================
function configurarReferencias() {
  // Rent a Car
  elementos.fechaBadge = document.getElementById('fecha-actual');
  elementos.calendarioToggle = document.getElementById('calendario-toggle');
  elementos.calendarioLabel = document.getElementById('calendario-label');
  elementos.calendarioDropdown = document.getElementById('calendario-dropdown');

  elementos.selectMes = document.getElementById('filtro-mes');
  elementos.selectLoc = document.getElementById('filtro-locacion');
  elementos.selectCliente = document.getElementById('filtro-cliente');

  elementos.selectMesIngresos = document.getElementById('filtro-mes-ingresos');
  elementos.tablaBody = document.getElementById('tabla-body');
  elementos.year = document.getElementById('year');
  elementos.btnDeudaMensual = document.getElementById('btn-deuda-mensual');

  elementos.ingresosTotalAnio = document.getElementById('ingresos-total-anio');
  elementos.ingresosTotalAnioDetalle = document.getElementById('ingresos-total-anio-detalle');
  elementos.ingresosTotalAnioUsd = document.getElementById('ingresos-total-anio-usd');
  elementos.ingresosTotalAnioUsdDetalle = document.getElementById('ingresos-total-anio-usd-detalle');
  elementos.ingresosMensualBs = document.getElementById('ingresos-mensual-bs');
  elementos.ingresosMensualBsDetalle = document.getElementById('ingresos-mensual-bs-detalle');
  elementos.ingresosMensualUsd = document.getElementById('ingresos-mensual-usd');
  elementos.ingresosMensualUsdDetalle = document.getElementById('ingresos-mensual-usd-detalle');
  elementos.ingresosVariacion = document.getElementById('ingresos-variacion');
  elementos.ingresosVariacionDetalle = document.getElementById('ingresos-variacion-detalle');
  elementos.ingresosFlota = document.getElementById('ingresos-flota');
  elementos.ingresosFlotaDetalle = document.getElementById('ingresos-flota-detalle');
  elementos.ingresoPorUnidad = document.getElementById('ingreso-por-unidad');
  elementos.ingresoPorUnidadDetalle = document.getElementById('ingreso-por-unidad-detalle');
  elementos.ingresosMesActual = document.getElementById('ingresos-mes-actual');
  elementos.progressBarFill = document.getElementById('progress-bar-fill');
  elementos.progressText = document.getElementById('progress-text');
  elementos.daysLeftText = document.getElementById('days-left-text');

  elementos.totalBs = document.getElementById('total-bs');
  elementos.totalUsd = document.getElementById('total-usd');
  elementos.clientesActivos = document.getElementById('clientes-activos');
  elementos.mesTop = document.getElementById('mes-top');
  elementos.tipoCambio = document.getElementById('tipo-cambio');
  elementos.porcentajeCobrado = document.getElementById('porcentaje-cobrado');
  elementos.montoCobrado = document.getElementById('monto-cobrado');

  elementos.listaSalidas = document.getElementById('empresas-salieron');
  elementos.paretoList = document.getElementById('pareto-list');
  elementos.paretoBotones = document.querySelectorAll('.pareto-toggle button');

  elementos.clienteNombre = document.getElementById('cliente-nombre');
  elementos.clienteTotalBs = document.getElementById('cliente-total-bs');
  elementos.clienteTotalUsd = document.getElementById('cliente-total-usd');

  elementos.chartIngresos = document.getElementById('chart-ingresos');
  elementos.chartMensual = document.getElementById('chart-mensual');
  elementos.chartLocacion = document.getElementById('chart-locacion');
  elementos.chartCliente = document.getElementById('chart-cliente');

  // Interauto
  elementos.selectMesIngresosInterauto = document.getElementById('filtro-mes-ingresos-interauto');
  elementos.chartIngresosInterauto = document.getElementById('chart-ingresos-interauto');
}

// ==========================================
// 10. LÓGICA PRINCIPAL RENT A CAR
// ==========================================
function refrescarTodo() {
  if (elementos.fechaBadge) elementos.fechaBadge.textContent = estado.fecha || '—';

  actualizarIngresosKpi();

  dataFiltrada = filtrarPorFecha(dataCompleta, estado.fecha);
  actualizarIndicadoresCuentas(dataFiltrada);
  actualizarRetirosMes();

  renderCharts(dataFiltrada);

  if (elementos.selectMes && elementos.selectMes.options.length <= 1) {
      actualizarOpcionesFiltros();
  }

  const datosTabla = aplicarFiltrosTabla();
  renderTable(datosTabla);

  actualizarOpcionesCliente();
  actualizarPanelCliente(dataFiltrada, estado.cliente, estado.mostrarGraficoCliente);
  actualizarPareto(dataFiltrada, estado.pareto);
  actualizarSelectorFecha();
}

// ==========================================
// 11. LÓGICA INTERAUTO
// ==========================================
function actualizarIngresosInterauto() {
  if(!ventasInterautoAgrupadas.length) {
    console.warn("No hay datos de Interauto");
    return;
  }

  const obj = ventasInterautoAgrupadas.find(i => i.clave === estado.mesIngresosInterauto) || ventasInterautoAgrupadas[0];
  estado.mesIngresosInterauto = obj.clave;

  if(elementos.selectMesIngresosInterauto) elementos.selectMesIngresosInterauto.value = obj.clave;

  // KPIs Principales
  const totalAnio = ventasInterautoAgrupadas.filter(i=>i.anio===obj.anio).reduce((s,x)=>s+x.ingresoBs,0);
  const totalAnioUsd = ventasInterautoAgrupadas.filter(i=>i.anio===obj.anio).reduce((s,x)=>s+x.ingresoUsd,0);
  const unidadesAnio = ventasInterautoAgrupadas.filter(i=>i.anio===obj.anio).reduce((s,x)=>s+x.unidades,0);

  setTextById('ia-ingresos-total-anio', `Bs ${fmt(totalAnio)}`);
  setTextById('ia-ingresos-total-anio-detalle', `Acumulado ${obj.anio} (${unidadesAnio} uds)`);
  setTextById('ia-ingresos-total-anio-usd', `$${fmtUsd(totalAnioUsd)}`);

  setTextById('ia-ingresos-mensual-bs', `Bs ${fmt(obj.ingresoBs)}`);
  setTextById('ia-ingresos-mes-actual', `${obtenerNombreMes(obj.mesNumero)} ${obj.anio}`);
  setTextById('ia-ingresos-mensual-usd', `$${fmtUsd(obj.ingresoUsd)}`);

  // Unidades Vendidas
  setTextById('ia-unidades-vendidas', obj.unidades);
  setTextById('ia-unidades-vendidas-detalle', `${obtenerNombreMes(obj.mesNumero)} ${obj.anio}`);

  // Ticket Promedio
  const ticketPromedio = obj.unidades > 0 ? obj.ingresoUsd / obj.unidades : 0;
  setTextById('ia-ticket-promedio', `$${fmtUsd(ticketPromedio)}`);
  setTextById('ia-ticket-promedio-detalle', `Por unidad vendida`);

  // Crecimiento YoY y MoM
  const yoy = calcularYoY(ventasInterautoAgrupadas, obj);
  const mom = calcularMoM(ventasInterautoAgrupadas, obj);
  const elYoy = document.getElementById('ia-crecimiento-yoy');
  const yoyStr = `${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}%`;
  const momStr = `${mom >= 0 ? '+' : ''}${mom.toFixed(1)}%`;
  setTextById('ia-crecimiento-yoy', `YoY ${yoyStr} | MoM ${momStr}`);
  if (elYoy) {
    elYoy.className = 'value';
    // Color basado en MoM (más reciente)
    elYoy.classList.add(mom >= 0 ? 'trend-positive' : 'trend-negative');
  }
  setTextById('ia-crecimiento-yoy-detalle', `Anual y mensual`);

  // Barra de progreso
  const elBar = document.getElementById('ia-progress-bar-fill');
  const elText = document.getElementById('ia-progress-text');
  const elLeft = document.getElementById('ia-days-left-text');

  if (elBar && elText && elLeft) {
    const now = new Date();
    if (now.getFullYear() === obj.anio && now.getMonth() === obj.mesNumero) {
      const totalDays = new Date(obj.anio, obj.mesNumero + 1, 0).getDate();
      const currentDay = now.getDate();
      const pct = Math.min(100, (currentDay / totalDays) * 100);
      elBar.style.width = `${pct}%`;
      elText.textContent = `Día ${currentDay} de ${totalDays}`;
      elLeft.textContent = `Faltan ${totalDays - currentDay} días`;
    } else if (new Date(obj.anio, obj.mesNumero, 1) < now) {
      elBar.style.width = '100%';
      elText.textContent = 'Mes Cerrado';
      elLeft.textContent = 'Completado';
    } else {
      elBar.style.width = '0%';
      elText.textContent = 'No iniciado';
      elLeft.textContent = 'Pendiente';
    }
  }

  // Mix de Producto por Marca
  actualizarMixProducto(obj);

  // Segmentación
  actualizarSegmentacion(obj);

  // Gráfico
  renderGraficoIngresosInterauto();
}

function actualizarMixProducto(mesData) {
  const container = document.getElementById('ia-mix-producto');
  if (!container) return;

  const marcas = mesData.marcas || {};
  const total = mesData.unidades || 1;

  const sorted = Object.entries(marcas)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (sorted.length === 0) {
    container.innerHTML = '<div class="mix-item"><span class="marca">Sin datos</span><div class="mix-bar-container"><div class="mix-bar" style="width: 0%;"></div></div><span class="porcentaje">0%</span></div>';
    return;
  }

  container.innerHTML = sorted.map(([marca, cantidad]) => {
    const pct = ((cantidad / total) * 100).toFixed(1);
    return `
      <div class="mix-item">
        <span class="marca">${marca}</span>
        <div class="mix-bar-container"><div class="mix-bar" style="width: ${pct}%;"></div></div>
        <span class="porcentaje">${pct}%</span>
      </div>
    `;
  }).join('');
}

function actualizarSegmentacion(mesData) {
  const seg = mesData.segmentos || { economico: 0, medio: 0, premium: 0, lujo: 0 };
  const total = mesData.unidades || 1;

  const pctEconomico = (seg.economico / total) * 100;
  const pctMedio = (seg.medio / total) * 100;
  const pctPremium = (seg.premium / total) * 100;
  const pctLujo = (seg.lujo / total) * 100;

  // Actualizar barra
  const barEconomico = document.querySelector('.segment-economico');
  const barMedio = document.querySelector('.segment-medio');
  const barPremium = document.querySelector('.segment-premium');
  const barLujo = document.querySelector('.segment-lujo');

  if (barEconomico) barEconomico.style.width = `${pctEconomico}%`;
  if (barMedio) barMedio.style.width = `${pctMedio}%`;
  if (barPremium) barPremium.style.width = `${pctPremium}%`;
  if (barLujo) barLujo.style.width = `${pctLujo}%`;

  // Actualizar leyenda
  setTextById('ia-seg-economico', `${seg.economico} (${pctEconomico.toFixed(0)}%)`);
  setTextById('ia-seg-medio', `${seg.medio} (${pctMedio.toFixed(0)}%)`);
  setTextById('ia-seg-premium', `${seg.premium} (${pctPremium.toFixed(0)}%)`);
  setTextById('ia-seg-lujo', `${seg.lujo} (${pctLujo.toFixed(0)}%)`);
}

function renderGraficoIngresosInterauto() {
  const elChart = elementos.chartIngresosInterauto;
  if (!elChart) return;
  if (charts.ingresosInterauto) charts.ingresosInterauto.destroy();

  const dataG = [...ventasInterautoAgrupadas].sort((a,b) => (a.anio - b.anio) || (a.mesNumero - b.mesNumero));
  const ctx = elChart.getContext('2d');

  charts.ingresosInterauto = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dataG.map(d => `${obtenerNombreMes(d.mesNumero).substring(0,3)} ${d.anio}`),
      datasets: [
        {
          label: 'Ingresos (Bs)',
          data: dataG.map(d => d.ingresoBs),
          backgroundColor: 'rgba(180, 0, 26, 0.8)',
          borderColor: '#b4001a',
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          label: 'Unidades',
          data: dataG.map(d => d.unidades),
          type: 'line',
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#22c55e',
          fill: false,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#ffffff' } },
        tooltip: { backgroundColor: 'rgba(0,0,0,0.9)', titleColor: '#fff', bodyColor: '#fff' }
      },
      scales: {
        x: { ticks: { color: 'rgba(255,255,255,0.7)' }, grid: { display: false } },
        y: { position: 'left', ticks: { color: 'rgba(255,255,255,0.7)', callback: v => `Bs ${v/1000000}M` }, grid: { color: 'rgba(255,255,255,0.1)' } },
        y1: { position: 'right', ticks: { color: '#22c55e' }, grid: { display: false } }
      }
    }
  });
}

function prepararSelectorIngresosInterauto() {
  if(elementos.selectMesIngresosInterauto) {
    elementos.selectMesIngresosInterauto.innerHTML = ventasInterautoAgrupadas.map(i => {
      const nm = obtenerNombreMes(i.mesNumero);
      return `<option value="${i.clave}">${nm} ${i.anio}</option>`;
    }).join('');

    elementos.selectMesIngresosInterauto.addEventListener('change', (e) => {
      mostrarOverlayActualizando();
      estado.mesIngresosInterauto = e.target.value;
      setTimeout(() => {
        actualizarIngresosInterauto();
        ocultarOverlayActualizando();
      }, 300);
    });
  }
}

// ==========================================
// 12. FUNCIONES RENT A CAR
// ==========================================
function aplicarFiltrosTabla() {
  return dataFiltrada.filter(i => {
    const mesOk = !estado.filtroMes || i.mes_deuda === estado.filtroMes;
    const locOk = !estado.filtroLoc || i.locacion === estado.filtroLoc;
    return mesOk && locOk;
  });
}

function renderTable(registros) {
  if (!elementos.tablaBody) return;
  if (!registros.length) {
    elementos.tablaBody.innerHTML = '<tr><td colspan="6" class="empty-row">Sin datos para los filtros seleccionados</td></tr>';
    return;
  }

  elementos.tablaBody.innerHTML = registros.slice(0, 200).map(r => `
    <tr>
      <td>${r.fecha_estado}</td>
      <td>${r.mes_deuda}</td>
      <td>${r.locacion}</td>
      <td>${r.cliente}</td>
      <td>$${fmtUsd(r.monto_usd)}</td>
      <td>Bs ${fmt(r.monto_bs)}</td>
    </tr>
  `).join('');
}

function actualizarOpcionesFiltros() {
  if (!elementos.selectMes) return;

  const prevMes = estado.filtroMes;
  const prevLoc = estado.filtroLoc;

  const meses = [...new Set(dataFiltrada.map(d => d.mes_deuda))].sort((a,b)=>ordenMes(a)-ordenMes(b));
  elementos.selectMes.innerHTML = '<option value="">Todos</option>' + meses.map(m => `<option value="${m}">${m}</option>`).join('');

  const locs = [...new Set(dataFiltrada.map(d => d.locacion))].sort();
  elementos.selectLoc.innerHTML = '<option value="">Todas</option>' + locs.map(l => `<option value="${l}">${l}</option>`).join('');

  if (meses.includes(prevMes)) elementos.selectMes.value = prevMes;
  else estado.filtroMes = '';

  if (locs.includes(prevLoc)) elementos.selectLoc.value = prevLoc;
  else estado.filtroLoc = '';
}

function actualizarIndicadoresCuentas(data) {
  const totalBs = data.reduce((s, i) => s + i.monto_bs, 0);
  const totalUsd = data.reduce((s, i) => s + i.monto_usd, 0);
  const clientes = new Set(data.map(i => i.cliente)).size;

  const porMes = {};
  data.forEach(i => porMes[i.mes_deuda] = (porMes[i.mes_deuda]||0) + i.monto_bs);
  const mesTop = Object.entries(porMes).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';

  setText('total-bs', `Bs ${fmt(totalBs)}`);
  setText('total-usd', `$${fmtUsd(totalUsd)}`);
  setText('clientes-activos', clientes);
  setText('mes-top', mesTop);
  setText('tipo-cambio', '6,96 Bs');
}

function actualizarRetirosMes() {
  if (!elementos.listaSalidas) return;

  const idxActual = fechasDisponibles.indexOf(estado.fecha);
  if (idxActual === -1 || idxActual === fechasDisponibles.length - 1) {
    elementos.listaSalidas.innerHTML = '<li class="empty">Sin datos previos para comparar</li>';
    setText('monto-cobrado', 'Bs 0');
    setText('porcentaje-cobrado', '0%');
    return;
  }

  const fechaPrev = fechasDisponibles[idxActual + 1];
  const saldosHoy = agruparSaldoPorCliente(dataFiltrada);
  const dataPrev = filtrarPorFecha(dataCompleta, fechaPrev);
  const saldosPrev = agruparSaldoPorCliente(dataPrev);

  const retiros = [];
  let totalCobrado = 0;
  let totalDeudaPrev = 0;

  for (const [cli, saldoAnt] of Object.entries(saldosPrev)) {
    totalDeudaPrev += saldoAnt;
    const saldoAct = saldosHoy[cli] || 0;
    if (saldoAct < saldoAnt) {
      const pagado = saldoAnt - saldoAct;
      totalCobrado += pagado;
      retiros.push({ cliente: cli, pagado, tipo: saldoAct === 0 ? 'Total' : 'Parcial' });
    }
  }

  retiros.sort((a,b) => b.pagado - a.pagado);
  const topRetiros = retiros.slice(0, 7);

  if (topRetiros.length === 0) {
    elementos.listaSalidas.innerHTML = '<li class="empty">No hubo retiros</li>';
  } else {
    elementos.listaSalidas.innerHTML = topRetiros.map(r => `
      <li><strong>${r.cliente}</strong><span>Bs ${fmt(r.pagado)} <small>(${r.tipo})</small></span></li>
    `).join('');
  }

  setText('monto-cobrado', `Bs ${fmt(totalCobrado)}`);
  const pct = totalDeudaPrev > 0 ? (totalCobrado / totalDeudaPrev) * 100 : 0;
  setText('porcentaje-cobrado', `${pct.toFixed(1)}%`);

  const elPct = elementos.porcentajeCobrado;
  if(elPct) {
    elPct.className = 'value';
    elPct.style.color = pct > 10 ? '#4ade80' : (pct > 0 ? '#facc15' : '#f87171');
  }
}

function actualizarIngresosKpi() {
  if(!ingresosMensuales.length) return;

  const obj = ingresosMensuales.find(i => i.clave === estado.mesIngresos) || ingresosMensuales[0];
  estado.mesIngresos = obj.clave;

  if(elementos.selectMesIngresos) elementos.selectMesIngresos.value = obj.clave;

  const totalAnio = ingresosMensuales.filter(i=>i.anio===obj.anio).reduce((s,x)=>s+x.ingresoBs,0);
  const totalAnioUsd = ingresosMensuales.filter(i=>i.anio===obj.anio).reduce((s,x)=>s+x.ingresoUsd,0);

  const idx = ingresosMensuales.findIndex(i => i.clave === obj.clave);
  const previo = ingresosMensuales[idx + 1];

  let varMensual = 0;
  if (previo && previo.ingresoBs > 0) varMensual = ((obj.ingresoBs - previo.ingresoBs) / previo.ingresoBs) * 100;

  const ingUnidad = obj.unidades ? obj.ingresoBs/obj.unidades : 0;

  setText('ingresos-total-anio', `Bs ${fmt(totalAnio)}`);
  setText('ingresos-total-anio-detalle', `Acumulado ${obj.anio}`);
  setText('ingresos-total-anio-usd', `$${fmtUsd(totalAnioUsd)}`);

  setText('ingresos-mensual-bs', `Bs ${fmt(obj.ingresoBs)}`);
  setText('ingresos-mes-actual', `${obtenerNombreMes(obj.mesNumero)} ${obj.anio}`);
  setText('ingresos-mensual-usd', `$${fmtUsd(obj.ingresoUsd)}`);

  const elVar = elementos.ingresosVariacion;
  setText('ingresos-variacion', `${varMensual>=0?'+':''}${varMensual.toFixed(1)}%`);
  if(elVar) {
    elVar.className = 'value';
    elVar.classList.add(varMensual >= 0 ? 'trend-positive' : 'trend-negative');
  }

  setText('ingresos-flota', `${obj.unidades} uds`);
  setText('ingresos-flota-detalle', obj.composicion);
  setText('ingreso-por-unidad', `Bs ${fmt(ingUnidad)}`);

  const elBar = elementos.progressBarFill;
  const elText = elementos.progressText;
  const elLeft = elementos.daysLeftText;

  if (elBar && elText && elLeft) {
    const now = new Date();
    if (now.getFullYear() === obj.anio && now.getMonth() === obj.mesNumero) {
      const totalDays = new Date(obj.anio, obj.mesNumero + 1, 0).getDate();
      const currentDay = now.getDate();
      const pct = Math.min(100, (currentDay / totalDays) * 100);
      elBar.style.width = `${pct}%`;
      elText.textContent = `Día ${currentDay} de ${totalDays}`;
      elLeft.textContent = `Faltan ${totalDays - currentDay} días`;
    } else if (new Date(obj.anio, obj.mesNumero, 1) < now) {
      elBar.style.width = '100%';
      elText.textContent = 'Mes Cerrado';
      elLeft.textContent = 'Completado';
    } else {
      elBar.style.width = '0%';
      elText.textContent = 'No iniciado';
      elLeft.textContent = 'Pendiente';
    }
  }

  renderGraficoIngresos();
}

function renderGraficoIngresos() {
  const elChart = elementos.chartIngresos;
  if (!elChart) return;
  if (charts.ingresos) charts.ingresos.destroy();

  const dataG = [...ingresosMensuales].sort((a,b) => (a.anio - b.anio) || (a.mesNumero - b.mesNumero));
  const ctx = elChart.getContext('2d');

  charts.ingresos = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dataG.map(d => `${obtenerNombreMes(d.mesNumero).substring(0,3)} ${d.anio}`),
      datasets: [
        {
          label: 'Ingresos (Bs)',
          data: dataG.map(d => d.ingresoBs),
          borderColor: '#ffffff',
          backgroundColor: 'rgba(255,255,255,0.0)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBackgroundColor: '#ffffff',
          fill: true,
          yAxisID: 'y'
        },
        {
          label: 'Flota (Uds)',
          data: dataG.map(d => d.unidades),
          borderColor: 'rgba(255,255,255,0.5)',
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          fill: false,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#ffffff' } },
        tooltip: { backgroundColor: 'rgba(0,0,0,0.9)', titleColor: '#fff', bodyColor: '#fff' }
      },
      scales: {
        x: { ticks: { color: 'rgba(255,255,255,0.7)' }, grid: { display: false } },
        y: { position: 'left', ticks: { color: 'rgba(255,255,255,0.7)', callback: v => `Bs ${v/1000}k` }, grid: { color: 'rgba(255,255,255,0.1)' } },
        y1: { position: 'right', ticks: { color: 'rgba(255,255,255,0.5)' }, grid: { display: false } }
      }
    }
  });
}

function renderCharts(data) {
  if (elementos.chartMensual) {
    if (charts.mensual) charts.mensual.destroy();
    if (data && data.length) {
      const porMes = {};
      data.forEach(d => porMes[d.mes_deuda] = (porMes[d.mes_deuda]||0) + d.monto_bs);
      const labelsMes = Object.keys(porMes).sort((a,b) => ordenMes(a)-ordenMes(b));

      charts.mensual = new Chart(elementos.chartMensual, {
        type: 'line',
        data: {
          labels: labelsMes,
          datasets: [{
            label: 'Monto Bs',
            data: labelsMes.map(m => porMes[m]),
            borderColor: '#0f172a',
            backgroundColor: 'rgba(15, 23, 42, 0.1)',
            fill: true,
            borderWidth: 2,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: '#111827'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
    }
  }

  if (elementos.chartLocacion) {
    if (charts.locacion) charts.locacion.destroy();
    if (data && data.length) {
      const porLoc = {};
      data.forEach(d => porLoc[d.locacion] = (porLoc[d.locacion]||0) + d.monto_bs);
      charts.locacion = new Chart(elementos.chartLocacion, {
        type: 'doughnut',
        data: {
          labels: Object.keys(porLoc),
          datasets: [{
            data: Object.values(porLoc),
            backgroundColor: ['#0f172a', '#334155', '#64748b', '#94a3b8'],
            borderWidth: 0
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { usePointStyle: true } } } }
      });
    }
  }
}

// ==========================================
// 13. INTERACCIONES
// ==========================================
function configurarInteracciones() {
  elementos.calendarioToggle?.addEventListener('click', () => {
    calendarioAbierto = !calendarioAbierto;
    elementos.calendarioDropdown.classList.toggle('open', calendarioAbierto);
  });

  elementos.selectMes?.addEventListener('change', (e) => {
    mostrarOverlayActualizando();
    estado.filtroMes = e.target.value;
    setTimeout(() => {
      const datosTabla = aplicarFiltrosTabla();
      renderTable(datosTabla);
      ocultarOverlayActualizando();
    }, 300);
  });

  elementos.selectLoc?.addEventListener('change', (e) => {
    mostrarOverlayActualizando();
    estado.filtroLoc = e.target.value;
    setTimeout(() => {
      const datosTabla = aplicarFiltrosTabla();
      renderTable(datosTabla);
      ocultarOverlayActualizando();
    }, 300);
  });

  elementos.selectCliente?.addEventListener('change', (e) => {
    mostrarOverlayActualizando();
    estado.cliente = e.target.value;
    setTimeout(() => {
      actualizarPanelCliente(dataFiltrada, estado.cliente, estado.mostrarGraficoCliente);
      ocultarOverlayActualizando();
    }, 300);
  });

  elementos.selectMesIngresos?.addEventListener('change', (e) => {
    mostrarOverlayActualizando();
    estado.mesIngresos = e.target.value;
    setTimeout(() => {
      actualizarIngresosKpi();
      ocultarOverlayActualizando();
    }, 300);
  });

  elementos.paretoBotones?.forEach(btn => btn.addEventListener('click', (e) => {
    elementos.paretoBotones.forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    estado.pareto = e.target.dataset.pareto;
    actualizarPareto(dataFiltrada, estado.pareto);
  }));

  if (elementos.btnDeudaMensual) {
    elementos.btnDeudaMensual.addEventListener('click', () => {
      estado.mostrarGraficoCliente = !estado.mostrarGraficoCliente;
      if(estado.mostrarGraficoCliente) elementos.btnDeudaMensual.classList.add('active');
      else elementos.btnDeudaMensual.classList.remove('active');
      actualizarPanelCliente(dataFiltrada, estado.cliente, estado.mostrarGraficoCliente);
    });
  }
}

function actualizarSelectorFecha() {
  const elDrop = elementos.calendarioDropdown;
  const elLabel = elementos.calendarioLabel;
  if (!elDrop) return;
  elLabel.textContent = estado.fecha || 'Sin Datos';

  elDrop.innerHTML = '<div class="calendar-list">' + fechasDisponibles.map(f =>
    `<div class="calendar-item ${f===estado.fecha?'selected':''}" onclick="document.dispatchEvent(new CustomEvent('cambioFecha', {detail:'${f}'}))">${f}</div>`
  ).join('') + '</div>';

  if (!window.eventoFechaConfigurado) {
    document.addEventListener('cambioFecha', (e) => {
      mostrarOverlayActualizando();
      estado.fecha = e.detail;
      calendarioAbierto = false;
      elDrop.classList.remove('open');
      setTimeout(() => {
        refrescarTodo();
        ocultarOverlayActualizando();
      }, 300);
    });
    window.eventoFechaConfigurado = true;
  }
}

function actualizarOpcionesCliente() {
  if (!elementos.selectCliente) return;
  const clientes = [...new Set(dataFiltrada.map(d => d.cliente))].sort();
  elementos.selectCliente.innerHTML = '<option value="">Seleccionar...</option>' + clientes.map(c => `<option value="${c}">${c}</option>`).join('');

  if (!estado.cliente) {
    const parkano = clientes.find(c => c.toUpperCase().includes('PARKANO'));
    if (parkano) estado.cliente = parkano;
  }

  elementos.selectCliente.value = estado.cliente;
}

function actualizarPareto(data, tipo) {
  if(!elementos.paretoList) return;
  const sums = {}; data.forEach(d=>sums[d.cliente]=(sums[d.cliente]||0)+d.monto_bs);
  const sorted = Object.entries(sums).sort((a,b)=>b[1]-a[1]);
  const total = Object.values(sums).reduce((a,b)=>a+b,0);
  let acc = 0; const list = [];
  for(const [c,v] of sorted) {
    acc += v; const pct = acc/total;
    if(tipo==='80' && pct<=0.85) list.push({c,v});
    else if(tipo==='20' && pct>0.80) list.push({c,v});
  }
  if(tipo==='80' && !list.length && sorted.length) list.push({c:sorted[0][0], v:sorted[0][1]});
  elementos.paretoList.innerHTML = list.slice(0,10).map(i => `<li><strong>${i.c}</strong> <span>Bs ${fmt(i.v)}</span></li>`).join('');
}

function actualizarPanelCliente(data, cli, showGraph) {
  if(!cli || !data.length) {
    setText('cliente-nombre', '—');
    setText('cliente-total-bs', 'Bs 0');
    if(elementos.chartCliente) elementos.chartCliente.classList.add('is-hidden');
    return;
  }
  const recs = data.filter(d => d.cliente === cli);
  const tot = recs.reduce((s,i)=>s+i.monto_bs,0);
  const totUsd = recs.reduce((s,i)=>s+i.monto_usd,0);
  setText('cliente-nombre', cli);
  setText('cliente-total-bs', `Bs ${fmt(tot)}`);
  setText('cliente-total-usd', `$${fmtUsd(totUsd)}`);

  if(showGraph && elementos.chartCliente) {
    elementos.chartCliente.classList.remove('is-hidden');
    if(charts.cliente) charts.cliente.destroy();

    const historial = dataCompleta.filter(d => d.cliente === cli);
    const porMes = {};
    historial.forEach(d => porMes[d.mes_deuda] = (porMes[d.mes_deuda]||0) + d.monto_bs);

    const lbls = Object.keys(porMes).sort((a,b)=>ordenMes(a)-ordenMes(b));
    const ctx = elementos.chartCliente.getContext('2d');
    charts.cliente = new Chart(ctx, {
      type:'line',
      data:{
        labels:lbls,
        datasets:[{
          label:'Deuda (Bs)',
          data:lbls.map(l=>porMes[l]),
          borderColor:'#ef233c',
          backgroundColor:'rgba(239,35,60,0.2)',
          fill:true,
          tension: 0.3
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  } else if(elementos.chartCliente) {
    elementos.chartCliente.classList.add('is-hidden');
  }
}

// ==========================================
// 14. UTILIDADES
// ==========================================
function obtenerFechasOrdenadas(data) {
  return [...new Set(data.map(d => d.fecha_estado))].sort().reverse();
}

function filtrarPorFecha(data, fecha) {
  return fecha ? data.filter(d => d.fecha_estado === fecha) : data;
}

function prepararSelectorIngresos() {
  if(elementos.selectMesIngresos) {
    elementos.selectMesIngresos.innerHTML = ingresosMensuales.map(i => {
      const nm = obtenerNombreMes(i.mesNumero);
      return `<option value="${i.clave}">${nm} ${i.anio}</option>`;
    }).join('');
  }
}

function agruparSaldoPorCliente(datos) {
  return datos.reduce((acc, i) => { acc[i.cliente] = (acc[i.cliente] || 0) + i.monto_bs; return acc; }, {});
}

function indiceMesNombre(n) {
  const m = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  let i = m.indexOf(n);
  if(i===-1) i = m.findIndex(x => x.startsWith(n.substring(0,3)));
  return i!==-1?i:null;
}

function obtenerNombreMes(idx) {
  const m = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return m[idx] || '';
}

function ordenMes(mes) {
  const [abr, y] = mes.toLowerCase().split('-');
  return (Number(y || 0) * 12) + indiceMesNombre(abr);
}

function fmt(n) { return Number(n).toLocaleString('es-BO', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }
function fmtUsd(n) { return Number(n).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }

function setText(id, txt) {
  if(elementos[id]) elementos[id].textContent = txt;
  else { const el = document.getElementById(id); if(el) el.textContent = txt; }
}

function setTextById(id, txt) {
  const el = document.getElementById(id);
  if(el) el.textContent = txt;
}
