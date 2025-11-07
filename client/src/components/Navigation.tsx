import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Menu, X, Sparkles, Building2 } from "lucide-react";
import { useState } from "react";

export default function Navigation() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Home", path: "/" },
    { label: "Visitors", path: "/visitors" },
    { label: "Exhibitors", path: "/exhibitors" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/">
            <div className="flex items-center gap-2 hover-elevate rounded-lg px-3 py-2 cursor-pointer" data-testid="link-home">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-none tracking-tight">Gulfood 2026</span>
                <span className="text-xs text-muted-foreground">AI Assistant</span>
              </div>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
              >
                <span
                  className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${
                    location === item.path ? "text-primary" : "text-foreground"
                  }`}
                  data-testid={`link-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  {item.label}
                </span>
              </Link>
            ))}
            <Link href="/exhibitor/verify">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                data-testid="button-exhibitor-access"
              >
                <Building2 className="w-4 h-4" />
                Exhibitor Access
              </Button>
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <Link href="/exhibitor/verify">
              <Button
                variant="ghost"
                size="icon"
                data-testid="button-mobile-exhibitor-access"
              >
                <Building2 className="w-5 h-5" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-4 py-3 space-y-3">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <span
                  className={`block py-2 text-sm font-medium cursor-pointer ${
                    location === item.path ? "text-primary" : "text-foreground"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid={`link-mobile-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  {item.label}
                </span>
              </Link>
            ))}
            <Link href="/exhibitor/verify">
              <Button
                variant="outline"
                className="w-full gap-2 mt-2"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="button-mobile-exhibitor-access-full"
              >
                <Building2 className="w-4 h-4" />
                Exhibitor Access
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
