begin;

create temporary table _aaieric_electricidad_julio_2026 (
  legacy_name text,
  legacy_unit text,
  name text not null,
  suggested_price numeric not null,
  category text not null,
  unit text not null,
  detail text
) on commit drop;

insert into _aaieric_electricidad_julio_2026
  (legacy_name, legacy_unit, name, suggested_price, category, unit, detail)
values
  ('Visita de Asesoramiento y Presupuesto', 'global', 'Visita: inspección, evaluación, diagnóstico, asesoramiento y presupuesto', 54310, 'Básicos', 'global', null),
  ('Urgencia (Horario Especial)', 'global', 'Urgencia: lunes a sábado desde las 20 h, domingos y feriados (mínimo)', 130203, 'Básicos', 'global', null),
  (null, null, 'Unidad básica de cotización: boca completa', 108431, 'Básicos', 'boca', 'Caja estándar y hasta 5 m de cañería entre bocas. Incluye canalización, amurado, cableado reglamentario, conexión de módulos y portalámparas de obra; no incluye artefactos ni terminación de canaletas.'),
  ('Service - Instalación (Mínimo)', 'unidad', 'Service - Instalación (mínimo)', 108431, 'Básicos', 'unidad', null),
  (null, null, 'Hora de trabajo (mínimo)', 54310, 'Básicos', 'hora', null),
  (null, null, 'Hora de trabajo (promedio)', 54310, 'Básicos', 'hora', null),
  ('Emergencia (Horario Normal)', 'global', 'Emergencia: lunes a sábado de 8 a 20 h (atención inmediata)', 108431, 'Básicos', 'global', null),

  ('En losa con caño metálico', 'boca', 'Canalización en losa con caño metálico', 54894, 'Canalización', 'boca', null),
  ('En loseta con caño metálico', 'boca', 'Canalización en loseta con caño metálico', 57637, 'Canalización', 'boca', null),
  ('Amurado mampostería (Ladrillo común)', 'boca', 'Amurado de cañería en mampostería de ladrillo común', 62382, 'Canalización', 'boca', null),
  ('Amurado mampostería (Ladrillo hueco)', 'boca', 'Amurado de cañería en mampostería de ladrillo hueco', 60900, 'Canalización', 'boca', null),
  ('Amurado mampostería (Ladrillo común)', 'metro', 'Amurado de cañería en mampostería de ladrillo común', 14909, 'Canalización', 'metro', null),
  ('Amurado mampostería (Ladrillo hueco)', 'metro', 'Amurado de cañería en mampostería de ladrillo hueco', 14618, 'Canalización', 'metro', null),
  ('Amurado a la vista', 'boca', 'Canalización a la vista en metal, PVC o cablecanal 14 x 30', 49861, 'Canalización', 'boca', null),
  ('Pase de viga y/o columna', 'boca', 'Pase de viga y/o columna', 57898, 'Canalización', 'boca', 'Se cotiza a razón de una boca por pase.'),

  ('Cable subterráneo en Tierra', 'metro', 'Cable subterráneo en tierra', 54260, 'Cableado', 'metro', null),
  ('Cable subterráneo en Piso', 'metro', 'Cable subterráneo en piso', 57898, 'Cableado', 'metro', null),
  ('Adicional por caja de paso (Tierra)', 'unidad', 'Adicional por caja de paso para cable subterráneo en tierra', 59587, 'Cableado', 'unidad', null),
  ('Adicional por caja de paso (Piso)', 'unidad', 'Adicional por caja de paso para cable subterráneo en piso', 63628, 'Cableado', 'unidad', null),
  ('Obra nueva (Canalización propia)', 'boca', 'Cableado en obra nueva - Canalización realizada por el profesional', 26680, 'Cableado', 'boca', null),
  ('Obra nueva (Canalización de otro)', 'boca', 'Cableado en obra nueva - Canalización realizada por otro profesional', 37149, 'Cableado', 'boca', null),
  ('Recableado con artefactos', 'boca', 'Recableado con artefactos', 55707, 'Cableado', 'boca', 'No incluye cables pegados a la cañería ni otros vicios ocultos; esos trabajos se cotizan al detectarlos.'),
  ('Recableado sin artefactos', 'boca', 'Recableado sin artefactos', 37149, 'Cableado', 'boca', 'No incluye cables pegados a la cañería ni otros vicios ocultos; esos trabajos se cotizan al detectarlos.'),

  ('Punto, toma simple, portalámpara', 'boca', 'Conexión de punto, toma simple o portalámpara', 19363, 'Conexiones', 'boca', null),
  ('Toma doble', 'boca', 'Conexión de toma doble', 24525, 'Conexiones', 'boca', null),
  ('Punto Combinación', 'boca', 'Conexión de punto combinación', 20842, 'Conexiones', 'boca', null),

  ('TP Monofásico (1 ID + 1 TM + PAT)', 'unidad', 'Tablero principal monofásico con 1 ID, 1 TM y PAT', 320310, 'Tableros', 'unidad', 'Incluye canalización, amurado y conexión.'),
  (null, null, 'Tablero principal monofásico - Solo PAT', 162585, 'Tableros', 'unidad', 'Incluye canalización, amurado y conexión.'),
  ('TP Trifásico (1 ID + 1 TM + PAT)', 'unidad', 'Tablero principal trifásico con 1 ID, 1 TM y PAT', 433760, 'Tableros', 'unidad', 'Incluye canalización, amurado y conexión.'),
  ('Módulos: ID, ITM bipolar adicional', 'unidad', 'Módulo adicional ID, ITM u otro bipolar', 78754, 'Tableros', 'unidad', null),
  (null, null, 'Módulo adicional ID tetrapolar', 135580, 'Tableros', 'unidad', null),
  (null, null, 'Módulo adicional ITM tetrapolar', 135580, 'Tableros', 'unidad', null),
  (null, null, 'Módulo adicional ITM tripolar', 114381, 'Tableros', 'unidad', null),
  ('Tablero Seccional: Hasta 8 polos', 'unidad', 'Tablero seccional hasta 8 polos', 227652, 'Tableros', 'unidad', null),
  ('Tablero Seccional: De 8 a 36 polos', 'unidad', 'Tablero seccional de 8 a 36 polos', 910719, 'Tableros', 'unidad', null),
  (null, null, 'Tablero seccional de 36 a 54 polos', 1366016, 'Tableros', 'unidad', null),

  (null, null, 'Artefacto aplique simple', 29715, 'Iluminación', 'unidad', null),
  (null, null, 'Spot LED', 29715, 'Iluminación', 'unidad', null),
  ('Artefacto colgante liviano 3 luces', 'unidad', 'Artefacto colgante liviano de 3 luces y 1 efecto', 59431, 'Iluminación', 'unidad', null),
  ('Artefacto colgante liviano 5 luces', 'unidad', 'Artefacto colgante liviano de 5 luces y 1 efecto', 78730, 'Iluminación', 'unidad', null),
  (null, null, 'Artefacto colgante - Adicional por efecto', 19363, 'Iluminación', 'unidad', null),
  (null, null, 'Artefacto colgante pesado (mínimo)', 103978, 'Iluminación', 'unidad', null),
  (null, null, 'Equipo de tubo LED simple de 7 W a 36 W', 59431, 'Iluminación', 'unidad', null),
  (null, null, 'Equipo de tubo LED doble de 7 W a 36 W', 73159, 'Iluminación', 'unidad', null),
  (null, null, 'Equipo de tubo LED de 45 W', 74319, 'Iluminación', 'unidad', null),
  (null, null, 'Equipo de tubo LED doble de 45 W', 92225, 'Iluminación', 'unidad', null),
  ('Ventilador de techo (solo)', 'unidad', 'Ventilador de techo', 108431, 'Iluminación', 'unidad', null),
  ('Ventilador de techo con luminaria', 'unidad', 'Ventilador de techo con luminaria de 1 efecto', 135580, 'Iluminación', 'unidad', null),

  ('Gabinete 1 Medidor Monofásico', 'unidad', 'Acometida en pilar o muro - Gabinete para 1 medidor monofásico', 227652, 'Acometidas', 'unidad', 'Incluye amurado, conexión y PAT de servicio.'),
  (null, null, 'Acometida en pilar o muro - Gabinete para 2 medidores monofásicos', 325340, 'Acometidas', 'unidad', 'Incluye amurado, conexión y PAT de servicio.'),
  (null, null, 'Acometida en pilar o muro - Gabinete para 3 medidores monofásicos', 758988, 'Acometidas', 'unidad', 'Incluye amurado, conexión, PAT de servicio y caja de toma de 63 A.'),
  (null, null, 'Acometida en pilar o muro - Gabinete para 4 medidores monofásicos', 867405, 'Acometidas', 'unidad', 'Incluye amurado, conexión, PAT de servicio y caja de toma de 63 A.'),
  ('PAT de Servicio', 'unidad', 'PAT de servicio con jabalina y caja de inspección', 162585, 'Acometidas', 'unidad', null),
  ('Pilar completo', 'unidad', 'Pilar completo con gabinete, tablero principal, caño y PAT', 894456, 'Acometidas', 'unidad', null),
  (null, null, 'Caño de acometida - Amurado y conexión', 227652, 'Acometidas', 'unidad', null),
  (null, null, 'Caja de toma con fusilera NH 00', 325340, 'Acometidas', 'unidad', null),
  (null, null, 'Agregado de gabinete de medidor y tablero principal', 325340, 'Acometidas', 'unidad', null),

  ('Bandeja hasta 150mm (H < 3m)', 'metro', 'Bandeja hasta 150 mm - Por metro lineal (H < 3 m)', 13163, 'Bandejas', 'metro', null),
  ('Bandeja hasta 150mm (H > 3m)', 'metro', 'Bandeja hasta 150 mm - Por metro lineal (H > 3 m)', 16465, 'Bandejas', 'metro', null),
  (null, null, 'Bandeja hasta 150 mm - Por accesorio: curva plana o unión T (H < 3 m)', 17577, 'Bandejas', 'unidad', null),
  (null, null, 'Bandeja hasta 150 mm - Por accesorio: curva plana o unión T (H > 3 m)', 20793, 'Bandejas', 'unidad', null),
  (null, null, 'Bandeja hasta 150 mm - Otros accesorios (H < 3 m)', 8793, 'Bandejas', 'unidad', null),
  (null, null, 'Bandeja hasta 150 mm - Otros accesorios (H > 3 m)', 25265, 'Bandejas', 'unidad', null),
  ('Bandeja 200/300mm (H < 3m)', 'metro', 'Bandeja de 200/300 mm - Por metro lineal (H < 3 m)', 19733, 'Bandejas', 'metro', null),
  ('Bandeja 200/300mm (H > 3m)', 'metro', 'Bandeja de 200/300 mm - Por metro lineal (H > 3 m)', 16897, 'Bandejas', 'metro', null),
  (null, null, 'Bandeja de 200/300 mm - Por accesorio: curva plana o unión T (H < 3 m)', 26355, 'Bandejas', 'unidad', null),
  (null, null, 'Bandeja de 200/300 mm - Por accesorio: curva plana o unión T (H > 3 m)', 25450, 'Bandejas', 'unidad', null),
  (null, null, 'Bandeja de 200/300 mm - Otros accesorios (H < 3 m)', 13163, 'Bandejas', 'unidad', null),
  (null, null, 'Bandeja de 200/300 mm - Otros accesorios (H > 3 m)', 33945, 'Bandejas', 'unidad', null),
  (null, null, 'Bandeja de 450/600 mm - Por metro lineal (H < 3 m)', 26979, 'Bandejas', 'metro', null),
  (null, null, 'Bandeja de 450/600 mm - Por metro lineal (H > 3 m)', 23578, 'Bandejas', 'metro', null),
  (null, null, 'Bandeja de 450/600 mm - Por accesorio: curva plana o unión T (H < 3 m)', 39424, 'Bandejas', 'unidad', null),
  (null, null, 'Bandeja de 450/600 mm - Por accesorio: curva plana o unión T (H > 3 m)', 35234, 'Bandejas', 'unidad', null),
  (null, null, 'Bandeja de 450/600 mm - Otros accesorios (H < 3 m)', 17146, 'Bandejas', 'unidad', null),
  (null, null, 'Bandeja de 450/600 mm - Otros accesorios (H > 3 m)', 47017, 'Bandejas', 'unidad', null),

  (null, null, 'Instalación de contactor', 135580, 'Automatización', 'unidad', null),
  (null, null, 'Instalación de sensor', 119275, 'Automatización', 'unidad', 'Se debe agregar el costo del cableado.'),

  (null, null, 'Proyecto eléctrico con lista de materiales (mínimo 30 m²)', 15900, 'Documentación', 'm2', 'Precio mínimo por m²; superficie mínima de cotización: 30 m².'),
  (null, null, 'Proyecto eléctrico (mínimo)', 552176, 'Documentación', 'global', null),
  (null, null, 'Plano eléctrico - Superficie (mínimo 30 m²)', 14680, 'Documentación', 'm2', 'El plano se compone de superficie, bocas, tableros y acometida. Superficie mínima: 30 m².'),
  (null, null, 'Plano eléctrico - Adicional por boca', 12702, 'Documentación', 'boca', null),
  (null, null, 'Plano eléctrico - Adicional por tablero', 32438, 'Documentación', 'unidad', null),
  (null, null, 'Plano eléctrico - Adicional por acometida', 32438, 'Documentación', 'unidad', null),
  (null, null, 'Plano eléctrico (mínimo 30 bocas)', 658849, 'Documentación', 'global', null),
  (null, null, 'Lista de materiales (mínimo para 30 m²)', 64986, 'Documentación', 'global', 'Sujeto a consideración del instalador.'),

  (null, null, 'Jornal de oficial especializado', 49514, 'Jornales', 'jornada', 'Jornada de 8 horas.'),
  (null, null, 'Jornal de oficial electricista', 42354, 'Jornales', 'jornada', 'Jornada de 8 horas.'),
  (null, null, 'Jornal de medio oficial electricista', 39140, 'Jornales', 'jornada', 'Jornada de 8 horas.'),
  (null, null, 'Jornal de ayudante', 36027, 'Jornales', 'jornada', 'Jornada de 8 horas.'),

  ('Certificado DCI - CAIE Residencial T1', 'unidad', 'Certificado DCI-CAIE T1 residencial o comercial monofásico', 405097, 'Certificados', 'unidad', 'Referencia CTPBA.'),
  (null, null, 'Certificado DCI-CAIE T1 residencial trifásico', 597892, 'Certificados', 'unidad', 'Referencia CTPBA.'),
  (null, null, 'Certificado DCI-CAIE T1 comercial trifásico', 597892, 'Certificados', 'unidad', 'Referencia CTPBA.'),
  (null, null, 'Certificado DCI-CAIE T2 según potencia instalada', 31777, 'Certificados', 'unidad', 'Referencia CTPBA.'),
  (null, null, 'Certificado DCI-CAIE T3 según potencia instalada', 31777, 'Certificados', 'unidad', 'Referencia CTPBA.'),
  ('Protocolo Puesta a Tierra', 'unidad', 'Protocolo de puesta a tierra SRT 900/15 residencial o comercial', 636071, 'Certificados', 'unidad', 'Referencia CTPBA.'),
  (null, null, 'Protocolo de puesta a tierra SRT 900/15 industrial', 636071, 'Certificados', 'unidad', 'Referencia CTPBA.'),

  (null, null, 'Corrección de factor de potencia monofásico', 140873, 'Corrección de potencia', 'kVA', null),
  (null, null, 'Instalación eléctrica de grupo electrógeno monofásico hasta 3,5 kVA', 271122, 'Grupos electrógenos', 'unidad', 'Se suma a los valores de instalación correspondientes. Los materiales deben estar certificados por la norma IRAM/IEC aplicable.');

