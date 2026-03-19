alter table if exists public.master_items
  add column if not exists unit text;

with extracted as (
  select
    id,
    trim(
      regexp_replace(
        substring(coalesce(technical_notes, '') from 'Unidad de referencia:\s*([^\r\n]+)'),
        '^Unidad de referencia:\s*',
        '',
        'i'
      )
    ) as extracted_unit
  from public.master_items
)
update public.master_items mi
set unit = case
  when lower(coalesce(extracted.extracted_unit, '')) in ('m2', 'mt2', 'metro cuadrado', 'metros cuadrados') then 'm2'
  when lower(coalesce(extracted.extracted_unit, '')) in ('m3', 'mt3', 'metro cubico', 'metros cubicos') then 'm3'
  when lower(coalesce(extracted.extracted_unit, '')) in ('ml', 'metro lineal', 'metros lineales') then 'ml'
  when lower(coalesce(extracted.extracted_unit, '')) in ('metro', 'metros') then 'metro'
  when lower(coalesce(extracted.extracted_unit, '')) in ('boca', 'bocas') then 'boca'
  when extracted.extracted_unit is null or extracted.extracted_unit = '' then mi.unit
  else lower(extracted.extracted_unit)
end
from extracted
where mi.id = extracted.id
  and (mi.unit is null or btrim(mi.unit) = '')
  and extracted.extracted_unit is not null
  and extracted.extracted_unit <> '';
