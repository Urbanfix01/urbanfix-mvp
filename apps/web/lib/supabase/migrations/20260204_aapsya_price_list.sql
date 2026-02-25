-- AAPSYA suggested prices (Enero 2026)

insert into public.master_items (name, type, suggested_price, source_ref)
select v.name, v.type::item_type_enum, v.suggested_price, v.source_ref
from (
  values
    ('Ayudante Montador Sanitarista Jornada 8 hs (s/ viáticos)', 'labor', 35130, 'AAPSYA - Jornales'),
    ('Oficial Plomero Sanitarista Jornada 8 horas (s/viáticos)', 'labor', 63140, 'AAPSYA - Jornales'),

    ('Instalación cañería primaria metro lineal (agregar zanjeo)', 'labor', 53745, 'AAPSYA - Cloacas'),
    ('Instalación cañería ventilación metro lineal', 'labor', 39321, 'AAPSYA - Cloacas'),
    ('Instalación desagües primarios y secundarios p/ 1 baño, cocina, lavadero lindero (máximo 10 mts lineal)', 'labor', 781191, 'AAPSYA - Cloacas'),
    ('Instalación de artefacto sanitario (mínimo)', 'labor', 76837, 'AAPSYA - Cloacas'),
    ('Instalación de bañera c/junta tomada y mampostería', 'labor', 517960, 'AAPSYA - Cloacas'),
    ('Instalación cámara de inspección cementicia', 'labor', 264702, 'AAPSYA - Cloacas'),
    ('Instalación cámara de inspección plástica sobre mortero', 'labor', 164684, 'AAPSYA - Cloacas'),
    ('Instalación cámara séptica (construcción rectangular según OSN)', 'labor', 439280, 'AAPSYA - Cloacas'),
    ('Pozo ciego 5 m3 calzado con tapa', 'labor', 768375, 'AAPSYA - Cloacas'),
    ('Trámite de conexión a troncal + instalación de válvula anti-retorno', 'labor', 394415, 'AAPSYA - Cloacas'),

    ('Destranque de pluviales x metro', 'labor', 12269, 'AAPSYA - Destapaciones'),
    ('Destranque de grasera y sifón de cocina', 'labor', 48964, 'AAPSYA - Destapaciones'),
    ('Destranque de sumidero de baño', 'labor', 32424, 'AAPSYA - Destapaciones'),
    ('Destranque de cloacas x metro', 'labor', 20403, 'AAPSYA - Destapaciones'),

    ('Instalación biodigestor c/cámara de lodos, base de hormigón y muros de contención', 'labor', 603813, 'AAPSYA - Biodigestores'),
    ('Instalación de lecho de infiltración x metro lineal (agregar zanjeo)', 'labor', 65848, 'AAPSYA - Biodigestores'),
    ('Zanjeo por metro lineal', 'labor', 13529, 'AAPSYA - Biodigestores'),

    ('Instalación agua fría y caliente en termofusión p/ 1 baño + cocina + lavadero (25 mts lineales max)', 'labor', 987431, 'AAPSYA - Agua'),
    ('Instalación cañería termofusión x metro lineal bajo suelo', 'labor', 54889, 'AAPSYA - Agua'),
    ('Instalación cañería termofusión x mt lineal engrampada', 'labor', 39530, 'AAPSYA - Agua'),

    ('Instalación tanque reserva con conexión agua y flotante', 'labor', 172981, 'AAPSYA - Tanques'),
    ('Instalación tanque cisterna bajo tierra c/muro contención, tapa y conexiones agua', 'labor', 494426, 'AAPSYA - Tanques'),
    ('Instalación tanque elevado', 'labor', 225585, 'AAPSYA - Tanques'),
    ('Limpieza de tanque hasta 1100 lts s/análisis de agua', 'labor', 127841, 'AAPSYA - Tanques'),
    ('Cambio de flotante en tanque de reserva', 'labor', 60178, 'AAPSYA - Tanques'),
    ('Cambio flotante en tanque elevado (sumar seguro altura)', 'labor', 75209, 'AAPSYA - Tanques'),

    ('Instalación bomba presurizadora chica', 'labor', 85768, 'AAPSYA - Bombas'),
    ('Instalación bomba presurizadora bajo tanque', 'labor', 127841, 'AAPSYA - Bombas'),
    ('Instalación bomba elevadora', 'labor', 112841, 'AAPSYA - Bombas'),

    ('Instalación grifería tradicional', 'labor', 67707, 'AAPSYA - Griferias'),
    ('Instalación grifería monocomando', 'labor', 60178, 'AAPSYA - Griferias'),
    ('Cambio cabezal/cuerito grifería con frezado', 'labor', 36497, 'AAPSYA - Griferias'),
    ('Cambio cartucho monocomando', 'labor', 45138, 'AAPSYA - Griferias'),
    ('Cambio grifería embutida (s/albañilería)', 'labor', 142967, 'AAPSYA - Griferias'),
    ('Cambio flexible', 'labor', 33543, 'AAPSYA - Griferias'),

    ('Instalación/reemplazo termotanque gas o eléctrico', 'labor', 176844, 'AAPSYA - Varios'),
    ('Instalación/reemplazo termotanque solar tubular', 'labor', 579623, 'AAPSYA - Varios'),
    ('Reemplazo ánodo termotanque', 'labor', 74859, 'AAPSYA - Varios'),
    ('Service completo calefón', 'labor', 123447, 'AAPSYA - Varios'),
    ('Soldadura hidrobronze o plomo (s/materiales)', 'labor', 85145, 'AAPSYA - Varios'),
    ('Cambio llave de paso embutida (s/albañilería)', 'labor', 88833, 'AAPSYA - Varios'),
    ('Instalación lavavajillas/lavarropas', 'labor', 99800, 'AAPSYA - Varios')
) as v(name, type, suggested_price, source_ref)
where not exists (
  select 1
  from public.master_items m
  where m.name = v.name
    and coalesce(m.source_ref, '') = coalesce(v.source_ref, '')
);
