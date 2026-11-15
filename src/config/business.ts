/**
 * Especificidades DESTE negócio (ADR-017): é o único lugar que muda ao copiar o sistema para
 * outro cliente. Hoje só o catálogo inicial; rótulos e campos de pet entram com os seus marcos.
 *
 * Os valores são SUGESTÃO: viram dados editáveis no banco (RN-CAT-07) e o seed nunca sobrescreve
 * o que o dono já mudou.
 */
export const BUSINESS = {
  /** Categorias iniciais de produto (OQ-18). */
  categories: ['Alimentos', 'Brinquedos', 'Acessórios', 'Higiene'],

  /**
   * Serviços iniciais (RN-SER-01). O preço padrão começa em 0: os valores reais não estão nos
   * documentos (OQ-31) e o dono os informa na tela de serviços. A taxa de deslocamento é o
   * serviço especial e único (RN-SER-03).
   */
  services: [
    { name: 'Consulta', priceCents: 0 },
    { name: 'Vacinação', priceCents: 0 },
    { name: 'Coleta de exames', priceCents: 0 },
    { name: 'Limpeza de ouvido', priceCents: 0 },
    { name: 'Raspado', priceCents: 0 },
    { name: 'Atestado de viagem', priceCents: 0 },
    { name: 'Taxa de deslocamento', priceCents: 0, isDisplacementFee: true },
  ],
} as const;
