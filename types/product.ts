export type ProductStatus = "in_stock" | "coming_soon" | "preorder";
export type Gender = "female" | "male" | "unisex";

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  status: ProductStatus;
  gender: Gender;
  price: number | null;
  description: string | null;
  image_url: string | null;
  gallery: string[];
  whatsapp_url: string | null;
  instagram_url: string | null;
  featured: boolean;
  created_at: string;
};

export const STATUS_LABELS: Record<ProductStatus, string> = {
  in_stock: "In Stock",
  coming_soon: "Coming In",
  preorder: "Preorder / Sourced",
};

export const STATUS_CLASS: Record<ProductStatus, string> = {
  in_stock: "badge-stock",
  coming_soon: "badge-coming",
  preorder: "badge-preorder",
};