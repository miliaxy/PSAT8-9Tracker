alter table public.learning_resource_progress
  add column if not exists url text;

comment on column public.learning_resource_progress.url is
  'Optional direct link to the assigned learning resource.';
