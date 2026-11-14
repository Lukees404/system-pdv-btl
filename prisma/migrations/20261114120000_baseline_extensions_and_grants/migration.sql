-- Migração-base do M0 (SQL manual: extensões e GRANT/REVOKE não vêm do Prisma).
-- Roda como dono do schema (pdv_owner / DIRECT_URL). Exige que o papel `pdv_app` já exista:
-- se não existir, a migração FALHA de propósito (privilégio mínimo nunca é opcional).

-- Busca sem acento e parcial (ADR-020). Ambas são extensões "trusted": o dono do banco pode criá-las.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Ninguém além do dono cria objetos no schema public (RNF-SEG-07).
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- A aplicação enxerga o schema e faz só DML nas tabelas que o dono criar daqui em diante.
GRANT USAGE ON SCHEMA public TO pdv_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pdv_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO pdv_app;
