// API pública do módulo `catalog` (docs/04): outros módulos importam só daqui.
// Nesta etapa só o domínio (validação pura); casos de uso e repositórios entram na Etapa 5.
export { validateCategory } from './domain/category';
export { validateFiscalFields } from './domain/fiscal';
export type { FiscalFields, FiscalInput } from './domain/fiscal';
export { validateProduct } from './domain/product';
export type { ProductData, ProductInput } from './domain/product';
export { validateService } from './domain/service';
export type { ServiceData, ServiceInput } from './domain/service';
