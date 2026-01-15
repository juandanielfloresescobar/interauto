-- ============================================
-- SUPABASE SCHEMA PÚBLICO - GROUP SAA ERP
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CREAR TABLAS EN ESQUEMA PUBLIC
-- (si no existen)
-- ============================================

-- Rent a Car Ingresos
CREATE TABLE IF NOT EXISTS staging_rentacar_ingresos (
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
CREATE TABLE IF NOT EXISTS staging_rentacar_cobranzas (
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

-- Rent a Car Flota Mensual
CREATE TABLE IF NOT EXISTS staging_rentacar_flota (
  id BIGSERIAL PRIMARY KEY,
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  automoviles INTEGER DEFAULT 0,
  camionetas INTEGER DEFAULT 0,
  suv INTEGER DEFAULT 0,
  utilitarios INTEGER DEFAULT 0,
  sin_mantenimiento INTEGER DEFAULT 0,
  accidentados INTEGER DEFAULT 0,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pendiente',
  UNIQUE(anio, mes)
);

-- Interauto Ventas
CREATE TABLE IF NOT EXISTS staging_interauto_ventas (
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
CREATE TABLE IF NOT EXISTS staging_interauto_ingresos (
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

-- Leads
CREATE TABLE IF NOT EXISTS staging_leads (
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
  ejecutivo_derivado VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pendiente'
);

-- Jetour Stock
CREATE TABLE IF NOT EXISTS staging_jetour_stock (
  id BIGSERIAL PRIMARY KEY,
  modelo VARCHAR(100) NOT NULL,
  anio INTEGER,
  vin VARCHAR(17) UNIQUE,
  color VARCHAR(100),
  precio_costo DECIMAL(12,2),
  precio_venta DECIMAL(12,2),
  tipo_precio VARCHAR(50) DEFAULT 'fijo',
  porcentaje_cif DECIMAL(5,2),
  ubicacion VARCHAR(100),
  estado VARCHAR(50) DEFAULT 'disponible',
  observaciones TEXT,
  vendido_a VARCHAR(255),
  fecha_venta TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pendiente'
);

-- Historial de Leads
CREATE TABLE IF NOT EXISTS staging_leads_historial (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT REFERENCES staging_leads(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50),
  modificado_por VARCHAR(255),
  fecha_modificacion TIMESTAMPTZ DEFAULT NOW()
);

-- Historial de Stock
CREATE TABLE IF NOT EXISTS staging_stock_historial (
  id BIGSERIAL PRIMARY KEY,
  stock_id BIGINT REFERENCES staging_jetour_stock(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50),
  modificado_por VARCHAR(255),
  fecha_modificacion TIMESTAMPTZ DEFAULT NOW(),
  detalle TEXT
);

-- ============================================
-- 2. AGREGAR COLUMNAS FALTANTES
-- (si las tablas ya existen)
-- ============================================

-- es_anticipo en rent a car ingresos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staging_rentacar_ingresos' AND column_name = 'es_anticipo') THEN
    ALTER TABLE staging_rentacar_ingresos ADD COLUMN es_anticipo BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Columnas de flota
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staging_rentacar_flota' AND column_name = 'automoviles') THEN
    ALTER TABLE staging_rentacar_flota ADD COLUMN automoviles INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staging_rentacar_flota' AND column_name = 'utilitarios') THEN
    ALTER TABLE staging_rentacar_flota ADD COLUMN utilitarios INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staging_rentacar_flota' AND column_name = 'sin_mantenimiento') THEN
    ALTER TABLE staging_rentacar_flota ADD COLUMN sin_mantenimiento INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staging_rentacar_flota' AND column_name = 'accidentados') THEN
    ALTER TABLE staging_rentacar_flota ADD COLUMN accidentados INTEGER DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- 3. HABILITAR RLS Y CREAR POLÍTICAS
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE staging_rentacar_ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_rentacar_cobranzas ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_rentacar_flota ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_interauto_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_interauto_ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_jetour_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_leads_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_stock_historial ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes (si hay)
DROP POLICY IF EXISTS "Enable all for authenticated" ON staging_rentacar_ingresos;
DROP POLICY IF EXISTS "Enable all for authenticated" ON staging_rentacar_cobranzas;
DROP POLICY IF EXISTS "Enable all for authenticated" ON staging_rentacar_flota;
DROP POLICY IF EXISTS "Enable all for authenticated" ON staging_interauto_ventas;
DROP POLICY IF EXISTS "Enable all for authenticated" ON staging_interauto_ingresos;
DROP POLICY IF EXISTS "Enable all for authenticated" ON staging_leads;
DROP POLICY IF EXISTS "Enable all for authenticated" ON staging_jetour_stock;
DROP POLICY IF EXISTS "Enable all for authenticated" ON staging_leads_historial;
DROP POLICY IF EXISTS "Enable all for authenticated" ON staging_stock_historial;

-- Crear políticas permisivas
CREATE POLICY "Enable all for authenticated" ON staging_rentacar_ingresos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON staging_rentacar_cobranzas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON staging_rentacar_flota FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON staging_interauto_ventas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON staging_interauto_ingresos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON staging_leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON staging_jetour_stock FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON staging_leads_historial FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON staging_stock_historial FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- 4. GRANT PERMISOS
-- ============================================

GRANT ALL ON staging_rentacar_ingresos TO authenticated;
GRANT ALL ON staging_rentacar_cobranzas TO authenticated;
GRANT ALL ON staging_rentacar_flota TO authenticated;
GRANT ALL ON staging_interauto_ventas TO authenticated;
GRANT ALL ON staging_interauto_ingresos TO authenticated;
GRANT ALL ON staging_leads TO authenticated;
GRANT ALL ON staging_jetour_stock TO authenticated;
GRANT ALL ON staging_leads_historial TO authenticated;
GRANT ALL ON staging_stock_historial TO authenticated;

-- Permisos en secuencias
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- VERIFICACIÓN: Ejecuta esto para ver tus tablas
-- ============================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name LIKE 'staging%';
