import GenericCrudManager, { BaseEntityWithCount } from "./GenericCrudManager";
import { subSubcategoryConfig } from "./configs/subsubcategory-config";

interface SubSubcategoryWithCount extends BaseEntityWithCount {
  id: number;
  name: string;
  slug: string;
  subcategoryId: number;
  resourceCount: number;
}

export default function SubSubcategoryManager() {
  return <GenericCrudManager<SubSubcategoryWithCount> {...subSubcategoryConfig} />;
}
