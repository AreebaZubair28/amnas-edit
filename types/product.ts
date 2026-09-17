export type ProductStatus =
  | "in_stock"
  | "coming_soon"
  | "preorder";

export type Gender =
  | "female"
  | "male"
  | "unisex";

export type Product = {
  id: string;
  name: string;

  // Existing product fields
  brand: string;
  category: string;

  // Brand and category relationships
  brand_id: string | null;
  category_id: string | null;

  status: ProductStatus;
  gender: Gender;

  price: number | null;

  // Product information
  description: string | null;
  details: string | null;
  delivery_return: string | null;

  // Images
  image_url: string | null;
  gallery: string[];

  // Contact links
  whatsapp_url: string | null;
  instagram_url: string | null;

  featured: boolean;

  created_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  color_name: string;
  image_url: string | null;
  gallery: string[];
  details: string | null;
  delivery_return: string | null;
  price: number | null;
  created_at: string;
};

export const STATUS_LABELS: Record<
  ProductStatus,
  string
> = {
  in_stock: "In Stock",
  coming_soon: "Coming In",
  preorder: "Preorder / Sourced",
};

export const STATUS_CLASS: Record<
  ProductStatus,
  string
> = {
  in_stock: "badge-stock",
  coming_soon: "badge-coming",
  preorder: "badge-preorder",
};