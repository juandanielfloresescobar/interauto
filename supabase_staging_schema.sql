-- ==========================================
-- SCHEMA STAGING PARA ERP DATA ENTRY
-- Grupo SAA - Interauto / Rent a Car
-- ==========================================

-- 1. CREAR SCHEMA STAGING
-- ==========================================
CREATE SCHEMA IF NOT EXISTS staging;

-- Dar permisos al rol anon para acceder al schema
GRANT USAGE ON SCHEMA staging TO anon;
GRANT USAGE ON SCHEMA staging TO authenticated;

-- ==========================================
-- 2. TABLAS RENT A CAR
-- ==========================================

-- 2.1 Tabla: staging_rentacar_ingresos
-- Almacena los ingresos mensuales y composición de flota
DROP TABLE IF EXISTS staging.staging_rentacar_ingresos;

CREATE TABLE staging.staging_rentacar_ingresos (
    id BIGSERIAL PRIMARY KEY,
    anio VARCHAR(4) NOT NULL,
    mes VARCHAR(2) NOT NULL,
    ingreso_bs DECIMAL(15,2) NOT NULL DEFAULT 0,
    ingreso_usd DECIMAL(15,2) NOT NULL DEFAULT 0,
    cant_vehiculos INTEGER DEFAULT 0,
    cant_camionetas INTEGER DEFAULT 0,
    cant_suv INTEGER DEFAULT 0,
    cant_fullsize INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pendiente',
    validated_at TIMESTAMPTZ,
    validated_by VARCHAR(100),
    notas TEXT
);

-- Índices
CREATE INDEX idx_rc_ingresos_fecha ON staging.staging_rentacar_ingresos(anio, mes);
CREATE INDEX idx_rc_ingresos_status ON staging.staging_rentacar_ingresos(status);

-- Comentarios
COMMENT ON TABLE staging.staging_rentacar_ingresos IS 'Datos de staging para ingresos mensuales de Rent a Car';
COMMENT ON COLUMN staging.staging_rentacar_ingresos.status IS 'Estados: pendiente, aprobado, rechazado';


-- 2.2 Tabla: staging_rentacar_cobranzas
-- Almacena las cuentas por cobrar (deudas de clientes)
DROP TABLE IF EXISTS staging.staging_rentacar_cobranzas;

CREATE TABLE staging.staging_rentacar_cobranzas (
    id BIGSERIAL PRIMARY KEY,
    fecha_reporte DATE NOT NULL,
    mes_deuda VARCHAR(50) NOT NULL,
    cliente VARCHAR(200) NOT NULL,
    locacion VARCHAR(50) NOT NULL,
    monto_bs DECIMAL(15,2) NOT NULL DEFAULT 0,
    monto_usd DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pendiente',
    validated_at TIMESTAMPTZ,
    validated_by VARCHAR(100),
    notas TEXT
);

-- Índices
CREATE INDEX idx_rc_cobranzas_fecha ON staging.staging_rentacar_cobranzas(fecha_reporte);
CREATE INDEX idx_rc_cobranzas_cliente ON staging.staging_rentacar_cobranzas(cliente);
CREATE INDEX idx_rc_cobranzas_status ON staging.staging_rentacar_cobranzas(status);

-- Comentarios
COMMENT ON TABLE staging.staging_rentacar_cobranzas IS 'Datos de staging para cuentas por cobrar de Rent a Car';


-- ==========================================
-- 3. TABLAS INTERAUTO
-- ==========================================

-- 3.1 Tabla: staging_interauto_ventas
-- Almacena los registros de venta de vehículos
DROP TABLE IF EXISTS staging.staging_interauto_ventas;

CREATE TABLE staging.staging_interauto_ventas (
    id BIGSERIAL PRIMARY KEY,
    fecha_venta DATE NOT NULL,
    vendedor VARCHAR(100) NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    precio_usd DECIMAL(15,2) NOT NULL DEFAULT 0,
    precio_bs DECIMAL(15,2) NOT NULL DEFAULT 0,
    cliente VARCHAR(200),
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pendiente',
    validated_at TIMESTAMPTZ,
    validated_by VARCHAR(100),
    notas TEXT
);

-- Índices
CREATE INDEX idx_ia_ventas_fecha ON staging.staging_interauto_ventas(fecha_venta);
CREATE INDEX idx_ia_ventas_vendedor ON staging.staging_interauto_ventas(vendedor);
CREATE INDEX idx_ia_ventas_marca ON staging.staging_interauto_ventas(marca);
CREATE INDEX idx_ia_ventas_status ON staging.staging_interauto_ventas(status);

