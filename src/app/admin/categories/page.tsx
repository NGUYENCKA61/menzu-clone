import { redirect } from "next/navigation";

/**
 * Category management moved into the products screen — adding a category is
 * step one of adding a product, not a separate errand. The route stays so a
 * bookmark from when it was its own page still lands somewhere useful.
 */
export default function AdminCategoriesPage() {
  redirect("/admin/products");
}
