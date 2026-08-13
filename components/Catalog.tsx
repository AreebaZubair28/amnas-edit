"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, Instagram, MessageCircle, ChevronDown, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Product, STATUS_LABELS, STATUS_CLASS } from "@/types/product";

const defaultCategories = ["All", "Bags", "Shoes", "Slippers", "Jewelry", "Wallets", "Belts", "Scarves", "Sunglasses", "Accessories"];

function makeWhatsApp(product: Product) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (!number) return product.whatsapp_url || "#";
  const text = `Hi! I'm interested in ${product.name}${product.brand ? ` by ${product.brand}` : ""}. Is it available?`;
  return `https://wa.me/${number.replace(/\\D/g, "")}?text=${encodeURIComponent(text)}`;
}

function ProductCard({ product, onOpen }: { product: Product; onOpen: (p: Product) => void }) {
  return (
    <article className="product-card" onClick={() => onOpen(product)}>
      <div className="product-image-wrap">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="product-image" />
        ) : (
          <div className="image-placeholder"><span>Amna&apos;s Edit</span></div>
        )}
        <span className={`status-badge ${STATUS_CLASS[product.status]}`}>{STATUS_LABELS[product.status]}</span>
      </div>
      <div className="product-info">
        <div className="eyebrow">{product.brand || "Curated Edit"}</div>
        <h3>{product.name}</h3>
        {product.price !== null && <p className="price">Rs. {product.price.toLocaleString()}</p>}
      </div>
    </article>
  );
}

function ProductModal({ product, close }: { product: Product; close: () => void }) {
  const wa = makeWhatsApp(product);
  const ig = product.instagram_url || process.env.NEXT_PUBLIC_INSTAGRAM_URL || "#";
  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="product-modal" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal-close" onClick={close}><X size={20} /></button>
        <div className="modal-media">
          {product.image_url ? <img src={product.image_url} alt={product.name} /> : <div className="image-placeholder large"><span>Amna&apos;s Edit</span></div>}
        </div>
        <div className="modal-details">
          <span className={`status-badge ${STATUS_CLASS[product.status]}`}>{STATUS_LABELS[product.status]}</span>
          <div className="eyebrow">{product.brand}</div>
          <h2>{product.name}</h2>
          {product.price !== null && <div className="modal-price">Rs. {product.price.toLocaleString()}</div>}
          <p>{product.description || "A carefully selected piece from Amna's Edit."}</p>
          <div className="modal-meta">
            <span>{product.category}</span><span>{product.gender}</span>
          </div>
          <div className="modal-actions">
            <a href={wa} target="_blank" rel="noreferrer" className="button primary"><MessageCircle size={17}/> Inquire on WhatsApp</a>
            <a href={ig} target="_blank" rel="noreferrer" className="button secondary"><Instagram size={17}/> DM on Instagram</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState("All");
  const [category, setCategory] = useState("All");
  const [brand, setBrand] = useState("All");
  const [gender, setGender] = useState("All");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase().from("products").select("*").order("featured", { ascending: false }).order("created_at", { ascending: false });
      setProducts((data as Product[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const categories = useMemo(() => Array.from(new Set([...defaultCategories, ...products.map(p => p.category).filter(Boolean)])), [products]);
  const brands = useMemo(() => ["All", ...Array.from(new Set(products.map(p => p.brand).filter(Boolean)))], [products]);

  const filtered = products.filter(p => {
    const q = query.toLowerCase().trim();
    return (status === "All" || p.status === status) &&
      (category === "All" || p.category === category) &&
      (brand === "All" || p.brand === brand) &&
      (gender === "All" || p.gender === gender) &&
      (!q || `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(q));
  });

  return (
    <main>
      <header className="site-header">
        <a href="/" className="logo">Amna&apos;s <span>Edit</span></a>
        <nav><a href="#collection">Collection</a><a href="#about">About</a><a href="/admin" className="admin-link">Owner Login</a></nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">THE CURATED EDIT</p>
          <h1>Pieces worth<br/><em>keeping.</em></h1>
          <p className="hero-text">A considered collection of bags, shoes, jewelry and more — curated for effortless luxury.</p>
          <a href="#collection" className="button primary hero-button">Explore Collection</a>
        </div>
        <div className="hero-art"><div className="art-circle"></div><div className="art-card">AMNA&apos;S<br/><i>EDIT</i></div></div>
      </section>

      <section id="collection" className="collection">
        <div className="section-heading">
          <div><p className="kicker">SHOP THE EDIT</p><h2>Our Collection</h2></div>
          <p className="count">{filtered.length} pieces</p>
        </div>

        <div className="filters">
          <div className="search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search pieces, brands..." /></div>
          <div className="select-wrap"><SlidersHorizontal size={16}/><select value={status} onChange={e => setStatus(e.target.value)}><option value="All">All Status</option><option value="in_stock">In Stock</option><option value="coming_soon">Coming In</option><option value="preorder">Preorder / Sourced</option></select></div>
          <div className="select-wrap"><select value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
          <div className="select-wrap"><select value={brand} onChange={e => setBrand(e.target.value)}>{brands.map(b => <option key={b}>{b}</option>)}</select></div>
          <div className="select-wrap"><select value={gender} onChange={e => setGender(e.target.value)}><option>All</option><option value="female">Women</option><option value="male">Men</option><option value="unisex">Unisex</option></select></div>
        </div>

        {loading ? <div className="empty">Loading the edit...</div> : filtered.length === 0 ? <div className="empty">No pieces match these filters.</div> :
          <div className="product-grid">{filtered.map(p => <ProductCard key={p.id} product={p} onOpen={setOpen} />)}</div>}
      </section>

      <section id="about" className="about">
        <p className="kicker">AMNA&apos;S EDIT</p>
        <h2>Curated, not crowded.</h2>
        <p>From in-stock finds to carefully sourced preorders, every piece is selected with a love for timeless style and beautiful details.</p>
      </section>

      <footer><div className="logo">Amna&apos;s <span>Edit</span></div><p>Curated pieces. Personal service.</p><div className="footer-links"><a href={process.env.NEXT_PUBLIC_INSTAGRAM_URL || "#"} target="_blank" rel="noreferrer"><Instagram size={18}/></a></div></footer>

      {open && <ProductModal product={open} close={() => setOpen(null)} />}
    </main>
  );
}