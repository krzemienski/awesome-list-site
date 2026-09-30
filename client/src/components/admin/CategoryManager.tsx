import GenericCrudManager, { GenericCrudManagerProps } from "./GenericCrudManager";
import { categoryConfig, type CategoryWithCount } from "./configs/category-config";

const TypedCrudManager = GenericCrudManager as React.ComponentType<GenericCrudManagerProps<CategoryWithCount>>;

export default function CategoryManager() {
  return <TypedCrudManager {...categoryConfig} />;
}