do $$
declare
  expected_count integer;
  invalid_mapping text;
begin
  select count(*) into expected_count from _aaieric_electricidad_julio_2026;
  if expected_count <> 98 then
    raise exception 'Se esperaban 98 conceptos numéricos AAIERIC y se cargaron %', expected_count;
  end if;

  if exists (
    select 1
    from _aaieric_electricidad_julio_2026
    group by name, category, unit
    having count(*) > 1
  ) then
    raise exception 'La lista AAIERIC contiene identidades duplicadas';
  end if;

  select string_agg(expected.name, '; ' order by expected.name)
  into invalid_mapping
  from _aaieric_electricidad_julio_2026 expected
  where expected.legacy_name is not null
    and (
      select count(*)
      from public.master_items item
      where item.type = 'labor'
        and (
          (
            item.source_ref = 'aaieric_electricidad_2026_07'
            and item.name = expected.name
            and item.category = expected.category
            and item.unit = expected.unit
          )
          or (
            item.source_ref in ('mo_rubro_electricidad', 'mo_rubro_elecdtricidad')
            and item.active = true
            and item.name = expected.legacy_name
            and item.unit = expected.legacy_unit
          )
        )
    ) <> 1;

  if invalid_mapping is not null then
    raise exception 'No se pudo resolver de forma unívoca el legado para: %', invalid_mapping;
  end if;
