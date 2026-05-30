-- Notifications and device tokens for UrbanFix

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists notifications_user_id_created_at_idx
  on notifications (user_id, created_at desc);

alter table notifications enable row level security;

drop policy if exists "Users read own notifications" on notifications;
drop policy if exists "Users update own notifications" on notifications;

create policy "Users read own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "Users update own notifications"
  on notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  expo_push_token text unique not null,
  platform text not null default 'android',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists device_tokens_user_id_idx
  on device_tokens (user_id);

alter table device_tokens enable row level security;

drop policy if exists "Users manage own device tokens" on device_tokens;

create policy "Users manage own device tokens"
  on device_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function notify_quote_events()
returns trigger as $$
declare
  notif_title text;
  notif_body text;
  notif_type text;
begin
  -- New quote created
  if (tg_op = 'INSERT') then
    notif_type := 'quote_created';
    notif_title := 'Nuevo trabajo asignado';
    notif_body := 'Se creo un presupuesto para ' || coalesce(new.client_name, 'cliente') || '.';
    insert into notifications (user_id, type, title, body, data)
      values (new.user_id, notif_type, notif_title, notif_body, jsonb_build_object('quote_id', new.id));
    return new;
  end if;

  -- Status changes
  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    if (new.status = 'sent') then
      notif_type := 'quote_presented';
      notif_title := 'Presupuesto presentado';
      notif_body := 'Se envio el presupuesto a ' || coalesce(new.client_name, 'cliente') || '.';
    elsif (new.status in ('approved', 'accepted')) then
      notif_type := 'quote_approved';
      notif_title := 'Presupuesto aprobado';
      notif_body := 'El cliente aprobo el presupuesto.';
    elsif (new.status = 'rejected') then
      notif_type := 'quote_rejected';
      notif_title := 'Presupuesto rechazado';
      notif_body := 'El cliente rechazo el presupuesto.';
    end if;

    if (notif_type is not null) then
      insert into notifications (user_id, type, title, body, data)
        values (new.user_id, notif_type, notif_title, notif_body, jsonb_build_object('quote_id', new.id));
    end if;
  end if;

  -- Schedule updates (agenda reminder)
  if (tg_op = 'UPDATE' and new.scheduled_date is distinct from old.scheduled_date and new.scheduled_date is not null) then
    insert into notifications (user_id, type, title, body, data)
      values (
        new.user_id,
        'agenda_reminder',
        'Recordatorio de agenda',
        'Tienes una visita programada para ' || to_char(new.scheduled_date, 'DD/MM/YYYY') || '.',
        jsonb_build_object('quote_id', new.id, 'scheduled_date', new.scheduled_date)
      );
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists quote_notifications_trigger on quotes;

create trigger quote_notifications_trigger
after insert or update on quotes
for each row execute function notify_quote_events();
