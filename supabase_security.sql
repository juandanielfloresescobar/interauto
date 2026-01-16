-- ============================================
-- SQL DE SEGURIDAD - ERP GROUP SAA
-- Esquema: staging + public.profiles
-- Implementa RLS basado en company_id
-- Fecha: 2026-01-16
-- ============================================

-- ============================================
-- PASO 1: CREAR TABLA DE PERFILES EN PUBLIC
-- ============================================

-- Tabla de empresas/compañías
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de perfiles de usuario vinculada a auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'usuario', -- 'admin', 'gerente', 'usuario', 'visualizador'
    modulos TEXT[] DEFAULT '{}', -- Array de módulos permitidos: 'rentacar', 'interauto', 'leads', 'jetour', 'ejecutivo_leads'
    permisos TEXT[] DEFAULT '{ver}', -- 'ver', 'crear', 'editar', 'eliminar'
    nombre_display VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_company ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_activo ON public.profiles(activo);

-- ============================================
-- PASO 2: TRIGGER PARA AUTO-CREAR PERFIL
-- ============================================

-- Función que crea perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nombre_display)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PASO 3: FUNCIÓN PARA OBTENER COMPANY_ID DEL USUARIO
-- ============================================

CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID AS $$
    SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Función para verificar si usuario está activo
CREATE OR REPLACE FUNCTION public.is_user_active()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT activo FROM public.profiles WHERE id = auth.uid()),
        FALSE
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Función para verificar permiso específico
CREATE OR REPLACE FUNCTION public.has_permission(permiso TEXT)
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT permiso = ANY(permisos) FROM public.profiles WHERE id = auth.uid() AND activo = TRUE),
        FALSE
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Función para verificar acceso a módulo
CREATE OR REPLACE FUNCTION public.has_module_access(modulo TEXT)
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT modulo = ANY(modulos) FROM public.profiles WHERE id = auth.uid() AND activo = TRUE),
        FALSE
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- PASO 4: MODIFICAR TABLAS DE STAGING
-- Agregar company_id a todas las tablas
-- ============================================

-- Recrear esquema staging
CREATE SCHEMA IF NOT EXISTS staging;

-- Eliminar tablas existentes para recrearlas con company_id
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

-- RENT A CAR - INGRESOS
CREATE TABLE staging.staging_rentacar_ingresos (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id),
    anio INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    nombre_ingreso VARCHAR(255),
    ingreso_bs DECIMAL(12,2) DEFAULT 0,
    ingreso_usd DECIMAL(12,2) DEFAULT 0,
    comentarios TEXT,
    observaciones TEXT,
    es_anticipo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'pendiente'
);

-- RENT A CAR - COBRANZAS
CREATE TABLE staging.staging_rentacar_cobranzas (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id),
    fecha_reporte DATE,
    mes_deuda VARCHAR(50),
    cliente VARCHAR(255),
    locacion VARCHAR(100),
    monto_bs DECIMAL(12,2) DEFAULT 0,
    monto_usd DECIMAL(12,2) DEFAULT 0,
    pagado BOOLEAN DEFAULT FALSE,
    tipo_pago VARCHAR(50),
    monto_pagado DECIMAL(12,2) DEFAULT 0,
    saldo_pendiente DECIMAL(12,2) DEFAULT 0,
    detalle_negociacion TEXT,
    fecha_pago TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'pendiente'
);

-- RENT A CAR - FLOTA
CREATE TABLE staging.staging_rentacar_flota (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id),
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
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'pendiente'
);

-- INTERAUTO - VENTAS
CREATE TABLE staging.staging_interauto_ventas (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id),
    fecha_venta DATE,
    vendedor VARCHAR(255),
    marca VARCHAR(100),
    modelo VARCHAR(255),
    precio_usd DECIMAL(12,2) DEFAULT 0,
    precio_bs DECIMAL(12,2) DEFAULT 0,
    utilidad DECIMAL(12,2) DEFAULT 0,
    es_anticipo BOOLEAN DEFAULT FALSE,
    monto_pendiente DECIMAL(12,2) DEFAULT 0,
    cliente VARCHAR(255),
    observaciones TEXT,
    pagado BOOLEAN DEFAULT FALSE,
    tipo_pago VARCHAR(50),
    monto_pagado DECIMAL(12,2) DEFAULT 0,
    saldo_pendiente DECIMAL(12,2) DEFAULT 0,
    detalle_negociacion TEXT,
    fecha_pago TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'pendiente'
);

