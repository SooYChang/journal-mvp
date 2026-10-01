"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/repository", label: "Repository" },
  { href: "/journals", label: "Journals" },
];

export function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated, isAdmin, logout, isLoading } = useAuth();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function onLogout() {
    await logout();
    setOpen(false);
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          Society Journals
        </Link>
        <button
          className="icon-button mobile-nav-toggle"
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={`nav-links ${open ? "open" : ""}`} aria-label="Primary">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={isActive(link.href) ? "active" : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin ? (
            <Link
              href="/admin/members"
              className={pathname.startsWith("/admin") ? "active" : undefined}
              onClick={() => setOpen(false)}
            >
              Admin
            </Link>
          ) : null}
          <div className="nav-auth">
            {isLoading ? (
              <span className="muted">Loading…</span>
            ) : isAuthenticated && user ? (
              <>
                <span className="nav-user">{user.displayName}</span>
                <button type="button" className="text-button" onClick={() => void onLogout()}>
                  Log out
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)}>
                Log in
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
