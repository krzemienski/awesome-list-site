import GenericCrudManager, { BaseEntityWithCount, GenericCrudManagerProps } from "./GenericCrudManager";
import { subSubcategoryConfig } from "./configs/subsubcategory-config";

interface SubSubcategoryWithCount extends BaseEntityWithCount {
  id: number;
  name: string;
  slug: string;
  subcategoryId: number;
  resourceCount: number;
}

const TypedCrudManager = GenericCrudManager as React.ComponentType<GenericCrudManagerProps<SubSubcategoryWithCount>>;

export default function SubSubcategoryManager() {
  return <TypedCrudManager {...subSubcategoryConfig} />;
}
