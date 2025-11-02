import { Link } from "wouter";
import { Sparkles, MapPin, Mail, Phone } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-none tracking-tight">Gulfood 2026</span>
                <span className="text-xs text-muted-foreground">AI Event Assistant</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Experience the world's largest food & beverage exhibition with cutting-edge AI technology. 
              Powered by Dubai World Trade Centre.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Dubai World Trade Centre & Expo City Dubai</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>info@gulfood2026.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>+971 4 308 6666</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">For Visitors</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/visitors">
                  <a className="hover:text-primary transition-colors">Company Analysis</a>
                </Link>
              </li>
              <li>
                <Link href="/visitors">
                  <a className="hover:text-primary transition-colors">Event Planner</a>
                </Link>
              </li>
              <li>
                <Link href="/visitors">
                  <a className="hover:text-primary transition-colors">Exhibitor Directory</a>
                </Link>
              </li>
              <li>
                <Link href="/visitors">
                  <a className="hover:text-primary transition-colors">Meeting Scheduler</a>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">For Exhibitors</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/exhibitors">
                  <a className="hover:text-primary transition-colors">Relevance Assessment</a>
                </Link>
              </li>
              <li>
                <Link href="/exhibitors">
                  <a className="hover:text-primary transition-colors">Competitive Analysis</a>
                </Link>
              </li>
              <li>
                <Link href="/exhibitors">
                  <a className="hover:text-primary transition-colors">Contact Sales</a>
                </Link>
              </li>
              <li>
                <Link href="/exhibitors">
                  <a className="hover:text-primary transition-colors">Booth Booking</a>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© {currentYear} Dubai World Trade Centre. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-primary transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
