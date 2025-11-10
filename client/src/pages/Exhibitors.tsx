import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Search, Globe, MapPin, Filter, X } from "lucide-react";
import type { Exhibitor } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Exhibitors() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedVenue, setSelectedVenue] = useState<string>("all");

  const { data: exhibitors = [], isLoading } = useQuery<Exhibitor[]>({
    queryKey: ["/api/exhibitors"],
  });

  // Get unique sectors, countries, and venues
  const sectors = Array.from(new Set(exhibitors.map(e => e.sector).filter(Boolean))).sort();
  const countries = Array.from(new Set(exhibitors.map(e => e.country).filter(Boolean))).sort();
  const venues = Array.from(new Set(exhibitors.map(e => e.venue).filter(Boolean))).sort();

  // Filter exhibitors
  const filteredExhibitors = exhibitors.filter(exhibitor => {
    const matchesSearch = !searchTerm || 
      exhibitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exhibitor.country?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSector = selectedSector === "all" || exhibitor.sector === selectedSector;
    const matchesCountry = selectedCountry === "all" || exhibitor.country === selectedCountry;
    const matchesVenue = selectedVenue === "all" || exhibitor.venue === selectedVenue;

    return matchesSearch && matchesSector && matchesCountry && matchesVenue;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSector("all");
    setSelectedCountry("all");
    setSelectedVenue("all");
  };

  const hasActiveFilters = searchTerm || selectedSector !== "all" || selectedCountry !== "all" || selectedVenue !== "all";

  // Color palette for cards
  const cardColors = [
    "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20",
    "from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20",
    "from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20",
    "from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20",
    "from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20",
    "from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-green-500/5">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary via-orange-500 to-green-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Building2 className="w-10 h-10" />
            </div>
            <h1 className="text-5xl font-bold">Exhibitors</h1>
          </div>
          <p className="text-center text-xl text-white/90 max-w-2xl mx-auto">
            Discover {exhibitors.length}+ companies showcasing innovations at Gulfood 2026
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Search and Filters */}
        <Card className="mb-8 border-primary/20 shadow-lg">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="Search exhibitors by name or country..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-base"
                  data-testid="input-exhibitor-search"
                />
              </div>

              {/* Filter Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select value={selectedSector} onValueChange={setSelectedSector}>
                  <SelectTrigger data-testid="select-sector-filter">
                    <SelectValue placeholder="All Sectors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sectors</SelectItem>
                    {sectors.map(sector => (
                      <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger data-testid="select-country-filter">
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {countries.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedVenue} onValueChange={setSelectedVenue}>
                  <SelectTrigger data-testid="select-venue-filter">
                    <SelectValue placeholder="All Venues" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Venues</SelectItem>
                    {venues.map(venue => (
                      <SelectItem key={venue} value={venue}>{venue}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="gap-2"
                    data-testid="button-clear-filters"
                  >
                    <X className="w-4 h-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-lg text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredExhibitors.length}</span> exhibitors
          </p>
          {hasActiveFilters && (
            <Badge variant="secondary" className="gap-2">
              <Filter className="w-3 h-3" />
              Filters Active
            </Badge>
          )}
        </div>

        {/* Exhibitors Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-48 animate-pulse bg-muted" />
            ))}
          </div>
        ) : filteredExhibitors.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-muted mx-auto flex items-center justify-center">
                <Building2 className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">No exhibitors found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline" className="gap-2">
                  <X className="w-4 h-4" />
                  Clear All Filters
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExhibitors.map((exhibitor, index) => {
              const colorClass = cardColors[index % cardColors.length];
              
              return (
                <Card 
                  key={exhibitor.id} 
                  className={`hover-elevate cursor-pointer transition-all duration-300 bg-gradient-to-br ${colorClass} border-2 hover:border-primary/50`}
                  data-testid={`card-exhibitor-${exhibitor.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg font-bold line-clamp-2 flex-1">
                        {exhibitor.name}
                      </CardTitle>
                      <div className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {exhibitor.sector && (
                      <Badge variant="secondary" className="font-medium">
                        {exhibitor.sector}
                      </Badge>
                    )}
                    
                    {exhibitor.country && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Globe className="w-4 h-4" />
                        <span>{exhibitor.country}</span>
                      </div>
                    )}
                    
                    {(exhibitor.venue || exhibitor.hall || exhibitor.stand) && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">
                          {[exhibitor.venue, exhibitor.hall, exhibitor.stand].filter(Boolean).join(" • ")}
                        </span>
                      </div>
                    )}

                    {exhibitor.website && (
                      <a 
                        href={exhibitor.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1 mt-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Globe className="w-3 h-3" />
                        Visit Website
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
