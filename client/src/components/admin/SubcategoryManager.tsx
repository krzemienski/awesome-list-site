import GenericCrudManager, { BaseEntityWithCount } from "./GenericCrudManager";
import { subcategoryConfig } from "./configs/subcategory-config";

interface SubcategoryWithCount extends BaseEntityWithCount {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  resourceCount: number;
}

export default function SubcategoryManager() {
  return <GenericCrudManager<SubcategoryWithCount> {...subcategoryConfig} />;
}
