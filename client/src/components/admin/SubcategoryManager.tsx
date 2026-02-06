import GenericCrudManager, { BaseEntityWithCount, GenericCrudManagerProps } from "./GenericCrudManager";
import { subcategoryConfig } from "./configs/subcategory-config";

interface SubcategoryWithCount extends BaseEntityWithCount {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  resourceCount: number;
}

const TypedCrudManager = GenericCrudManager as React.ComponentType<GenericCrudManagerProps<SubcategoryWithCount>>;

export default function SubcategoryManager() {
  return <TypedCrudManager {...subcategoryConfig} />;
}
