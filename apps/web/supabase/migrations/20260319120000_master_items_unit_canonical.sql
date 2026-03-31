with normalized as (
  select
    id,
    lower(
      regexp_replace(
        translate(btrim(coalesce(unit, '')), 'ÁÉÍÓÚáéíóú²³', 'AEIOUaeiou23'),
        '\s+',
        ' ',
        'g'
      )
    ) as raw_unit
  from public.master_items
  where unit is not null
    and btrim(unit) <> ''
)
update public.master_items mi
set unit = case
  when normalized.raw_unit in ('m2', 'mt2', 'metro cuadrado', 'metros cuadrados', 'por m2') then 'm2'
  when normalized.raw_unit in ('m3', 'mt3', 'metro cubico', 'metros cubicos', 'por m3') then 'm3'
  when normalized.raw_unit in ('ml', 'm lineal', 'metro lineal', 'metros lineales') then 'ml'
  when normalized.raw_unit in ('m', 'metro', 'metros') then 'metro'
  when normalized.raw_unit in ('u', 'un', 'unid', 'unidad', 'unidades') then 'unidad'
  when normalized.raw_unit in ('boca', 'bocas') then 'boca'
  when normalized.raw_unit in ('hora', 'horas') then 'hora'
  when normalized.raw_unit in ('jornada', 'jornadas') then 'jornada'
  when normalized.raw_unit in ('dia', 'dias') then 'dia'
  when normalized.raw_unit in ('global') then 'global'
  when normalized.raw_unit in ('kg', 'kilo', 'kilos') then 'kg'
  when normalized.raw_unit in ('jgo', 'juego', 'juegos') then 'juego'
  when normalized.raw_unit in ('union', 'uniones') then 'union'
  when normalized.raw_unit in ('par', 'pares') then 'par'
  else normalized.raw_unit
end
from normalized
where mi.id = normalized.id
  and mi.unit is distinct from case
    when normalized.raw_unit in ('m2', 'mt2', 'metro cuadrado', 'metros cuadrados', 'por m2') then 'm2'
    when normalized.raw_unit in ('m3', 'mt3', 'metro cubico', 'metros cubicos', 'por m3') then 'm3'
    when normalized.raw_unit in ('ml', 'm lineal', 'metro lineal', 'metros lineales') then 'ml'
    when normalized.raw_unit in ('m', 'metro', 'metros') then 'metro'
    when normalized.raw_unit in ('u', 'un', 'unid', 'unidad', 'unidades') then 'unidad'
    when normalized.raw_unit in ('boca', 'bocas') then 'boca'
    when normalized.raw_unit in ('hora', 'horas') then 'hora'
    when normalized.raw_unit in ('jornada', 'jornadas') then 'jornada'
    when normalized.raw_unit in ('dia', 'dias') then 'dia'
    when normalized.raw_unit in ('global') then 'global'
    when normalized.raw_unit in ('kg', 'kilo', 'kilos') then 'kg'
    when normalized.raw_unit in ('jgo', 'juego', 'juegos') then 'juego'
    when normalized.raw_unit in ('union', 'uniones') then 'union'
    when normalized.raw_unit in ('par', 'pares') then 'par'
    else normalized.raw_unit
  end;
