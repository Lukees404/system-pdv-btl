/**
 * Lê um erro do Prisma (com o adaptador `pg`) e diz qual restrição do banco foi violada.
 * Violação de índice único = `P2002`; de chave estrangeira = `P2003`; o nome da restrição vem em
 * `meta.driverAdapterError.cause.constraint.index` (também para os índices parciais).
 */
export type ConstraintViolation = { code: 'P2002' | 'P2003'; constraint: string };

type PrismaLikeError = {
  code?: string;
  meta?: { driverAdapterError?: { cause?: { constraint?: { index?: string } } } };
};

export function constraintViolation(error: unknown): ConstraintViolation | null {
  const { code, meta } = (error ?? {}) as PrismaLikeError;
  if (code !== 'P2002' && code !== 'P2003') return null;

  const constraint = meta?.driverAdapterError?.cause?.constraint?.index;
  return constraint ? { code, constraint } : null;
}
