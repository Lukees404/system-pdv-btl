-- M2 — Catálogo (SQL manual: schema de extensões, CHECKs, índices parciais, GIN e REVOKE
-- não vêm do Prisma). Roda como dono do schema (pdv_owner / DIRECT_URL).
-- Só ADICIONA tabelas e move/remove extensões que o código do M1 não usa: compatível com a
-- versão anterior da aplicação (RNF-INT-05).

-- ---------------------------------------------------------------------------------------
-- Extensões (ADR-020, revisada no M2): só pg_trgm, num schema próprio (fora do public, o que
-- encerra o aviso `extension_in_public` do Supabase). O unaccent sai: a aplicação normaliza
-- o texto (`normalizeText`) e o unaccent do Postgres é STABLE, inútil em índice.
-- ---------------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS ext;
REVOKE CREATE ON SCHEMA ext FROM PUBLIC;
GRANT USAGE ON SCHEMA ext TO pdv_app;
-- `ALTER EXTENSION ... SET SCHEMA` exige ser dono de cada função da extensão, e numa extensão
-- "trusted" elas pertencem ao superusuário, não ao pdv_owner (erro 42501 em `set_limit`).
-- Como nada usa o pg_trgm ainda (o índice é criado abaixo), recriá-la no schema certo é
-- equivalente e só exige ser dono da extensão, o que o pdv_owner é.
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION pg_trgm SCHEMA ext;
DROP EXTENSION IF EXISTS unaccent;

-- ---------------------------------------------------------------------------------------
-- categories (RN-CAT-07)
-- ---------------------------------------------------------------------------------------
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_normalized" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "categories_name_check" CHECK (char_length("name") BETWEEN 1 AND 100),
    CONSTRAINT "categories_name_normalized_check" CHECK ("name_normalized" <> '')
);

CREATE UNIQUE INDEX "categories_name_normalized_key" ON "categories"("name_normalized");

-- ---------------------------------------------------------------------------------------
-- products (RN-CAT-01..04, RN-FIS-02). `stock_qty` é cache; só `inventory` (M3) o escreve.
-- ---------------------------------------------------------------------------------------
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_normalized" TEXT NOT NULL,
    "barcode" TEXT,
    "category_id" UUID,
    "price_cents" INTEGER NOT NULL,
    "cost_cents" INTEGER,
    "stock_qty" INTEGER NOT NULL DEFAULT 0,
    "min_stock" INTEGER NOT NULL DEFAULT 0,
    "photo_key" TEXT,
    "ncm" CHAR(8),
    "cest" CHAR(7),
    "cfop" CHAR(4),
    "csosn" CHAR(3),
    "origin" SMALLINT,
    "unit" CHAR(2) NOT NULL DEFAULT 'UN',
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "products_name_check" CHECK (char_length("name") BETWEEN 1 AND 120),
    CONSTRAINT "products_name_normalized_check" CHECK ("name_normalized" <> ''),
    CONSTRAINT "products_barcode_check" CHECK ("barcode" IS NULL OR ("barcode" <> '' AND "barcode" = btrim("barcode"))),
    CONSTRAINT "products_price_cents_check" CHECK ("price_cents" >= 0),
    CONSTRAINT "products_cost_cents_check" CHECK ("cost_cents" IS NULL OR "cost_cents" >= 0),
    CONSTRAINT "products_stock_qty_check" CHECK ("stock_qty" >= 0),
    CONSTRAINT "products_min_stock_check" CHECK ("min_stock" >= 0),
    CONSTRAINT "products_ncm_check" CHECK ("ncm" IS NULL OR "ncm" ~ '^[0-9]{8}$'),
    CONSTRAINT "products_cest_check" CHECK ("cest" IS NULL OR "cest" ~ '^[0-9]{7}$'),
    CONSTRAINT "products_cfop_check" CHECK ("cfop" IS NULL OR "cfop" ~ '^[0-9]{4}$'),
    CONSTRAINT "products_csosn_check" CHECK ("csosn" IS NULL OR "csosn" ~ '^[0-9]{3}$'),
    CONSTRAINT "products_origin_check" CHECK ("origin" IS NULL OR "origin" BETWEEN 0 AND 8),
    CONSTRAINT "products_unit_check" CHECK ("unit" ~ '^[A-Z]{2}$')
);

-- Código de barras: único entre TODOS (inclusive arquivados); NULL se repete (RN-CAT-03).
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");
CREATE INDEX "products_category_id_idx" ON "products"("category_id");
-- Nome único só entre ATIVOS; arquivar libera o nome, reativar pode conflitar (RN-CAT-02).
CREATE UNIQUE INDEX "products_name_normalized_active_key"
    ON "products"("name_normalized") WHERE "archived_at" IS NULL;
-- Busca parcial e tolerante (ADR-020): `name_normalized ILIKE '%termo%'` usa este índice.
CREATE INDEX "products_name_trgm_idx"
    ON "products" USING GIN ("name_normalized" ext.gin_trgm_ops);

-- Excluir categoria só se vazia (RF-CAT-06): o banco recusa com produtos ligados.
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------------------
-- services (RN-SER-01/03/05/07): sem estoque e sem custo.
-- ---------------------------------------------------------------------------------------
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_normalized" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "is_displacement_fee" BOOLEAN NOT NULL DEFAULT false,
    "fiscal_service_code" TEXT,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "services_name_check" CHECK (char_length("name") BETWEEN 1 AND 120),
    CONSTRAINT "services_name_normalized_check" CHECK ("name_normalized" <> ''),
    CONSTRAINT "services_price_cents_check" CHECK ("price_cents" >= 0)
);

CREATE UNIQUE INDEX "services_name_normalized_active_key"
    ON "services"("name_normalized") WHERE "archived_at" IS NULL;
-- No máximo UMA taxa de deslocamento no sistema (RN-SER-03).
CREATE UNIQUE INDEX "services_single_displacement_fee_key"
    ON "services"("is_displacement_fee") WHERE "is_displacement_fee";

-- ---------------------------------------------------------------------------------------
-- Privilégios: produtos e serviços NUNCA são excluídos, só arquivados (RN-CAT-04, RNF-SEG-07).
-- As tabelas herdam SELECT/INSERT/UPDATE/DELETE do pdv_app (migração-base); tira o DELETE.
-- `categories` mantém DELETE: categoria vazia pode ser excluída (RF-CAT-06).
-- ---------------------------------------------------------------------------------------
REVOKE DELETE ON "products", "services" FROM pdv_app;
