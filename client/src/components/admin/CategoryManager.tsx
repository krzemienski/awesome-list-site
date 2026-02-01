import GenericCrudManager, { BaseEntityWithCount } from "./GenericCrudManager";
import { categoryConfig } from "./configs/category-config";

interface CategoryWithCount extends BaseEntityWithCount {
  id: number;
  name: string;
  slug: string;
  resourceCount: number;
}

export default function CategoryManager() {
  return <GenericCrudManager<CategoryWithCount> {...categoryConfig} />;
}
