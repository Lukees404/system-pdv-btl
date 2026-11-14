-- Papéis e bancos do ambiente LOCAL (docker compose). Roda só na criação do volume.
-- Em produção (Supabase) os papéis são criados à mão, conforme o runbook (M10/Etapa 13).
--
--   pdv_owner : dono do schema; roda migrações (DIRECT_URL). CREATEDB para os testes
--               criarem bancos isolados.
--   pdv_app   : usuário da aplicação (DATABASE_URL); só DML (RNF-SEG-07). As permissões
--               de schema vêm da migração-base, para valerem em qualquer banco novo.

CREATE ROLE pdv_owner LOGIN PASSWORD 'change-me' CREATEDB;
CREATE ROLE pdv_app LOGIN PASSWORD 'change-me';

CREATE DATABASE pdv OWNER pdv_owner;
CREATE DATABASE pdv_test OWNER pdv_owner;
