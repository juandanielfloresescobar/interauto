-- ============================================
-- FIX RAPIDO: Crear perfiles para usuarios existentes
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Asegurar que existe la empresa Group SAA
INSERT INTO public.companies (id, nombre, codigo)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Group SAA', 'GROUPSAA')
ON CONFLICT (codigo) DO NOTHING;

-- 1.5 Configurar RLS para profiles y companies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_profile" ON public.profiles;
CREATE POLICY "users_read_own_profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
CREATE POLICY "users_update_own_profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "authenticated_read_companies" ON public.companies;
CREATE POLICY "authenticated_read_companies" ON public.companies
    FOR SELECT TO authenticated
    USING (true);

-- Permisos
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.companies TO authenticated;

-- 2. Crear perfiles para TODOS los usuarios que no tienen perfil
-- Les da acceso completo (admin) - ajustar después si es necesario
INSERT INTO public.profiles (id, email, company_id, rol, modulos, permisos, nombre_display, activo)
SELECT
    u.id,
    u.email,
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID,
    'admin',
    ARRAY['rentacar', 'interauto', 'leads', 'jetour', 'ejecutivo_leads'],
    ARRAY['ver', 'crear', 'editar', 'eliminar'],
    COALESCE(u.raw_user_meta_data->>'full_name', SPLIT_PART(u.email, '@', 1)),
    TRUE
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- 3. Verificar perfiles creados
SELECT p.email, p.rol, p.modulos, p.permisos, p.activo, c.nombre as empresa
FROM public.profiles p
LEFT JOIN public.companies c ON p.company_id = c.id;