-- INTERAUTO - INGRESOS
CREATE TABLE staging.staging_interauto_ingresos (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id),
    fecha DATE,
    numero_factura VARCHAR(100),
    nombre_factura VARCHAR(255),
    monto_bs DECIMAL(12,2) DEFAULT 0,
    monto_usd DECIMAL(12,2) DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'pendiente'
);

-- LEADS
CREATE TABLE staging.staging_leads (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id),
    nombre_cliente VARCHAR(255),
    telefono VARCHAR(50),
    email VARCHAR(255),
    ciudad VARCHAR(100),
    ciudad_otro VARCHAR(255),
    marca_interes VARCHAR(100),
    modelo_interes VARCHAR(255),
    fuente VARCHAR(100),
    estado_lead VARCHAR(50) DEFAULT 'pendiente_llamada',
    ejecutivo_derivado VARCHAR(255),
    presupuesto DECIMAL(12,2),
    fecha_seguimiento DATE,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'pendiente'
);

-- LEADS HISTORIAL
CREATE TABLE staging.staging_leads_historial (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id),
    lead_id BIGINT REFERENCES staging.staging_leads(id) ON DELETE CASCADE,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50),
    modificado_por UUID REFERENCES auth.users(id),
    fecha_modificacion TIMESTAMPTZ DEFAULT NOW()
);

-- JETOUR STOCK
CREATE TABLE staging.staging_jetour_stock (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id),
    modelo VARCHAR(255),
    anio INTEGER,
    vin VARCHAR(20) UNIQUE,
    color VARCHAR(100),
    precio_costo DECIMAL(12,2) DEFAULT 0,
    precio_cliente_final DECIMAL(12,2) DEFAULT 0,
    precio_mayorista DECIMAL(12,2) DEFAULT 0,
    precio_grupo DECIMAL(12,2) DEFAULT 0,
    ubicacion VARCHAR(255),
    punto_llegada VARCHAR(50),
    fecha_llegada DATE,
    estado VARCHAR(50) DEFAULT 'disponible',
    vendido_a VARCHAR(255),
    fecha_venta TIMESTAMPTZ,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'activo'
);

-- STOCK HISTORIAL
CREATE TABLE staging.staging_stock_historial (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id),
    stock_id BIGINT REFERENCES staging.staging_jetour_stock(id) ON DELETE CASCADE,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50),
    modificado_por UUID REFERENCES auth.users(id),
    fecha_modificacion TIMESTAMPTZ DEFAULT NOW(),
    detalle TEXT
);

-- PAGOS HISTORIAL
CREATE TABLE staging.staging_pagos_historial (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id),
    tabla_origen VARCHAR(100),
    registro_id BIGINT,
    tipo_pago VARCHAR(50),
    monto DECIMAL(12,2),
    detalle TEXT,
    registrado_por UUID REFERENCES auth.users(id),
    fecha_registro TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PASO 5: ÍNDICES
-- ============================================
CREATE INDEX idx_rc_ingresos_company ON staging.staging_rentacar_ingresos(company_id);
CREATE INDEX idx_rc_cobranzas_company ON staging.staging_rentacar_cobranzas(company_id);
CREATE INDEX idx_rc_flota_company ON staging.staging_rentacar_flota(company_id);
CREATE INDEX idx_ia_ventas_company ON staging.staging_interauto_ventas(company_id);
CREATE INDEX idx_ia_ingresos_company ON staging.staging_interauto_ingresos(company_id);
CREATE INDEX idx_leads_company ON staging.staging_leads(company_id);
CREATE INDEX idx_leads_historial_company ON staging.staging_leads_historial(company_id);
CREATE INDEX idx_jetour_stock_company ON staging.staging_jetour_stock(company_id);
CREATE INDEX idx_stock_historial_company ON staging.staging_stock_historial(company_id);
CREATE INDEX idx_pagos_historial_company ON staging.staging_pagos_historial(company_id);

-- ============================================
-- PASO 6: HABILITAR RLS
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

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
-- PASO 7: POLÍTICAS RLS ESTRICTAS
-- ============================================

-- PROFILES: Usuario solo ve su propio perfil
CREATE POLICY "users_view_own_profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());

CREATE POLICY "users_update_own_profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- COMPANIES: Solo ver si pertenece
CREATE POLICY "users_view_own_company" ON public.companies
    FOR SELECT TO authenticated
    USING (id = public.get_my_company_id());

-- STAGING TABLES: Solo ver/editar registros de su empresa