end;
$$;

update public.master_items item
set
  name = expected.name,
  suggested_price = expected.suggested_price,
  category = expected.category,
  source_ref = 'aaieric_electricidad_2026_07',
  technical_notes = concat_ws(
    ' ',
    'Fuente: AAIERIC, Costos Sugeridos de Mano de Obra - Instalaciones Eléctricas, julio 2026. Tarifas para CABA y GBA. Precio directo vigente; no aplicar el índice histórico UrbanFix.',
    nullif(expected.detail, '')
  ),
  unit = expected.unit,
  active = true,
  created_at = now()
from _aaieric_electricidad_julio_2026 expected
where expected.legacy_name is not null
  and item.source_ref in ('mo_rubro_electricidad', 'mo_rubro_elecdtricidad')
  and item.active = true
  and item.type = 'labor'
  and item.name = expected.legacy_name
  and item.unit = expected.legacy_unit;

insert into public.master_items (
  name,
  type,
  suggested_price,
  source_ref,
  category,
  active,
  technical_notes,
  unit,
  created_at
)
select
  expected.name,
  'labor',
  expected.suggested_price,
  'aaieric_electricidad_2026_07',
  expected.category,
  true,
  concat_ws(
    ' ',
    'Fuente: AAIERIC, Costos Sugeridos de Mano de Obra - Instalaciones Eléctricas, julio 2026. Tarifas para CABA y GBA. Precio directo vigente; no aplicar el índice histórico UrbanFix.',
    nullif(expected.detail, '')
  ),
  expected.unit,
  now()
