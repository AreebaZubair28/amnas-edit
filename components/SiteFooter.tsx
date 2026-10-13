import Link from "next/link";
import { Instagram, MessageCircle, Music2 } from "lucide-react";

type SiteFooterProps = {
  whatsappUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
};

export default function SiteFooter({ whatsappUrl, instagramUrl, tiktokUrl }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <div className="site-footer-brand">
          <div className="logo">Amna&apos;s <span>Edit</span></div>
          <p>Curated pieces. Personal service.</p>
          <p className="site-footer-note">Explore your favourites and inquire directly about availability.</p>
        </div>
        <nav className="site-footer-group" aria-label="Footer navigation">
          <h2>Explore</h2>
          <Link href="/">Home</Link>
          <Link href="/collection">Collection</Link>
          <Link href="/policies">Policies</Link>
        </nav>
        <div className="site-footer-group">
          <h2>Get in touch</h2>
          {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={17} aria-hidden="true" /> WhatsApp</a>}
          {instagramUrl && <a href={instagramUrl} target="_blank" rel="noreferrer"><Instagram size={17} aria-hidden="true" /> Instagram</a>}
          {tiktokUrl && <a href={tiktokUrl} target="_blank" rel="noreferrer"><Music2 size={17} aria-hidden="true" /> TikTok</a>}
        </div>
      </div>
      <div className="site-footer-bottom">
        <span>Amna&apos;s Edit · Curated with care</span>
        <Link href="/admin" className="footer-owner-link">Owner access</Link>
      </div>
    </footer>
  );
}
