-- ============================================
-- SUPABASE MIGRATION FIX - GROUP SAA ERP
-- Ejecutar en Supabase SQL Editor
-- IMPORTANTE: Este script arregla los permisos
-- para que los usuarios puedan insertar datos
-- ============================================

-- ============================================
-- 1. HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================

-- Tablas principales
ALTER TABLE IF EXISTS staging.staging_rentacar_ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staging.staging_rentacar_cobranzas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staging.staging_rentacar_flota ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staging.staging_interauto_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staging.staging_interauto_ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staging.staging_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staging.staging_jetour_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staging.staging_leads_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staging.staging_stock_historial ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. ELIMINAR POLITICAS EXISTENTES
-- (para recrearlas correctamente)
-- ============================================

DROP POLICY IF EXISTS "Allow all for authenticated users" ON staging.staging_rentacar_ingresos;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON staging.staging_rentacar_cobranzas;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON staging.staging_rentacar_flota;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON staging.staging_interauto_ventas;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON staging.staging_interauto_ingresos;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON staging.staging_leads;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON staging.staging_jetour_stock;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON staging.staging_leads_historial;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON staging.staging_stock_historial;

-- ============================================
-- 3. CREAR POLITICAS PERMISIVAS
-- (permitir todo a usuarios autenticados)
-- ============================================

-- staging_rentacar_ingresos
CREATE POLICY "Enable all for authenticated" ON staging.staging_rentacar_ingresos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- staging_rentacar_cobranzas
CREATE POLICY "Enable all for authenticated" ON staging.staging_rentacar_cobranzas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- staging_rentacar_flota
CREATE POLICY "Enable all for authenticated" ON staging.staging_rentacar_flota
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- staging_interauto_ventas
CREATE POLICY "Enable all for authenticated" ON staging.staging_interauto_ventas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- staging_interauto_ingresos
CREATE POLICY "Enable all for authenticated" ON staging.staging_interauto_ingresos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- staging_leads
CREATE POLICY "Enable all for authenticated" ON staging.staging_leads
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- staging_jetour_stock
CREATE POLICY "Enable all for authenticated" ON staging.staging_jetour_stock
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- staging_leads_historial
CREATE POLICY "Enable all for authenticated" ON staging.staging_leads_historial
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- staging_stock_historial
CREATE POLICY "Enable all for authenticated" ON staging.staging_stock_historial
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4. AGREGAR COLUMNAS FALTANTES
-- (si no existen)
-- ============================================

-- Columna es_anticipo en rent a car ingresos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'staging'
    AND table_name = 'staging_rentacar_ingresos'
    AND column_name = 'es_anticipo') THEN
    ALTER TABLE staging.staging_rentacar_ingresos ADD COLUMN es_anticipo BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Columnas de flota mensual
DO $$
BEGIN
  -- Automóviles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'staging'
    AND table_name = 'staging_rentacar_flota'
    AND column_name = 'automoviles') THEN
    ALTER TABLE staging.staging_rentacar_flota ADD COLUMN automoviles INTEGER DEFAULT 0;
  END IF;

  -- Utilitarios
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'staging'
    AND table_name = 'staging_rentacar_flota'
    AND column_name = 'utilitarios') THEN
    ALTER TABLE staging.staging_rentacar_flota ADD COLUMN utilitarios INTEGER DEFAULT 0;
  END IF;

  -- Sin mantenimiento
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'staging'
    AND table_name = 'staging_rentacar_flota'
    AND column_name = 'sin_mantenimiento') THEN
    ALTER TABLE staging.staging_rentacar_flota ADD COLUMN sin_mantenimiento INTEGER DEFAULT 0;
  END IF;

  -- Accidentados
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'staging'
    AND table_name = 'staging_rentacar_flota'
    AND column_name = 'accidentados') THEN
    ALTER TABLE staging.staging_rentacar_flota ADD COLUMN accidentados INTEGER DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- 5. GRANT PERMISOS AL ROL anon Y authenticated
-- ============================================

GRANT USAGE ON SCHEMA staging TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA staging TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA staging TO anon, authenticated;

-- Permisos específicos para cada tabla
GRANT SELECT, INSERT, UPDATE, DELETE ON staging.staging_rentacar_ingresos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staging.staging_rentacar_cobranzas TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staging.staging_rentacar_flota TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staging.staging_interauto_ventas TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staging.staging_interauto_ingresos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staging.staging_leads TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staging.staging_jetour_stock TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staging.staging_leads_historial TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staging.staging_stock_historial TO anon, authenticated;

-- Permisos en secuencias (para auto-increment)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA staging TO anon, authenticated;

-- ============================================
-- 6. VERIFICACION
-- Ejecutar estas consultas para verificar
-- ============================================

-- Ver políticas activas:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'staging';

-- Ver permisos de tablas:
-- SELECT grantee, table_schema, table_name, privilege_type
-- FROM information_schema.table_privileges
-- WHERE table_schema = 'staging';

-- ============================================
-- NOTA: Si sigue fallando, prueba deshabilitar
-- RLS temporalmente para debug:
-- ALTER TABLE staging.staging_rentacar_ingresos DISABLE ROW LEVEL SECURITY;
-- ============================================