-- Índice para segmentación por precio
CREATE INDEX idx_ia_ventas_precio ON staging.staging_interauto_ventas(precio_usd);

-- Comentarios
COMMENT ON TABLE staging.staging_interauto_ventas IS 'Datos de staging para ventas de vehículos de Interauto';
COMMENT ON COLUMN staging.staging_interauto_ventas.precio_usd IS 'Precio en USD para segmentación: Económico(<40k), Medio(40-100k), Premium(100-150k), Lujo(>150k)';


-- 3.2 Tabla: staging_interauto_ingresos
-- Almacena la facturación macro/financiera
DROP TABLE IF EXISTS staging.staging_interauto_ingresos;

CREATE TABLE staging.staging_interauto_ingresos (
    id BIGSERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    monto_bs DECIMAL(15,2) NOT NULL DEFAULT 0,
    monto_usd DECIMAL(15,2) NOT NULL DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pendiente',
    validated_at TIMESTAMPTZ,
    validated_by VARCHAR(100),
    notas TEXT
);

-- Índices
CREATE INDEX idx_ia_ingresos_fecha ON staging.staging_interauto_ingresos(fecha);
CREATE INDEX idx_ia_ingresos_status ON staging.staging_interauto_ingresos(status);

-- Comentarios
COMMENT ON TABLE staging.staging_interauto_ingresos IS 'Datos de staging para ingresos financieros de Interauto';


-- ==========================================
-- 4. TABLA DE AUDITORÍA / LOG DE CAMBIOS
-- ==========================================
DROP TABLE IF EXISTS staging.staging_audit_log;

