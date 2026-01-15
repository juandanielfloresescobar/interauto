-- ============================================
-- SQL COMPLETO PARA ERP GROUP SAA
-- Esquema: staging
-- Ultima actualizacion: 2026-01-15
-- ============================================
-- FUNCIONALIDADES SOPORTADAS:
-- - Auto-logout despues de 24 horas (manejo frontend)
-- - KPIs de Leads (mes actual, pendientes, en proceso, cerrados)
-- - Modal edicion de leads con historial de cambios
-- - Fuente "Call Center Toyosa" en leads
-- - Modal popup para pagos (total, parcial, negociacion)
-- - Historial de cambios de estado de leads
-- - Historial de pagos para auditoria
-- ============================================

-- Crear esquema si no existe
CREATE SCHEMA IF NOT EXISTS staging;

-- ============================================
-- ELIMINAR TABLAS EXISTENTES
-- ============================================
DROP TABLE IF EXISTS staging.staging_pagos_historial CASCADE;
DROP TABLE IF EXISTS staging.staging_stock_historial CASCADE;
DROP TABLE IF EXISTS staging.staging_leads_historial CASCADE;
DROP TABLE IF EXISTS staging.staging_jetour_stock CASCADE;
DROP TABLE IF EXISTS staging.staging_leads CASCADE;
DROP TABLE IF EXISTS staging.staging_interauto_ingresos CASCADE;
DROP TABLE IF EXISTS staging.staging_interauto_ventas CASCADE;
DROP TABLE IF EXISTS staging.staging_rentacar_flota CASCADE;
DROP TABLE IF EXISTS staging.staging_rentacar_cobranzas CASCADE;
DROP TABLE IF EXISTS staging.staging_rentacar_ingresos CASCADE;

-- ============================================
-- RENT A CAR - INGRESOS
-- ============================================
CREATE TABLE staging.staging_rentacar_ingresos (
    id BIGSERIAL PRIMARY KEY,
    anio INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    nombre_ingreso VARCHAR(255),
    ingreso_bs DECIMAL(12,2) DEFAULT 0,
    ingreso_usd DECIMAL(12,2) DEFAULT 0,
    comentarios TEXT,
    observaciones TEXT,
    es_anticipo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pendiente'
);

-- ============================================
-- RENT A CAR - CUENTAS POR COBRAR
-- Con campos para 3 tipos de pago
-- ============================================
CREATE TABLE staging.staging_rentacar_cobranzas (
    id BIGSERIAL PRIMARY KEY,
    fecha_reporte DATE,
    mes_deuda VARCHAR(50),
    cliente VARCHAR(255),
    locacion VARCHAR(100),
    monto_bs DECIMAL(12,2) DEFAULT 0,
    monto_usd DECIMAL(12,2) DEFAULT 0,
    -- Campos de pago
    pagado BOOLEAN DEFAULT FALSE,
    tipo_pago VARCHAR(50), -- 'total', 'parcial', 'negociacion'
    monto_pagado DECIMAL(12,2) DEFAULT 0,
    saldo_pendiente DECIMAL(12,2) DEFAULT 0,
    detalle_negociacion TEXT,
    fecha_pago TIMESTAMPTZ,
    -- Metadatos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pendiente'
);

-- ============================================
-- RENT A CAR - FLOTA MENSUAL
-- Con fecha de reporte
-- ============================================
CREATE TABLE staging.staging_rentacar_flota (
    id BIGSERIAL PRIMARY KEY,
    fecha_reporte DATE,
    anio INTEGER NOT NULL,
    mes INTEGER NOT NULL,
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
    updated_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pendiente'
);

