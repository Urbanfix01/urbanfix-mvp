-- Sample/demo quotes for platform presentation
-- User: bce2fe2d-b1f4-4568-ab18-38f91c74d3e4

insert into public.quotes (
  id,
  user_id,
  client_name,
  client_address,
  total_amount,
  tax_rate,
  status,
  created_at,
  start_date,
  end_date
)
values
  (
    'c5b5a9f1-8f2d-4d7d-9c3c-6e1f2a9b0a01',
    'bce2fe2d-b1f4-4568-ab18-38f91c74d3e4',
    'Consorcio Plaza Norte',
    'Av. Libertador 1234, CABA',
    221430,
    0.21,
    'sent',
    now() - interval '7 days',
    null,
    null
  ),
  (
    'c5b5a9f1-8f2d-4d7d-9c3c-6e1f2a9b0a02',
    'bce2fe2d-b1f4-4568-ab18-38f91c74d3e4',
    'Maria Lopez',
    'Calle 9 456, La Plata',
    63000,
    0,
    'approved',
    now() - interval '4 days',
    current_date + 3,
    current_date + 4
  ),
  (
    'c5b5a9f1-8f2d-4d7d-9c3c-6e1f2a9b0a03',
    'bce2fe2d-b1f4-4568-ab18-38f91c74d3e4',
    'Oficinas Delta',
    'Paraguay 2500, CABA',
    157300,
    0.21,
    'completed',
    now() - interval '12 days',
    current_date - 6,
    current_date - 5
  ),
  (
    'c5b5a9f1-8f2d-4d7d-9c3c-6e1f2a9b0a04',
    'bce2fe2d-b1f4-4568-ab18-38f91c74d3e4',
    'Juan Perez',
    'Mitre 1020, Quilmes',
    101640,
    0.21,
    'rejected',
    now() - interval '9 days',
    null,
    null
  ),
  (
    'c5b5a9f1-8f2d-4d7d-9c3c-6e1f2a9b0a05',
    'bce2fe2d-b1f4-4568-ab18-38f91c74d3e4',
    'Local Comercial 7',
    'Av. Rivadavia 8900, CABA',
    102850,
    0.21,
    'draft',
    now() - interval '1 day',
    null,
    null
  )
on conflict (id) do nothing;

insert into public.quote_items (
  id,
  quote_id,
  description,
  quantity,
  unit_price,
  metadata
)
values
  (
    'a7b8c9d1-1234-4ef0-8abc-000000000001',
    'c5b5a9f1-8f2d-4d7d-9c3c-6e1f2a9b0a01',
    'Reparacion de filtracion en techo',
    1,
    120000,
    jsonb_build_object('type', 'labor')
  ),
  (
    'a7b8c9d1-1234-4ef0-8abc-000000000002',
    'c5b5a9f1-8f2d-4d7d-9c3c-6e1f2a9b0a01',
    'Membrana asfaltica 10m2',
    1,
    45000,
    jsonb_build_object('type', 'material')
  ),
  (
    'a7b8c9d1-1234-4ef0-8abc-000000000003',
    'c5b5a9f1-8f2d-4d7d-9c3c-6e1f2a9b0a01',
    'Sellador elastomerico',
    2,
    9000,
    jsonb_build_object('type', 'material')
  ),
  (
    'a7b8c9d1-1234-4ef0-8abc-000000000004',
    'c5b5a9f1-8f2d-4d7d-9c3c-6e1f2a9b0a02',
    'Cambio de cerradura y ajuste de puerta',
    1,
    35000,
    jsonb_build_object('type', 'labor')
  ),
  (
    'a7b8c9d1-1234-4ef0-8abc-000000000005',
    'c5b5a9f1-8f2d-4d7d-9c3c-6e1f2a9b0a02',
    'Cerradura reforzada',
    1,
    28000,
    jsonb_build_object('type', 'material')
  ),
  (
    'a7b8c9d1-1234-4ef0-8abc-000000000006',
    'c5b5a9f1-8f2d-4d7d-9c3c-6e1f2a9b0a03',
    'Pintura interior 2 ambientes',
    1,
    90000,
    jsonb_build_object('type', 'labor')
  ),
  (
    'a7b8c9d1-1234-4ef0-8abc-000000000007',
    'c5b5a9f1-8f2d-4d7d-9c3c-6e1f2a9b0a03',
    'Pintura latex 20L',
    2,
    16000,
    jsonb_build_object('type', 'material')
  ),
  (
    'a7b8c9d1-1234-4ef0-8abc-000000000008',
    'c5b5a9f1-8f2d-4d7d-9c3c-6e1f2a9b0a03',
    'Masilla y lijas',
    1,
    8000,
    jsonb_build_object('type', 'material')
  ),
  (
    'a7b8c9d1-1234-4ef0-8abc-000000000009',
    'c5b5a9f1-8f2d-4d7d-9c3c-6e1f2a9b0a04',
    'Revision electrica y tablero',
    1,
    50000,
    jsonb_build_object('type', 'labor')
  ),
  (
    'a7b8c9d1-1234-4ef0-8abc-00000000000a',
    'c5b5a9f1-8f2d-4d7d-9c3c-6e1f2a9b0a04',
    'Disyuntor 40A',
    1,
    22000,
    jsonb_build_object('type', 'material')
  ),
  (
    'a7b8c9d1-1234-4ef0-8abc-00000000000b',
    'c5b5a9f1-8f2d-4d7d-9c3c-6e1f2a9b0a04',
    'Cableado 10m',
    1,
    12000,
    jsonb_build_object('type', 'material')
  ),
  (
    'a7b8c9d1-1234-4ef0-8abc-00000000000c',
    'c5b5a9f1-8f2d-4d7d-9c3c-6e1f2a9b0a05',
    'Mantenimiento de aire acondicionado',
    1,
    60000,
    jsonb_build_object('type', 'labor')
  ),
  (
    'a7b8c9d1-1234-4ef0-8abc-00000000000d',
    'c5b5a9f1-8f2d-4d7d-9c3c-6e1f2a9b0a05',
    'Gas refrigerante',
    1,
    15000,
    jsonb_build_object('type', 'material')
  ),
  (
    'a7b8c9d1-1234-4ef0-8abc-00000000000e',
    'c5b5a9f1-8f2d-4d7d-9c3c-6e1f2a9b0a05',
    'Filtro de aire',
    2,
    5000,
    jsonb_build_object('type', 'material')
  )
on conflict (id) do nothing;
