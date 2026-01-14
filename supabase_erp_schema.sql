-- ============================================
-- SUPABASE ERP SCHEMA - GROUP SAA
-- Ejecutar en el esquema 'staging'
-- ============================================

-- Crear esquema si no existe
CREATE SCHEMA IF NOT EXISTS staging;

-- ============================================
-- 1. TABLA LEADS (actualizada)
-- ============================================
CREATE TABLE IF NOT EXISTS staging.staging_leads (
  id BIGSERIAL PRIMARY KEY,
  nombre_cliente VARCHAR(255) NOT NULL,
  telefono VARCHAR(50),
  email VARCHAR(255),
  ciudad VARCHAR(100),
  marca_interes VARCHAR(100),
  modelo_interes VARCHAR(100),
  fuente VARCHAR(50),
  estado_lead VARCHAR(50) DEFAULT 'pendiente_llamada',
  presupuesto DECIMAL(12,2),
  fecha_seguimiento DATE,
  notas TEXT,
  ejecutivo_derivado VARCHAR(255),  -- NUEVO: nombre del ejecutivo asignado
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(255),  -- NUEVO: último usuario que modificó
  status VARCHAR(50) DEFAULT 'pendiente'
);

-- ============================================
-- 2. TABLA HISTORIAL LEADS (NUEVA)
-- ============================================
CREATE TABLE IF NOT EXISTS staging.staging_leads_historial (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT REFERENCES staging.staging_leads(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50),
  modificado_por VARCHAR(255),
  fecha_modificacion TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsqueda rápida por lead
CREATE INDEX IF NOT EXISTS idx_leads_historial_lead_id ON staging.staging_leads_historial(lead_id);

-- ============================================
-- 3. TABLA STOCK JETOUR (actualizada)
-- ============================================
CREATE TABLE IF NOT EXISTS staging.staging_jetour_stock (
  id BIGSERIAL PRIMARY KEY,
  modelo VARCHAR(100) NOT NULL,
  anio INTEGER,
  vin VARCHAR(17) UNIQUE,
  color VARCHAR(100),  -- CAMBIADO: ahora es texto libre
  precio_costo DECIMAL(12,2),
  precio_venta DECIMAL(12,2),
  tipo_precio VARCHAR(50) DEFAULT 'fijo',  -- NUEVO: 'fijo' o 'cif_porcentaje'
  porcentaje_cif DECIMAL(5,2),  -- NUEVO: porcentaje sobre CIF
  ubicacion VARCHAR(100),
  estado VARCHAR(50) DEFAULT 'disponible',
  observaciones TEXT,
  vendido_a VARCHAR(255),  -- NUEVO: nombre del comprador
  fecha_venta TIMESTAMPTZ,  -- NUEVO: fecha de venta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(255),  -- NUEVO: último que modificó
  status VARCHAR(50) DEFAULT 'pendiente'
);

-- ============================================
-- 4. TABLA HISTORIAL STOCK (NUEVA)
-- ============================================
CREATE TABLE IF NOT EXISTS staging.staging_stock_historial (
  id BIGSERIAL PRIMARY KEY,
  stock_id BIGINT REFERENCES staging.staging_jetour_stock(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50),
  modificado_por VARCHAR(255),
  fecha_modificacion TIMESTAMPTZ DEFAULT NOW(),
  detalle TEXT  -- Para guardar info adicional como "Vendido a: Juan Perez"
);

-- Índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_stock_historial_stock_id ON staging.staging_stock_historial(stock_id);

-- ============================================
-- 5. TABLA FLOTA MENSUAL RENT A CAR (NUEVA)
-- ============================================
CREATE TABLE IF NOT EXISTS staging.staging_rentacar_flota (
  id BIGSERIAL PRIMARY KEY,
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  automoviles INTEGER DEFAULT 0,
  camionetas INTEGER DEFAULT 0,
  suv INTEGER DEFAULT 0,
  utilitarios INTEGER DEFAULT 0,
  sin_mantenimiento INTEGER DEFAULT 0,  -- Vehículos sin uso por mantenimiento
  accidentados INTEGER DEFAULT 0,       -- Vehículos accidentados
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pendiente',
  UNIQUE(anio, mes)  -- Solo un registro por mes
);

-- ============================================
-- 6. TABLAS EXISTENTES (si no existen)
-- ============================================

-- Rent a Car Ingresos
CREATE TABLE IF NOT EXISTS staging.staging_rentacar_ingresos (
  id BIGSERIAL PRIMARY KEY,
  anio INTEGER,
  mes VARCHAR(20),
  nombre_ingreso VARCHAR(255),
  ingreso_bs DECIMAL(12,2),
  ingreso_usd DECIMAL(12,2),
  es_anticipo BOOLEAN DEFAULT FALSE,
  comentarios TEXT,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pendiente'
);

-- Rent a Car Cobranzas
CREATE TABLE IF NOT EXISTS staging.staging_rentacar_cobranzas (
  id BIGSERIAL PRIMARY KEY,
  anio INTEGER,
  mes VARCHAR(20),
  cliente VARCHAR(255),
  locacion VARCHAR(100),
  monto_bs DECIMAL(12,2),
  monto_usd DECIMAL(12,2),
  pagado BOOLEAN DEFAULT FALSE,
  fecha_pago TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pendiente'
);

-- Interauto Ventas
CREATE TABLE IF NOT EXISTS staging.staging_interauto_ventas (
  id BIGSERIAL PRIMARY KEY,
  anio INTEGER,
  mes VARCHAR(20),
  marca VARCHAR(100),
  modelo VARCHAR(100),
  vendedor VARCHAR(255),
  precio_bs DECIMAL(12,2),
  precio_usd DECIMAL(12,2),
  utilidad DECIMAL(12,2),
  es_anticipo BOOLEAN DEFAULT FALSE,
  monto_pendiente DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pendiente'
);

-- Interauto Ingresos
CREATE TABLE IF NOT EXISTS staging.staging_interauto_ingresos (
  id BIGSERIAL PRIMARY KEY,
  anio INTEGER,
  mes VARCHAR(20),
  numero_factura VARCHAR(50),
  nombre_factura VARCHAR(255),
  monto_bs DECIMAL(12,2),
  monto_usd DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pendiente'
);

-- ============================================
-- 7. ALTERACIONES A TABLAS EXISTENTES
-- (Ejecutar si las tablas ya existen)
-- ============================================

-- Agregar columnas nuevas a staging_leads si no existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'staging' AND table_name = 'staging_leads' AND column_name = 'ejecutivo_derivado') THEN
    ALTER TABLE staging.staging_leads ADD COLUMN ejecutivo_derivado VARCHAR(255);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'staging' AND table_name = 'staging_leads' AND column_name = 'updated_by') THEN
    ALTER TABLE staging.staging_leads ADD COLUMN updated_by VARCHAR(255);
  END IF;
