begin;

-- Espejo de supabase/migrations. Corrige solo rubro y procedencia.
create temporary table _urbanfix_electrical_wall_chasing_price_audit on commit drop as
select id, suggested_price, unit
from public.master_items
where name = 'Calado de muro para cañería eléctrica (romper pared)'
  and type = 'labor';

do $$
declare
  affected_rows integer;
begin
  update public.master_items
  set
    category = 'Electricidad',
    source_ref = 'mo_rubro_electricidad'
  where name = 'Calado de muro para cañería eléctrica (romper pared)'
    and type = 'labor';

  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'Se esperaba corregir exactamente un item de calado electrico; encontrados: %', affected_rows;
  end if;

  if exists (
    select 1
    from _urbanfix_electrical_wall_chasing_price_audit audit
    join public.master_items item on item.id = audit.id
    where item.suggested_price is distinct from audit.suggested_price
      or item.unit is distinct from audit.unit
  ) then
    raise exception 'La correccion de rubro intento modificar el precio o la unidad';
  end if;
end;
$$;

commit;
