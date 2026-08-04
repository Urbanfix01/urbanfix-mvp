begin;

-- Espejo de supabase/migrations. Copia precio y unidad desde el item sanitario real.
do $$
declare
  sanitary_item public.master_items%rowtype;
begin
  select item.*
  into sanitary_item
  from public.master_items item
  where item.name = 'Calado de muro para caños (romper pared)'
    and item.category = 'Albañilería Sanitaria'
    and item.type = 'labor'
    and item.active = true
  order by item.created_at desc
  limit 1;

  if sanitary_item.id is null then
    raise exception 'No se encontro el item sanitario usado como referencia para el calado electrico';
  end if;

  insert into public.master_items (
    name,
    type,
    suggested_price,
    category,
    source_ref,
    technical_notes,
    unit,
    active
  )
  select
    'Calado de muro para cañería eléctrica (romper pared)',
    sanitary_item.type,
    sanitary_item.suggested_price,
    'Electricidad',
    sanitary_item.source_ref,
    'Solo ranurado para cañería eléctrica. No incluye amurado, tapado ni revoque.',
    'metro',
    sanitary_item.active
  where not exists (
    select 1
    from public.master_items target
    where target.name = 'Calado de muro para cañería eléctrica (romper pared)'
      and target.category = 'Electricidad'
      and target.type = 'labor'
  );

  if exists (
    select 1
    from public.master_items target
    where target.name = 'Calado de muro para cañería eléctrica (romper pared)'
      and target.category = 'Electricidad'
      and target.type = 'labor'
      and (
        target.suggested_price is distinct from sanitary_item.suggested_price
        or target.unit is distinct from 'metro'
      )
  ) then
    raise exception 'El item electrico no conserva el precio y la unidad del item sanitario de referencia';
  end if;
end;
$$;

commit;