-- Rent a Car Ingresos
CREATE POLICY "company_select_rc_ingresos" ON staging.staging_rentacar_ingresos
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id() AND public.is_user_active());

CREATE POLICY "company_insert_rc_ingresos" ON staging.staging_rentacar_ingresos
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id() AND public.has_permission('crear'));

CREATE POLICY "company_update_rc_ingresos" ON staging.staging_rentacar_ingresos
    FOR UPDATE TO authenticated
    USING (company_id = public.get_my_company_id() AND public.has_permission('editar'))
    WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "company_delete_rc_ingresos" ON staging.staging_rentacar_ingresos
    FOR DELETE TO authenticated
    USING (company_id = public.get_my_company_id() AND public.has_permission('eliminar'));

-- Rent a Car Cobranzas
CREATE POLICY "company_select_rc_cobranzas" ON staging.staging_rentacar_cobranzas
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id() AND public.is_user_active());

CREATE POLICY "company_insert_rc_cobranzas" ON staging.staging_rentacar_cobranzas
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id() AND public.has_permission('crear'));

CREATE POLICY "company_update_rc_cobranzas" ON staging.staging_rentacar_cobranzas
    FOR UPDATE TO authenticated
    USING (company_id = public.get_my_company_id() AND public.has_permission('editar'))
    WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "company_delete_rc_cobranzas" ON staging.staging_rentacar_cobranzas
    FOR DELETE TO authenticated
    USING (company_id = public.get_my_company_id() AND public.has_permission('eliminar'));

-- Rent a Car Flota
CREATE POLICY "company_select_rc_flota" ON staging.staging_rentacar_flota
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id() AND public.is_user_active());

CREATE POLICY "company_insert_rc_flota" ON staging.staging_rentacar_flota
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id() AND public.has_permission('crear'));

CREATE POLICY "company_update_rc_flota" ON staging.staging_rentacar_flota
    FOR UPDATE TO authenticated
    USING (company_id = public.get_my_company_id() AND public.has_permission('editar'))
    WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "company_delete_rc_flota" ON staging.staging_rentacar_flota
    FOR DELETE TO authenticated
    USING (company_id = public.get_my_company_id() AND public.has_permission('eliminar'));

-- Interauto Ventas
CREATE POLICY "company_select_ia_ventas" ON staging.staging_interauto_ventas
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id() AND public.is_user_active());

CREATE POLICY "company_insert_ia_ventas" ON staging.staging_interauto_ventas
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id() AND public.has_permission('crear'));

CREATE POLICY "company_update_ia_ventas" ON staging.staging_interauto_ventas
    FOR UPDATE TO authenticated
    USING (company_id = public.get_my_company_id() AND public.has_permission('editar'))
    WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "company_delete_ia_ventas" ON staging.staging_interauto_ventas
    FOR DELETE TO authenticated
    USING (company_id = public.get_my_company_id() AND public.has_permission('eliminar'));

-- Interauto Ingresos
CREATE POLICY "company_select_ia_ingresos" ON staging.staging_interauto_ingresos
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id() AND public.is_user_active());

CREATE POLICY "company_insert_ia_ingresos" ON staging.staging_interauto_ingresos
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id() AND public.has_permission('crear'));

CREATE POLICY "company_update_ia_ingresos" ON staging.staging_interauto_ingresos
    FOR UPDATE TO authenticated
    USING (company_id = public.get_my_company_id() AND public.has_permission('editar'))
    WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "company_delete_ia_ingresos" ON staging.staging_interauto_ingresos
    FOR DELETE TO authenticated
    USING (company_id = public.get_my_company_id() AND public.has_permission('eliminar'));

-- Leads
CREATE POLICY "company_select_leads" ON staging.staging_leads
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id() AND public.is_user_active());

CREATE POLICY "company_insert_leads" ON staging.staging_leads
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id() AND public.has_permission('crear'));

CREATE POLICY "company_update_leads" ON staging.staging_leads
    FOR UPDATE TO authenticated
    USING (company_id = public.get_my_company_id() AND public.has_permission('editar'))
    WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "company_delete_leads" ON staging.staging_leads
    FOR DELETE TO authenticated
    USING (company_id = public.get_my_company_id() AND public.has_permission('eliminar'));

-- Leads Historial
CREATE POLICY "company_select_leads_historial" ON staging.staging_leads_historial
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id() AND public.is_user_active());

CREATE POLICY "company_insert_leads_historial" ON staging.staging_leads_historial
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id());

-- Jetour Stock
CREATE POLICY "company_select_jetour_stock" ON staging.staging_jetour_stock
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id() AND public.is_user_active());