-- ============================================
-- INTERAUTO - VENTAS
-- Utilidad en BS, campos de pago
-- ============================================
CREATE TABLE staging.staging_interauto_ventas (
    id BIGSERIAL PRIMARY KEY,
    fecha_venta DATE,
    vendedor VARCHAR(255),
    marca VARCHAR(100),
    modelo VARCHAR(255),
    precio_usd DECIMAL(12,2) DEFAULT 0,
    precio_bs DECIMAL(12,2) DEFAULT 0,
    utilidad DECIMAL(12,2) DEFAULT 0, -- EN BS
    es_anticipo BOOLEAN DEFAULT FALSE,
    monto_pendiente DECIMAL(12,2) DEFAULT 0,
    cliente VARCHAR(255),
    observaciones TEXT,
    -- Campos de pago
    pagado BOOLEAN DEFAULT FALSE,
    tipo_pago VARCHAR(50),
    monto_pagado DECIMAL(12,2) DEFAULT 0,
    saldo_pendiente DECIMAL(12,2) DEFAULT 0,
    detalle_negociacion TEXT,
    fecha_pago TIMESTAMPTZ,
    -- Metadatos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pendiente'
);

-- ============================================
-- INTERAUTO - INGRESOS FACTURADOS
-- ============================================
CREATE TABLE staging.staging_interauto_ingresos (
    id BIGSERIAL PRIMARY KEY,
    fecha DATE,
    numero_factura VARCHAR(100),
    nombre_factura VARCHAR(255),
    monto_bs DECIMAL(12,2) DEFAULT 0,
    monto_usd DECIMAL(12,2) DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pendiente'
);

-- ============================================
-- LEADS
-- ============================================
CREATE TABLE staging.staging_leads (
    id BIGSERIAL PRIMARY KEY,
    nombre_cliente VARCHAR(255),
    telefono VARCHAR(50),
    email VARCHAR(255),
    ciudad VARCHAR(100),
    marca_interes VARCHAR(100),
    modelo_interes VARCHAR(255),
    fuente VARCHAR(100),
    estado_lead VARCHAR(50) DEFAULT 'pendiente_llamada',
    ejecutivo_derivado VARCHAR(255),
    presupuesto DECIMAL(12,2),
    fecha_seguimiento DATE,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pendiente'
);

-- ============================================
-- HISTORIAL DE LEADS
-- ============================================
CREATE TABLE staging.staging_leads_historial (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT REFERENCES staging.staging_leads(id) ON DELETE CASCADE,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50),
    modificado_por VARCHAR(255),
    fecha_modificacion TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STOCK JETOUR
-- Con Precio CIF y 3 precios de venta
-- Color y Ubicacion como texto libre
-- ============================================
CREATE TABLE staging.staging_jetour_stock (
    id BIGSERIAL PRIMARY KEY,
    modelo VARCHAR(255),
    anio INTEGER,
    vin VARCHAR(20) UNIQUE,
    color VARCHAR(100), -- Texto libre
    -- Precios
    precio_costo DECIMAL(12,2) DEFAULT 0, -- Precio CIF
    precio_cliente_final DECIMAL(12,2) DEFAULT 0,
    precio_mayorista DECIMAL(12,2) DEFAULT 0,
    precio_grupo DECIMAL(12,2) DEFAULT 0,
    -- Ubicacion como texto libre
    ubicacion VARCHAR(255),
    estado VARCHAR(50) DEFAULT 'disponible',
    -- Venta
    vendido_a VARCHAR(255),
    fecha_venta TIMESTAMPTZ,
    observaciones TEXT,
    -- Metadatos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'activo'
);

-- ============================================
-- HISTORIAL DE STOCK
-- ============================================
CREATE TABLE staging.staging_stock_historial (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT REFERENCES staging.staging_jetour_stock(id) ON DELETE CASCADE,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50),
    modificado_por VARCHAR(255),
    fecha_modificacion TIMESTAMPTZ DEFAULT NOW(),
    detalle TEXT
);

