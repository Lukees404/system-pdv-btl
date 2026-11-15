// API pública do módulo `catalog` (docs/04): outros módulos e a camada web importam só daqui.

// Domínio (validação pura)
export { validateCategory } from './domain/category';
export { validateFiscalFields } from './domain/fiscal';
export type { FiscalFields, FiscalInput } from './domain/fiscal';
export { validateProduct } from './domain/product';
export type { ProductData, ProductInput } from './domain/product';
export { validateService } from './domain/service';
export type { ServiceData, ServiceInput } from './domain/service';

// Casos de uso
export { archiveProduct } from './application/archive-product';
export { archiveService } from './application/archive-service';
export { createCategory } from './application/create-category';
export { createProduct } from './application/create-product';
export { createService } from './application/create-service';
export { deleteCategory } from './application/delete-category';
export { getProduct } from './application/get-product';
export { listCategories } from './application/list-categories';
export { listServices } from './application/list-services';
export { reactivateProduct } from './application/reactivate-product';
export { reactivateService } from './application/reactivate-service';
export { renameCategory } from './application/rename-category';
export { searchProducts } from './application/search-products';
export type { SearchProductsInput } from './application/search-products';
export { updateProduct } from './application/update-product';
export type { UpdateProductInput } from './application/update-product';
export { updateService } from './application/update-service';
export type { UpdateServiceInput } from './application/update-service';

// Portas e tipos
export type { CatalogDeps } from './application/deps';
export type {
  CatalogUnitOfWork,
  CategoryRecord,
  ProductRecord,
  ServiceRecord,
} from './application/ports';

// Infraestrutura (montada na cola do Next, `src/lib`)
export { PrismaCatalogUnitOfWork } from './infrastructure/prisma-catalog-unit-of-work';
