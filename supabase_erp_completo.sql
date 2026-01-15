-- ============================================
-- SQL COMPLETO PARA ERP GROUP SAA
-- Esquema: staging
--
-- INSTRUCCIONES:
-- 1. Ve a Supabase Dashboard -> SQL Editor
-- 2. Copia y pega TODO este contenido
-- 3. Ejecuta el script
-- ============================================

-- Crear esquema si no existe
CREATE SCHEMA IF NOT EXISTS staging;

-- ============================================
-- ELIMINAR TABLAS EXISTENTES (si quieres empezar de 0)
-- Descomenta las siguientes líneas si quieres borrar todo
-- ============================================
-- DROP TABLE IF EXISTS staging.staging_rentacar_ingresos CASCADE;
-- DROP TABLE IF EXISTS staging.staging_rentacar_cobranzas CASCADE;
-- DROP TABLE IF EXISTS staging.staging_rentacar_flota CASCADE;
-- DROP TABLE IF EXISTS staging.staging_interauto_ventas CASCADE;
-- DROP TABLE IF EXISTS staging.staging_interauto_ingresos CASCADE;
-- DROP TABLE IF EXISTS staging.staging_leads CASCADE;
-- DROP TABLE IF EXISTS staging.staging_jetour_stock CASCADE;
-- DROP TABLE IF EXISTS staging.staging_leads_historial CASCADE;
-- DROP TABLE IF EXISTS staging.staging_stock_historial CASCADE;

-- ============================================
-- 1. RENT A CAR - INGRESOS
-- ============================================
CREATE TABLE IF NOT EXISTS staging.staging_rentacar_ingresos (
  id BIGSERIAL PRIMARY KEY,
  anio INTEGER,
  mes VARCHAR(20),
  nombre_ingreso VARCHAR(255),
  ingreso_bs DECIMAL(12,2) DEFAULT 0,
  ingreso_usd DECIMAL(12,2) DEFAULT 0,
  comentarios TEXT,
  observaciones TEXT,
  es_anticipo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pendiente'
);

-- ============================================
-- 2. RENT A CAR - COBRANZAS
-- ============================================
CREATE TABLE IF NOT EXISTS staging.staging_rentacar_cobranzas (
  id BIGSERIAL PRIMARY KEY,
  fecha_reporte DATE,
  mes_deuda VARCHAR(50),
  cliente VARCHAR(255),
  locacion VARCHAR(100),
  monto_bs DECIMAL(12,2) DEFAULT 0,
  monto_usd DECIMAL(12,2) DEFAULT 0,
  pagado BOOLEAN DEFAULT FALSE,
  fecha_pago TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pendiente'
);

-- ============================================
-- 3. RENT A CAR - FLOTA MENSUAL
-- ============================================
CREATE TABLE IF NOT EXISTS staging.staging_rentacar_flota (
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
  status VARCHAR(50) DEFAULT 'pendiente'
);

-- ============================================
-- 4. INTERAUTO - VENTAS
-- ============================================
CREATE TABLE IF NOT EXISTS staging.staging_interauto_ventas (
  id BIGSERIAL PRIMARY KEY,
  fecha_venta DATE,
  vendedor VARCHAR(255),
  marca VARCHAR(100),
  modelo VARCHAR(100),
  precio_usd DECIMAL(12,2) DEFAULT 0,
  precio_bs DECIMAL(12,2) DEFAULT 0,
  utilidad DECIMAL(12,2) DEFAULT 0,
  es_anticipo BOOLEAN DEFAULT FALSE,
  monto_pendiente DECIMAL(12,2) DEFAULT 0,
  cliente VARCHAR(255),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pendiente'
);

-- ============================================
-- 5. INTERAUTO - INGRESOS FACTURADOS
-- ============================================
CREATE TABLE IF NOT EXISTS staging.staging_interauto_ingresos (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE,
  numero_factura VARCHAR(50),
  nombre_factura VARCHAR(255),
  monto_bs DECIMAL(12,2) DEFAULT 0,
  monto_usd DECIMAL(12,2) DEFAULT 0,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pendiente'
);

-- ============================================
-- 6. LEADS
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
  ejecutivo_derivado VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pendiente'
);

-- ============================================
-- 7. JETOUR STOCK
-- ============================================
CREATE TABLE IF NOT EXISTS staging.staging_jetour_stock (
  id BIGSERIAL PRIMARY KEY,
  modelo VARCHAR(100) NOT NULL,
  anio INTEGER,
  vin VARCHAR(17),
  color VARCHAR(100),
  precio_costo DECIMAL(12,2) DEFAULT 0,
  precio_venta DECIMAL(12,2) DEFAULT 0,
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

-- ============================================
-- 8. HISTORIAL DE LEADS (opcional)
-- ============================================
CREATE TABLE IF NOT EXISTS staging.staging_leads_historial (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50),
  modificado_por VARCHAR(255),
  fecha_modificacion TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. HISTORIAL DE STOCK (opcional)
-- ============================================
CREATE TABLE IF NOT EXISTS staging.staging_stock_historial (
  id BIGSERIAL PRIMARY KEY,
  stock_id BIGINT,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50),
  modificado_por VARCHAR(255),
  fecha_modificacion TIMESTAMPTZ DEFAULT NOW(),
  detalle TEXT
);

-- ============================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================
ALTER TABLE staging.staging_rentacar_ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_rentacar_cobranzas ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_rentacar_flota ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_interauto_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_interauto_ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_jetour_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_leads_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_stock_historial ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREAR POLÍTICAS RLS (permiten todo a usuarios autenticados)
-- ============================================

-- Eliminar políticas existentes primero
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'staging')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON staging.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Crear nuevas políticas
CREATE POLICY "allow_all_authenticated" ON staging.staging_rentacar_ingresos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_authenticated" ON staging.staging_rentacar_cobranzas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_authenticated" ON staging.staging_rentacar_flota FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_authenticated" ON staging.staging_interauto_ventas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_authenticated" ON staging.staging_interauto_ingresos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_authenticated" ON staging.staging_leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_authenticated" ON staging.staging_jetour_stock FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_authenticated" ON staging.staging_leads_historial FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_authenticated" ON staging.staging_stock_historial FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- GRANT PERMISOS
-- ============================================
GRANT USAGE ON SCHEMA staging TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA staging TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA staging TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA staging TO anon;

-- ============================================
-- VERIFICACIÓN - Ejecuta esto para confirmar
-- ============================================
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'staging'
-- ORDER BY table_name, ordinal_position;