from _aaieric_electricidad_julio_2026 expected
where not exists (
  select 1
  from public.master_items item
  where item.source_ref = 'aaieric_electricidad_2026_07'
    and item.type = 'labor'
    and item.name = expected.name
    and item.category = expected.category
    and item.unit = expected.unit
);

update public.master_items
set active = false
where source_ref in ('mo_rubro_electricidad', 'mo_rubro_elecdtricidad')
  and type = 'labor'
  and active = true
  and (name, unit) in (
    ('Hora de Trabajo (Mínimo/Promedio)', 'hora'),
    ('Contactores / Sensores', 'unidad'),
    ('Artefacto aplique simple o Spot Led', 'unidad'),
    ('Equipo tubo Led (Simple/Doble)', 'unidad'),
    ('Medio Oficial / Ayudante', 'jornada'),
    ('Oficial Especializado / Electricista', 'jornada')
  );

do $$
declare
  invalid_items text;
  imported_count integer;
begin
  select string_agg(expected.name, '; ' order by expected.name)
  into invalid_items
  from _aaieric_electricidad_julio_2026 expected
  where (
    select count(*)
    from public.master_items item
    where item.source_ref = 'aaieric_electricidad_2026_07'
      and item.type = 'labor'
      and item.active = true
      and item.name = expected.name
      and item.category = expected.category
      and item.unit = expected.unit
      and item.suggested_price = expected.suggested_price
  ) <> 1;

  if invalid_items is not null then
    raise exception 'La verificación posterior falló para: %', invalid_items;
  end if;

  select count(*)
  into imported_count
  from public.master_items
  where source_ref = 'aaieric_electricidad_2026_07'
    and type = 'labor'
    and active = true;

  if imported_count <> 98 then
    raise exception 'Se esperaban 98 conceptos AAIERIC activos y se encontraron %', imported_count;
  end if;

  if exists (
    select 1
    from public.master_items
    where source_ref in ('mo_rubro_electricidad', 'mo_rubro_elecdtricidad')
      and type = 'labor'
      and active = true
      and name in (
        'Hora de Trabajo (Mínimo/Promedio)',
        'Contactores / Sensores',
        'Artefacto aplique simple o Spot Led',
        'Equipo tubo Led (Simple/Doble)',
        'Medio Oficial / Ayudante',
        'Oficial Especializado / Electricista'
      )
  ) then
    raise exception 'Quedaron activos conceptos agrupados reemplazados por la lista oficial';
  end if;
end;
$$;

commit;
