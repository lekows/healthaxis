-- Torna crm e crm_uf nullable (médicos sem CRM no laudo)
alter table doctors alter column crm drop not null;
alter table doctors alter column crm_uf drop not null;

-- Remove constraint original que exigia crm não-nulo
alter table doctors drop constraint if exists doctors_user_id_crm_crm_uf_key;

-- Índice único para médicos COM CRM
create unique index if not exists doctors_unique_with_crm
  on doctors (user_id, crm, crm_uf)
  where crm is not null and crm != '';

-- Índice único para médicos SEM CRM (unicidade por nome)
create unique index if not exists doctors_unique_without_crm
  on doctors (user_id, lower(name))
  where crm is null or crm = '';
