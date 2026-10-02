-- SPIELERDATENBANK SAFE DELETE GUARD
-- Bestehende Daten werden niemals mitgelöscht.

create or replace function public.spieldatenbank_delete_guard(p_player_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_player_name text;
  v_count bigint;
  v_total bigint := 0;
  v_dependencies jsonb := '[]'::jsonb;
  r record;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from public.user_profiles up
    where up.user_id = auth.uid()
      and coalesce(up.is_admin, false) = true
  ) then
    raise exception 'admin required';
  end if;

  select s.name into v_player_name
  from public.spieldatenbank s
  where s.id = p_player_id;

  if v_player_name is null then
    return jsonb_build_object(
      'can_delete', false,
      'total_references', 0,
      'dependencies', '[]'::jsonb,
      'error', 'player_not_found'
    );
  end if;

  for r in
    with fk_columns as (
      select
        ns.nspname as table_schema,
        cls.relname as table_name,
        att.attname as column_name,
        'foreign_key'::text as kind
      from pg_constraint con
      join pg_class cls on cls.oid = con.conrelid
      join pg_namespace ns on ns.oid = cls.relnamespace
      join lateral unnest(con.conkey) with ordinality as ck(attnum, ord) on true
      join pg_attribute att on att.attrelid = con.conrelid and att.attnum = ck.attnum
      where con.contype = 'f'
        and con.confrelid = 'public.spieldatenbank'::regclass
        and ns.nspname = 'public'
    ),
    loose_uuid_columns as (
      select
        c.table_schema,
        c.table_name,
        c.column_name,
        'id_column'::text as kind
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.udt_name = 'uuid'
        and c.table_name <> 'spieldatenbank'
        and c.column_name in ('player_id','spieler_id','spieldatenbank_id','linked_spieldatenbank_id')
    )
    select distinct table_schema, table_name, column_name, kind
    from (
      select * from fk_columns
      union all
      select * from loose_uuid_columns
    ) q
    order by table_name, column_name
  loop
    begin
      execute format(
        'select count(*) from %I.%I where %I = $1',
        r.table_schema, r.table_name, r.column_name
      )
      into v_count
      using p_player_id;
    exception
      when others then
        v_count := 0;
    end;

    if coalesce(v_count, 0) > 0 then
      v_total := v_total + v_count;
      v_dependencies := v_dependencies || jsonb_build_array(
        jsonb_build_object(
          'source', format('%I.%I.%I', r.table_schema, r.table_name, r.column_name),
          'label',
            case
              when r.table_name = 'club_players' then 'Vereinsverwaltung'
              when r.table_name ilike '%registration%' then 'Turnieranmeldung'
              when r.table_name ilike '%turnier%' or r.table_name ilike '%tournament%' then 'Turnier'
              when r.table_name ilike '%series%' or r.table_name ilike '%serie%' then 'Turnierserie'
              when r.table_name ilike '%cup%' then 'Cup'
              when r.table_name ilike '%history%' or r.table_name ilike '%historie%' then 'Historie'
              when r.table_name ilike '%liga%' or r.table_name ilike '%league%' or r.table_name ilike '%match%' then 'Liga / Spielbetrieb'
              else initcap(replace(r.table_name, '_', ' '))
            end,
          'count', v_count,
          'kind', r.kind
        )
      );
    end if;
  end loop;

  -- Ältere Turnier-/Cup-/Serien-/Historienbereiche speichern teils nur Namen.
  -- Hier wird absichtlich konservativ blockiert.
  for r in
    select c.table_schema, c.table_name, c.column_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.data_type in ('text','character varying')
      and (
        c.table_name ilike '%turnier%'
        or c.table_name ilike '%tournament%'
        or c.table_name ilike '%cup%'
        or c.table_name ilike '%series%'
        or c.table_name ilike '%serie%'
        or c.table_name ilike '%history%'
        or c.table_name ilike '%historie%'
      )
      and (
        c.column_name ilike '%player%name%'
        or c.column_name ilike '%spieler%name%'
        or c.column_name ilike '%winner%name%'
        or c.column_name ilike '%sieger%name%'
        or c.column_name ilike '%participant%name%'
        or c.column_name ilike '%teilnehmer%name%'
      )
    order by c.table_name, c.column_name
  loop
    begin
      execute format(
        'select count(*) from %I.%I where lower(trim(coalesce(%I, ''''))) = lower(trim($1))',
        r.table_schema, r.table_name, r.column_name
      )
      into v_count
      using v_player_name;
    exception
      when others then
        v_count := 0;
    end;

    if coalesce(v_count, 0) > 0 then
      v_total := v_total + v_count;
      v_dependencies := v_dependencies || jsonb_build_array(
        jsonb_build_object(
          'source', format('%I.%I.%I', r.table_schema, r.table_name, r.column_name),
          'label',
            case
              when r.table_name ilike '%series%' or r.table_name ilike '%serie%' then 'Turnierserie / Historie'
              when r.table_name ilike '%cup%' then 'Cup / Historie'
              when r.table_name ilike '%history%' or r.table_name ilike '%historie%' then 'Historie'
              else 'Turnier / Historie'
            end,
          'count', v_count,
          'kind', 'name_reference'
        )
      );
    end if;
  end loop;

  return jsonb_build_object(
    'can_delete', v_total = 0,
    'total_references', v_total,
    'dependencies', v_dependencies
  );
end;
$$;

revoke all on function public.spieldatenbank_delete_guard(uuid) from public;
grant execute on function public.spieldatenbank_delete_guard(uuid) to authenticated;