-- ============================================
-- HISTORIAL DE PAGOS (AUDITORIA)
-- ============================================
CREATE TABLE staging.staging_pagos_historial (
    id BIGSERIAL PRIMARY KEY,
    tabla_origen VARCHAR(100),
    registro_id BIGINT,
    tipo_pago VARCHAR(50), -- 'pagado_total', 'pago_parcial', 'negociacion'
    monto DECIMAL(12,2),
    detalle TEXT,
    registrado_por VARCHAR(255),
    fecha_registro TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDICES PARA MEJOR RENDIMIENTO
-- ============================================
CREATE INDEX idx_cobranzas_cliente ON staging.staging_rentacar_cobranzas(cliente);
CREATE INDEX idx_cobranzas_pagado ON staging.staging_rentacar_cobranzas(pagado);
CREATE INDEX idx_ventas_fecha ON staging.staging_interauto_ventas(fecha_venta);
CREATE INDEX idx_ventas_pagado ON staging.staging_interauto_ventas(pagado);
CREATE INDEX idx_leads_estado ON staging.staging_leads(estado_lead);
CREATE INDEX idx_stock_estado ON staging.staging_jetour_stock(estado);
CREATE INDEX idx_stock_modelo ON staging.staging_jetour_stock(modelo);
CREATE INDEX idx_flota_periodo ON staging.staging_rentacar_flota(anio, mes);
CREATE INDEX idx_pagos_tabla ON staging.staging_pagos_historial(tabla_origen, registro_id);

-- ============================================
-- HABILITAR RLS (Row Level Security)
-- ============================================
ALTER TABLE staging.staging_rentacar_ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_rentacar_cobranzas ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_rentacar_flota ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_interauto_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_interauto_ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_leads_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_jetour_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_stock_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_pagos_historial ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLITICAS RLS - Para authenticated Y anon
-- ============================================
-- Rent a Car Ingresos
CREATE POLICY "authenticated_all_rentacar_ingresos" ON staging.staging_rentacar_ingresos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_rentacar_ingresos" ON staging.staging_rentacar_ingresos FOR ALL TO anon USING (true) WITH CHECK (true);

-- Rent a Car Cobranzas
CREATE POLICY "authenticated_all_rentacar_cobranzas" ON staging.staging_rentacar_cobranzas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_rentacar_cobranzas" ON staging.staging_rentacar_cobranzas FOR ALL TO anon USING (true) WITH CHECK (true);

-- Rent a Car Flota
CREATE POLICY "authenticated_all_rentacar_flota" ON staging.staging_rentacar_flota FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_rentacar_flota" ON staging.staging_rentacar_flota FOR ALL TO anon USING (true) WITH CHECK (true);

-- Interauto Ventas
CREATE POLICY "authenticated_all_interauto_ventas" ON staging.staging_interauto_ventas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_interauto_ventas" ON staging.staging_interauto_ventas FOR ALL TO anon USING (true) WITH CHECK (true);

-- Interauto Ingresos
CREATE POLICY "authenticated_all_interauto_ingresos" ON staging.staging_interauto_ingresos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_interauto_ingresos" ON staging.staging_interauto_ingresos FOR ALL TO anon USING (true) WITH CHECK (true);

-- Leads
CREATE POLICY "authenticated_all_leads" ON staging.staging_leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_leads" ON staging.staging_leads FOR ALL TO anon USING (true) WITH CHECK (true);

-- Leads Historial
CREATE POLICY "authenticated_all_leads_historial" ON staging.staging_leads_historial FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_leads_historial" ON staging.staging_leads_historial FOR ALL TO anon USING (true) WITH CHECK (true);

-- Jetour Stock
CREATE POLICY "authenticated_all_jetour_stock" ON staging.staging_jetour_stock FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_jetour_stock" ON staging.staging_jetour_stock FOR ALL TO anon USING (true) WITH CHECK (true);

-- Stock Historial
CREATE POLICY "authenticated_all_stock_historial" ON staging.staging_stock_historial FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_stock_historial" ON staging.staging_stock_historial FOR ALL TO anon USING (true) WITH CHECK (true);

-- Pagos Historial
CREATE POLICY "authenticated_all_pagos_historial" ON staging.staging_pagos_historial FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_pagos_historial" ON staging.staging_pagos_historial FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================
-- PERMISOS - SCHEMA Y TABLAS
-- ============================================
GRANT USAGE ON SCHEMA staging TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA staging TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA staging TO anon, authenticated;

-- Permisos por defecto para nuevas tablas
ALTER DEFAULT PRIVILEGES IN SCHEMA staging GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA staging GRANT ALL ON SEQUENCES TO anon, authenticated;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
