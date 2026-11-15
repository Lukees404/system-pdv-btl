-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------------------
-- SQL manual: invariantes no banco (RNF-INT-02) e privilégio mínimo (RNF-SEG-07).
-- ---------------------------------------------------------------------------------------

-- users: só OWNER por enquanto (RN-ACE-01); e-mail sempre normalizado (trim + minúsculas),
-- para o índice único valer sem depender de `citext`; contador de falhas nunca negativo.
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("role" IN ('OWNER'));
ALTER TABLE "users" ADD CONSTRAINT "users_email_normalized_check" CHECK ("email" = lower(btrim("email")));
ALTER TABLE "users" ADD CONSTRAINT "users_failed_attempts_check" CHECK ("failed_attempts" >= 0);

-- sessions: toda sessão expira depois de criada (RN-ACE-04).
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_expiry_check" CHECK ("expires_at" > "created_at");

-- audit_log: `data` é sempre um objeto JSON (RN-ACE-03).
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_data_object_check" CHECK (jsonb_typeof("data") = 'object');

-- audit_log é APPEND-ONLY: a aplicação só insere e lê (RN-ACE-03, RNF-SEG-07). Os privilégios
-- padrão da migração-base concedem DML em tabelas novas; aqui retiramos o que não pode existir.
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE "audit_log" FROM pdv_app;
