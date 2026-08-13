"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, LogOut, Package, Eye, Search, X, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Product, ProductStatus, Gender, STATUS_LABELS, STATUS_CLASS } from "@/types/product";

const blank: Partial<Product> = {
  name: "", brand: "", category: "Bags", status: "in_stock", gender: "female",
  price: null, description: "", image_url: "", gallery: [], whatsapp_url: "", instagram_url: "", featured: false
};

export default function AdminDashboard() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<Partial<Product> | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const client = supabase();
    const { data: { user } } = await client.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    setUserEmail(user.email || "");
    const { data, error } = await client.from("products").select("*").order("created_at", { ascending: false });
    if (error) setError(error.message);
    setProducts((data as Product[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function logout() { await supabase().auth.signOut(); router.push("/"); }

  async function uploadImage(file: File) {
    setError("");
    if (!file.type.startsWith("image/")) return setError("Please select an image file.");
    if (file.size > 8 * 1024 * 1024) return setError("Image must be 8MB or smaller.");
    setUploading(true);
    const client = supabase();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await client.storage.from("product-images").upload(path, file, {
      cacheControl: "3600", upsert: false
    });
    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }
    const { data } = client.storage.from("product-images").getPublicUrl(path);
    setEditor(prev => prev ? { ...prev, image_url: data.publicUrl } : prev);
    setUploading(false);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    if (!editor?.name?.trim()) return setError("Product name is required.");
    const client = supabase();
    const payload = {
      name: editor.name.trim(), brand: editor.brand || "", category: editor.category || "Accessories",
      status: editor.status || "in_stock", gender: editor.gender || "unisex", price: editor.price ?? null,
      description: editor.description || "", image_url: editor.image_url || null,
      gallery: editor.gallery || [], whatsapp_url: editor.whatsapp_url || null,
      instagram_url: editor.instagram_url || null, featured: !!editor.featured
    };
    const result = editor.id ? await client.from("products").update(payload).eq("id", editor.id) : await client.from("products").insert(payload);
    if (result.error) setError(result.error.message); else { setEditor(null); await load(); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    const { error } = await supabase().from("products").delete().eq("id", id);
    if (error) setError(error.message); else await load();
  }

  const filtered = useMemo(() => products.filter(p => `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(query.toLowerCase())), [products, query]);

  if (loading) {
    return (
      <main className="admin-page">
        <div className="empty">Checking your account...</div>
      </main>
    );
  }

  return <main className="admin-page">
    <header className="admin-header">
      <div><a href="/" className="logo">Amna&apos;s <span>Edit</span></a><span className="admin-pill">OWNER</span></div>
      <div className="admin-user"><span>{userEmail}</span><button onClick={logout} className="ghost"><LogOut size={17}/> Sign out</button></div>
    </header>
    <section className="admin-content">
      <div className="admin-title"><div><p className="kicker">OWNER DASHBOARD</p><h1>Manage your edit.</h1></div><button className="button primary" onClick={()=>setEditor({...blank})}><Plus size={18}/> Add Product</button></div>
      <div className="stats">
        <div><Package/><strong>{products.length}</strong><span>Total products</span></div>
        <div><Eye/><strong>{products.filter(p=>p.status==="in_stock").length}</strong><span>In stock</span></div>
        <div><Package/><strong>{products.filter(p=>p.status==="coming_soon").length}</strong><span>Coming in</span></div>
        <div><Package/><strong>{products.filter(p=>p.status==="preorder").length}</strong><span>Preorders</span></div>
      </div>
      <div className="admin-toolbar"><div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products..." /></div></div>
      {error && <div className="error admin-error">{error}</div>}
      {loading ? <div className="empty">Loading dashboard...</div> : <div className="admin-table-wrap"><table><thead><tr><th>Product</th><th>Brand</th><th>Category</th><th>Status</th><th>Price</th><th>Actions</th></tr></thead><tbody>
        {filtered.map(p=><tr key={p.id}><td><div className="table-product">{p.image_url ? <img src={p.image_url} alt="" /> : <div className="tiny-placeholder">AE</div>}<span>{p.name}</span></div></td><td>{p.brand || "—"}</td><td>{p.category}</td><td><span className={`status-badge ${STATUS_CLASS[p.status]}`}>{STATUS_LABELS[p.status]}</span></td><td>{p.price === null ? "—" : `Rs. ${p.price.toLocaleString()}`}</td><td><div className="row-actions"><button className="icon-btn" title="Edit" onClick={()=>setEditor({...p})}><Pencil size={17}/></button><button className="icon-btn danger" title="Delete" onClick={()=>remove(p.id)}><Trash2 size={17}/></button></div></td></tr>)}
      </tbody></table></div>}
    </section>
    {editor && <div className="modal-backdrop"><div className="editor-modal"><button className="icon-btn modal-close" onClick={()=>setEditor(null)}><X/></button><p className="kicker">{editor.id ? "EDIT PRODUCT" : "NEW PRODUCT"}</p><h2>{editor.id ? "Update piece" : "Add a new piece"}</h2>
      <form onSubmit={save} className="editor-form">
        <div className="form-grid">
          <label>Product name<input required value={editor.name || ""} onChange={e=>setEditor({...editor,name:e.target.value})}/></label>
          <label>Brand<input value={editor.brand || ""} onChange={e=>setEditor({...editor,brand:e.target.value})}/></label>
          <label>Category<select value={editor.category || "Accessories"} onChange={e=>setEditor({...editor,category:e.target.value})}>{["Bags","Shoes","Slippers","Jewelry","Wallets","Belts","Scarves","Sunglasses","Accessories"].map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Status<select value={editor.status || "in_stock"} onChange={e=>setEditor({...editor,status:e.target.value as ProductStatus})}><option value="in_stock">In Stock</option><option value="coming_soon">Coming In</option><option value="preorder">Preorder / Sourced</option></select></label>
          <label>Audience<select value={editor.gender || "unisex"} onChange={e=>setEditor({...editor,gender:e.target.value as Gender})}><option value="female">Women</option><option value="male">Men</option><option value="unisex">Unisex</option></select></label>
          <label>Price (PKR)<input type="number" min="0" value={editor.price ?? ""} onChange={e=>setEditor({...editor,price:e.target.value ? Number(e.target.value) : null})}/></label>
        </div>
        <div className="upload-section">
          <label>Product image</label>
          <div className="upload-row">
            <label className="upload-button">
              <Upload size={16}/>
              {uploading ? "Uploading..." : "Upload image"}
              <input type="file" accept="image/*" disabled={uploading}
                onChange={e => { const file=e.target.files?.[0]; if(file) uploadImage(file); e.currentTarget.value=""; }} />
            </label>
            <span className="upload-help">JPG, PNG, WEBP • max 8MB</span>
          </div>
          {editor.image_url && <div className="image-preview">
            <img src={editor.image_url} alt="Product preview" />
            <button type="button" className="remove-image" onClick={()=>setEditor({...editor,image_url:""})}><X size={15}/> Remove</button>
          </div>}
          <details className="url-fallback">
            <summary>Or use an image URL</summary>
            <input value={editor.image_url || ""} onChange={e=>setEditor({...editor,image_url:e.target.value})} placeholder="https://..." />
          </details>
        </div>
        <label>Description<textarea rows={4} value={editor.description || ""} onChange={e=>setEditor({...editor,description:e.target.value})}/></label>
        <div className="form-grid">
          <label>WhatsApp link<input value={editor.whatsapp_url || ""} onChange={e=>setEditor({...editor,whatsapp_url:e.target.value})} placeholder="Optional — uses site WhatsApp by default"/></label>
          <label>Instagram link<input value={editor.instagram_url || ""} onChange={e=>setEditor({...editor,instagram_url:e.target.value})} placeholder="Optional — uses site Instagram by default"/></label>
        </div>
        <label className="check"><input type="checkbox" checked={!!editor.featured} onChange={e=>setEditor({...editor,featured:e.target.checked})}/> Feature this product</label>
        {error && <div className="error">{error}</div>}
        <div className="editor-actions"><button type="button" className="button secondary" onClick={()=>setEditor(null)}>Cancel</button><button className="button primary" type="submit">Save Product</button></div>
      </form>
    </div></div>}
  </main>
}