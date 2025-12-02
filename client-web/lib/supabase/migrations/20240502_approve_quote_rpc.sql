-- 1. FUNCIÓN RPC (Vital para el botón Aceptar)
-- Usamos 'CREATE OR REPLACE' para que no falle si ya existe
CREATE OR REPLACE FUNCTION approve_quote(quote_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE quotes
  SET 
    status = 'approved',
    updated_at = NOW()
  WHERE id = quote_id
  AND status = 'pending'; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. POLÍTICAS DE SEGURIDAD (RLS)
-- Primero limpiamos para evitar el error 42710
DROP POLICY IF EXISTS "Public Read Quote by ID" ON quotes;
DROP POLICY IF EXISTS "Public Read Items" ON quote_items;
DROP POLICY IF EXISTS "Public Read Profiles" ON profiles;

-- Ahora las creamos frescas
CREATE POLICY "Public Read Quote by ID"
ON quotes FOR SELECT
USING (true); 

CREATE POLICY "Public Read Items"
ON quote_items FOR SELECT
USING (true);

CREATE POLICY "Public Read Profiles"
ON profiles FOR SELECT
USING (true);