END $$;

-- Agregar columnas nuevas a staging_jetour_stock si no existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'staging' AND table_name = 'staging_jetour_stock' AND column_name = 'tipo_precio') THEN
    ALTER TABLE staging.staging_jetour_stock ADD COLUMN tipo_precio VARCHAR(50) DEFAULT 'fijo';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'staging' AND table_name = 'staging_jetour_stock' AND column_name = 'porcentaje_cif') THEN
    ALTER TABLE staging.staging_jetour_stock ADD COLUMN porcentaje_cif DECIMAL(5,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'staging' AND table_name = 'staging_jetour_stock' AND column_name = 'vendido_a') THEN
    ALTER TABLE staging.staging_jetour_stock ADD COLUMN vendido_a VARCHAR(255);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'staging' AND table_name = 'staging_jetour_stock' AND column_name = 'fecha_venta') THEN
    ALTER TABLE staging.staging_jetour_stock ADD COLUMN fecha_venta TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'staging' AND table_name = 'staging_jetour_stock' AND column_name = 'updated_by') THEN
    ALTER TABLE staging.staging_jetour_stock ADD COLUMN updated_by VARCHAR(255);
  END IF;
END $$;

-- Agregar columnas nuevas a staging_rentacar_flota si no existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'staging' AND table_name = 'staging_rentacar_flota' AND column_name = 'automoviles') THEN
    ALTER TABLE staging.staging_rentacar_flota ADD COLUMN automoviles INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'staging' AND table_name = 'staging_rentacar_flota' AND column_name = 'utilitarios') THEN
    ALTER TABLE staging.staging_rentacar_flota ADD COLUMN utilitarios INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'staging' AND table_name = 'staging_rentacar_flota' AND column_name = 'sin_mantenimiento') THEN
    ALTER TABLE staging.staging_rentacar_flota ADD COLUMN sin_mantenimiento INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'staging' AND table_name = 'staging_rentacar_flota' AND column_name = 'accidentados') THEN
    ALTER TABLE staging.staging_rentacar_flota ADD COLUMN accidentados INTEGER DEFAULT 0;
  END IF;
END $$;

-- Agregar columna es_anticipo a staging_rentacar_ingresos si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'staging' AND table_name = 'staging_rentacar_ingresos' AND column_name = 'es_anticipo') THEN
    ALTER TABLE staging.staging_rentacar_ingresos ADD COLUMN es_anticipo BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- ============================================
-- 8. PERMISOS RLS (Row Level Security)
-- ============================================

-- Habilitar RLS en tablas nuevas
ALTER TABLE staging.staging_leads_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_stock_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_rentacar_flota ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir todo a usuarios autenticados
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON staging.staging_leads_historial
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON staging.staging_stock_historial
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON staging.staging_rentacar_flota
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- USUARIOS A CREAR EN SUPABASE AUTH:
-- ============================================
-- rentacar@groupsaa.com     -> Rent a Car Admin
-- interauto@groupsaa.com    -> Interauto Admin
-- leads@groupsaa.com        -> Leads Manager (solo ver)
-- ejecutivo_leads@groupsaa.com -> Ejecutivo de Leads (ver/editar)
-- jetour@groupsaa.com       -> Stock Jetour
-- ============================================