CREATE TABLE staging.staging_audit_log (
    id BIGSERIAL PRIMARY KEY,
    tabla VARCHAR(100) NOT NULL,
    registro_id BIGINT NOT NULL,
    accion VARCHAR(20) NOT NULL, -- 'INSERT', 'APPROVE', 'REJECT', 'DELETE'
    usuario VARCHAR(100),
    detalles JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_audit_tabla ON staging.staging_audit_log(tabla);
CREATE INDEX idx_audit_accion ON staging.staging_audit_log(accion);
CREATE INDEX idx_audit_fecha ON staging.staging_audit_log(created_at);

-- Comentarios
COMMENT ON TABLE staging.staging_audit_log IS 'Log de auditoría para todas las operaciones de staging';


-- ==========================================
-- 5. PERMISOS RLS (Row Level Security)
-- ==========================================

-- Habilitar RLS en todas las tablas
ALTER TABLE staging.staging_rentacar_ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_rentacar_cobranzas ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_interauto_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_interauto_ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.staging_audit_log ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir INSERT a usuarios anónimos (ERP)
CREATE POLICY "Allow anon insert rentacar_ingresos" ON staging.staging_rentacar_ingresos
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon insert rentacar_cobranzas" ON staging.staging_rentacar_cobranzas
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon insert interauto_ventas" ON staging.staging_interauto_ventas
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon insert interauto_ingresos" ON staging.staging_interauto_ingresos
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon insert audit_log" ON staging.staging_audit_log
    FOR INSERT TO anon WITH CHECK (true);

-- Políticas para permitir SELECT a usuarios anónimos (para verificar registros)
CREATE POLICY "Allow anon select rentacar_ingresos" ON staging.staging_rentacar_ingresos
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon select rentacar_cobranzas" ON staging.staging_rentacar_cobranzas
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon select interauto_ventas" ON staging.staging_interauto_ventas
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon select interauto_ingresos" ON staging.staging_interauto_ingresos
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon select audit_log" ON staging.staging_audit_log
    FOR SELECT TO anon USING (true);


-- ==========================================
-- 6. FUNCIONES ÚTILES
-- ==========================================

-- Función para aprobar un registro y moverlo a producción
CREATE OR REPLACE FUNCTION staging.aprobar_registro(
    p_tabla TEXT,
    p_id BIGINT,
    p_usuario TEXT DEFAULT 'admin'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    EXECUTE format('
        UPDATE staging.%I
        SET status = ''aprobado'',
            validated_at = NOW(),
            validated_by = $1
        WHERE id = $2
    ', p_tabla) USING p_usuario, p_id;

    -- Registrar en auditoría
    INSERT INTO staging.staging_audit_log (tabla, registro_id, accion, usuario)
    VALUES (p_tabla, p_id, 'APPROVE', p_usuario);

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Función para rechazar un registro
CREATE OR REPLACE FUNCTION staging.rechazar_registro(
    p_tabla TEXT,
    p_id BIGINT,
    p_usuario TEXT DEFAULT 'admin',
    p_notas TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    EXECUTE format('
        UPDATE staging.%I
        SET status = ''rechazado'',
            validated_at = NOW(),
            validated_by = $1,
            notas = $2
        WHERE id = $3
    ', p_tabla) USING p_usuario, p_notas, p_id;

    -- Registrar en auditoría
    INSERT INTO staging.staging_audit_log (tabla, registro_id, accion, usuario, detalles)
    VALUES (p_tabla, p_id, 'REJECT', p_usuario, jsonb_build_object('notas', p_notas));

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;


-- ==========================================
-- 7. VISTAS ÚTILES PARA ADMINISTRACIÓN
-- ==========================================

-- Vista: Todos los registros pendientes
CREATE OR REPLACE VIEW staging.v_pendientes AS
SELECT
    'staging_rentacar_ingresos' as tabla,
    id,
    CONCAT(anio, '-', mes) as descripcion,
    created_at,
    created_by,
    status
FROM staging.staging_rentacar_ingresos
WHERE status = 'pendiente'

UNION ALL

SELECT
    'staging_rentacar_cobranzas' as tabla,
    id,
    CONCAT(cliente, ' - ', locacion) as descripcion,
    created_at,
    created_by,
    status
FROM staging.staging_rentacar_cobranzas
WHERE status = 'pendiente'

UNION ALL

SELECT
    'staging_interauto_ventas' as tabla,
    id,
    CONCAT(marca, ' ', modelo, ' - ', vendedor) as descripcion,
    created_at,
    created_by,
    status
FROM staging.staging_interauto_ventas
WHERE status = 'pendiente'

UNION ALL

SELECT
    'staging_interauto_ingresos' as tabla,
    id,
    CONCAT('Facturación ', fecha::text) as descripcion,
    created_at,
    created_by,
    status
FROM staging.staging_interauto_ingresos
WHERE status = 'pendiente'

ORDER BY created_at DESC;


-- Vista: Resumen de registros por estado
CREATE OR REPLACE VIEW staging.v_resumen_status AS
SELECT
    'Rent a Car - Ingresos' as modulo,
    COUNT(*) FILTER (WHERE status = 'pendiente') as pendientes,
    COUNT(*) FILTER (WHERE status = 'aprobado') as aprobados,
    COUNT(*) FILTER (WHERE status = 'rechazado') as rechazados,
    COUNT(*) as total
FROM staging.staging_rentacar_ingresos

UNION ALL

SELECT
    'Rent a Car - Cobranzas' as modulo,
    COUNT(*) FILTER (WHERE status = 'pendiente') as pendientes,
    COUNT(*) FILTER (WHERE status = 'aprobado') as aprobados,
    COUNT(*) FILTER (WHERE status = 'rechazado') as rechazados,
    COUNT(*) as total
FROM staging.staging_rentacar_cobranzas

UNION ALL

SELECT
    'Interauto - Ventas' as modulo,
    COUNT(*) FILTER (WHERE status = 'pendiente') as pendientes,
    COUNT(*) FILTER (WHERE status = 'aprobado') as aprobados,
    COUNT(*) FILTER (WHERE status = 'rechazado') as rechazados,
    COUNT(*) as total
FROM staging.staging_interauto_ventas

UNION ALL

SELECT
    'Interauto - Ingresos' as modulo,
    COUNT(*) FILTER (WHERE status = 'pendiente') as pendientes,
    COUNT(*) FILTER (WHERE status = 'aprobado') as aprobados,
    COUNT(*) FILTER (WHERE status = 'rechazado') as rechazados,
    COUNT(*) as total
FROM staging.staging_interauto_ingresos;


-- ==========================================
-- 8. GRANT FINAL DE PERMISOS
-- ==========================================

-- Permisos completos a las tablas
GRANT ALL ON ALL TABLES IN SCHEMA staging TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA staging TO authenticated;

-- Permisos a secuencias (para los SERIAL)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA staging TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA staging TO authenticated;

-- Permisos a funciones
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA staging TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA staging TO authenticated;


-- ==========================================
-- FIN DEL SCRIPT
-- ==========================================

-- Verificación: Listar todas las tablas creadas
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'staging'
ORDER BY tablename;