CREATE POLICY "company_insert_jetour_stock" ON staging.staging_jetour_stock
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id() AND public.has_permission('crear'));

CREATE POLICY "company_update_jetour_stock" ON staging.staging_jetour_stock
    FOR UPDATE TO authenticated
    USING (company_id = public.get_my_company_id() AND public.has_permission('editar'))
    WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "company_delete_jetour_stock" ON staging.staging_jetour_stock
    FOR DELETE TO authenticated
    USING (company_id = public.get_my_company_id() AND public.has_permission('eliminar'));

-- Stock Historial
CREATE POLICY "company_select_stock_historial" ON staging.staging_stock_historial
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id() AND public.is_user_active());

CREATE POLICY "company_insert_stock_historial" ON staging.staging_stock_historial
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id());

-- Pagos Historial
CREATE POLICY "company_select_pagos_historial" ON staging.staging_pagos_historial
    FOR SELECT TO authenticated
    USING (company_id = public.get_my_company_id() AND public.is_user_active());

CREATE POLICY "company_insert_pagos_historial" ON staging.staging_pagos_historial
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_my_company_id());

-- ============================================
-- PASO 8: PERMISOS DE ESQUEMA
-- ============================================
GRANT USAGE ON SCHEMA staging TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA staging TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA staging TO authenticated;

-- NO dar permisos a anon en staging
REVOKE ALL ON ALL TABLES IN SCHEMA staging FROM anon;
REVOKE USAGE ON SCHEMA staging FROM anon;

-- Permisos en public para profiles y companies
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.companies TO authenticated;

-- Permitir ejecutar funciones
GRANT EXECUTE ON FUNCTION public.get_my_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_module_access(TEXT) TO authenticated;

-- Default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA staging GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA staging GRANT ALL ON SEQUENCES TO authenticated;

-- ============================================
-- PASO 9: DATOS INICIALES
-- Crear empresa Group SAA
-- ============================================
INSERT INTO public.companies (id, nombre, codigo)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Group SAA', 'GROUPSAA')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================
-- PASO 10: ACTUALIZAR PERFILES EXISTENTES
-- Asignar empresa y permisos a usuarios actuales
-- ============================================

-- Función para actualizar perfil de usuario existente
CREATE OR REPLACE FUNCTION public.setup_user_profile(
    user_email TEXT,
    user_rol TEXT,
    user_modulos TEXT[],
    user_permisos TEXT[],
    user_nombre TEXT
)
RETURNS VOID AS $$
DECLARE
    user_id UUID;
    company UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'; -- Group SAA
BEGIN
    -- Buscar usuario por email
    SELECT id INTO user_id FROM auth.users WHERE email = user_email;

    IF user_id IS NOT NULL THEN
        -- Actualizar o insertar perfil
        INSERT INTO public.profiles (id, email, company_id, rol, modulos, permisos, nombre_display, activo)
        VALUES (user_id, user_email, company, user_rol, user_modulos, user_permisos, user_nombre, TRUE)
        ON CONFLICT (id) DO UPDATE SET
            company_id = company,
            rol = user_rol,
            modulos = user_modulos,
            permisos = user_permisos,
            nombre_display = user_nombre,
            activo = TRUE,
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Configurar usuarios existentes
SELECT public.setup_user_profile('pablo.toro@saavrentacar.com', 'admin', ARRAY['rentacar'], ARRAY['ver', 'crear', 'editar'], 'Rent a Car Admin');
SELECT public.setup_user_profile('daniela.eguez@groupsaa.com', 'gerente', ARRAY['interauto', 'leads'], ARRAY['ver', 'crear', 'editar'], 'Interauto Admin');
SELECT public.setup_user_profile('yngrid.numbela@groupsaa.com', 'visualizador', ARRAY['leads'], ARRAY['ver'], 'Leads Manager');
SELECT public.setup_user_profile('diego.zapata@groupsaa.com', 'usuario', ARRAY['ejecutivo_leads'], ARRAY['ver', 'crear', 'editar'], 'Ejecutivo de Leads');
SELECT public.setup_user_profile('juan.flores@groupsaa.com', 'gerente', ARRAY['jetour', 'interauto'], ARRAY['ver', 'crear', 'editar'], 'Stock Jetour');
SELECT public.setup_user_profile('german.decebal@groupsaa.com', 'visualizador', ARRAY['leads'], ARRAY['ver'], 'Leads Manager');

-- ============================================
-- FIN DEL SCRIPT DE SEGURIDAD
-- ============================================
