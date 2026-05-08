-- FASE 10A fix - Edge Function api-send-sms reads/writes these tables with service_role.
-- RLS bypass is not enough without table privileges.

grant select, update on public.api_keys to service_role;
grant select, insert on public.api_request_logs to service_role;
