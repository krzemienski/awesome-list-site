import GenericCrudManager, { BaseEntityWithCount, GenericCrudManagerProps } from "./GenericCrudManager";
import { categoryConfig } from "./configs/category-config";

interface CategoryWithCount extends BaseEntityWithCount {
  id: number;
  name: string;
  slug: string;
  resourceCount: number;
}

const TypedCrudManager = GenericCrudManager as React.ComponentType<GenericCrudManagerProps<CategoryWithCount>>;

export default function CategoryManager() {
  return <TypedCrudManager {...categoryConfig} />;
}
