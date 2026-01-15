-- ============================================
-- MIGRACION v2 - ERP GROUP SAA
-- Para actualizar base de datos existente
-- Sin eliminar datos
-- Fecha: 2026-01-15
-- ============================================

-- ============================================
-- 1. AGREGAR CAMPOS DE PAGO A COBRANZAS (si no existen)
-- ============================================
DO $$
BEGIN
    -- tipo_pago
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'staging'
                   AND table_name = 'staging_rentacar_cobranzas'
                   AND column_name = 'tipo_pago') THEN
        ALTER TABLE staging.staging_rentacar_cobranzas ADD COLUMN tipo_pago VARCHAR(50);
    END IF;

    -- monto_pagado
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'staging'
                   AND table_name = 'staging_rentacar_cobranzas'
                   AND column_name = 'monto_pagado') THEN
        ALTER TABLE staging.staging_rentacar_cobranzas ADD COLUMN monto_pagado DECIMAL(12,2) DEFAULT 0;
    END IF;

    -- saldo_pendiente
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'staging'
                   AND table_name = 'staging_rentacar_cobranzas'
                   AND column_name = 'saldo_pendiente') THEN
        ALTER TABLE staging.staging_rentacar_cobranzas ADD COLUMN saldo_pendiente DECIMAL(12,2) DEFAULT 0;
    END IF;

    -- detalle_negociacion
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'staging'
                   AND table_name = 'staging_rentacar_cobranzas'
                   AND column_name = 'detalle_negociacion') THEN
        ALTER TABLE staging.staging_rentacar_cobranzas ADD COLUMN detalle_negociacion TEXT;
    END IF;

    -- fecha_pago
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'staging'
                   AND table_name = 'staging_rentacar_cobranzas'
                   AND column_name = 'fecha_pago') THEN
        ALTER TABLE staging.staging_rentacar_cobranzas ADD COLUMN fecha_pago TIMESTAMPTZ;
    END IF;

    -- updated_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'staging'
                   AND table_name = 'staging_rentacar_cobranzas'
                   AND column_name = 'updated_by') THEN
        ALTER TABLE staging.staging_rentacar_cobranzas ADD COLUMN updated_by VARCHAR(255);
    END IF;
END $$;

-- ============================================
-- 2. AGREGAR CAMPOS DE PAGO A INTERAUTO VENTAS (si no existen)
-- ============================================
DO $$
BEGIN
    -- tipo_pago
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'staging'
                   AND table_name = 'staging_interauto_ventas'
                   AND column_name = 'tipo_pago') THEN
        ALTER TABLE staging.staging_interauto_ventas ADD COLUMN tipo_pago VARCHAR(50);
    END IF;

    -- monto_pagado
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'staging'
                   AND table_name = 'staging_interauto_ventas'
                   AND column_name = 'monto_pagado') THEN
        ALTER TABLE staging.staging_interauto_ventas ADD COLUMN monto_pagado DECIMAL(12,2) DEFAULT 0;
    END IF;

    -- saldo_pendiente
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'staging'
                   AND table_name = 'staging_interauto_ventas'
                   AND column_name = 'saldo_pendiente') THEN
        ALTER TABLE staging.staging_interauto_ventas ADD COLUMN saldo_pendiente DECIMAL(12,2) DEFAULT 0;
    END IF;

    -- detalle_negociacion
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'staging'
                   AND table_name = 'staging_interauto_ventas'
                   AND column_name = 'detalle_negociacion') THEN
        ALTER TABLE staging.staging_interauto_ventas ADD COLUMN detalle_negociacion TEXT;
    END IF;

    -- fecha_pago
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'staging'
                   AND table_name = 'staging_interauto_ventas'
                   AND column_name = 'fecha_pago') THEN
        ALTER TABLE staging.staging_interauto_ventas ADD COLUMN fecha_pago TIMESTAMPTZ;
    END IF;

    -- updated_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'staging'
                   AND table_name = 'staging_interauto_ventas'
                   AND column_name = 'updated_by') THEN
        ALTER TABLE staging.staging_interauto_ventas ADD COLUMN updated_by VARCHAR(255);
    END IF;
END $$;

-- ============================================
-- 3. AGREGAR updated_by A LEADS (si no existe)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'staging'
                   AND table_name = 'staging_leads'
                   AND column_name = 'updated_by') THEN
        ALTER TABLE staging.staging_leads ADD COLUMN updated_by VARCHAR(255);
    END IF;
END $$;

-- ============================================
-- 4. CREAR TABLA HISTORIAL DE LEADS (si no existe)
-- ============================================
CREATE TABLE IF NOT EXISTS staging.staging_leads_historial (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT REFERENCES staging.staging_leads(id) ON DELETE CASCADE,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50),
    modificado_por VARCHAR(255),
    fecha_modificacion TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. CREAR TABLA HISTORIAL DE PAGOS (si no existe)
-- ============================================
CREATE TABLE IF NOT EXISTS staging.staging_pagos_historial (
    id BIGSERIAL PRIMARY KEY,
    tabla_origen VARCHAR(100),
    registro_id BIGINT,
    tipo_pago VARCHAR(50),
    monto DECIMAL(12,2),
    detalle TEXT,
    registrado_por VARCHAR(255),
    fecha_registro TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. CREAR INDICES (si no existen)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_leads_historial_lead ON staging.staging_leads_historial(lead_id);
CREATE INDEX IF NOT EXISTS idx_pagos_historial_tabla ON staging.staging_pagos_historial(tabla_origen, registro_id);
CREATE INDEX IF NOT EXISTS idx_leads_estado ON staging.staging_leads(estado_lead);
CREATE INDEX IF NOT EXISTS idx_leads_created ON staging.staging_leads(created_at);

-- ============================================
-- 7. HABILITAR RLS EN NUEVAS TABLAS
-- ============================================
ALTER TABLE staging.staging_leads_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_pagos_historial ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. POLITICAS RLS PARA NUEVAS TABLAS
-- ============================================
-- Leads Historial
DROP POLICY IF EXISTS "authenticated_all_leads_historial" ON staging.staging_leads_historial;
DROP POLICY IF EXISTS "anon_all_leads_historial" ON staging.staging_leads_historial;
CREATE POLICY "authenticated_all_leads_historial" ON staging.staging_leads_historial FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_leads_historial" ON staging.staging_leads_historial FOR ALL TO anon USING (true) WITH CHECK (true);

-- Pagos Historial
DROP POLICY IF EXISTS "authenticated_all_pagos_historial" ON staging.staging_pagos_historial;
DROP POLICY IF EXISTS "anon_all_pagos_historial" ON staging.staging_pagos_historial;
CREATE POLICY "authenticated_all_pagos_historial" ON staging.staging_pagos_historial FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_pagos_historial" ON staging.staging_pagos_historial FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================
-- 9. PERMISOS
-- ============================================
GRANT ALL ON staging.staging_leads_historial TO anon, authenticated;
GRANT ALL ON staging.staging_pagos_historial TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA staging TO anon, authenticated;

-- ============================================
-- FIN DE LA MIGRACION
-- ============================================
-- NOTA: Este script es seguro de ejecutar multiples veces
-- Solo agrega lo que falta, no elimina datos existentes
