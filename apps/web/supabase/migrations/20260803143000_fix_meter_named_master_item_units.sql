begin;

-- Cambio dirigido: solo corrige la unidad de filas cuyo propio nombre declara "(Metro)".
-- suggested_price se copia para auditar que esta migracion no altere ningun importe.
create temporary table _urbanfix_meter_unit_price_audit on commit drop as
select id, suggested_price
from public.master_items
where name ~* '\(\s*metros?\s*\)';

update public.master_items
set unit = 'metro'
where name ~* '\(\s*metros?\s*\)'
  and coalesce(lower(trim(unit)), '') not in ('m', 'metro', 'metros');

do $$
begin
  if exists (
    select 1
    from _urbanfix_meter_unit_price_audit audit
    join public.master_items item on item.id = audit.id
    where item.suggested_price is distinct from audit.suggested_price
  ) then
    raise exception 'La normalizacion de unidades intento modificar un precio';
  end if;
end;
$$;

commit;
