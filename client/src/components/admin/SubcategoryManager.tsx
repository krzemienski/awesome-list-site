import GenericCrudManager, { GenericCrudManagerProps } from "./GenericCrudManager";
import { subcategoryConfig, type SubcategoryWithCount } from "./configs/subcategory-config";

const TypedCrudManager = GenericCrudManager as React.ComponentType<GenericCrudManagerProps<SubcategoryWithCount>>;

export default function SubcategoryManager() {
  return <TypedCrudManager {...subcategoryConfig} />;
}
