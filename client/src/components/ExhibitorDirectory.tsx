import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Globe, Calendar, Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import boothImage from "@assets/generated_images/Premium_exhibitor_booth_display_ce2758d3.png";

//todo: remove mock functionality
const mockExhibitors = [
  {
    id: 1,
    name: "Lactalis Group",
    sector: "Dairy",
    country: "France",
    booth: "Hall 1 - A234",
    description: "Global dairy leader offering premium cheese, milk, and yogurt products",
    matchScore: 95
  },
  {
    id: 2,
    name: "Al Rawabi Dairy",
    sector: "Dairy",
    country: "UAE",
    booth: "Hall 1 - B112",
    description: "Leading regional dairy producer with fresh milk and laban products",
    matchScore: 92
  },
  {
    id: 3,
    name: "Tyson Foods",
    sector: "Meat & Poultry",
    country: "USA",
    booth: "Hall 3 - C445",
    description: "Premium meat and poultry supplier with global distribution",
    matchScore: 88
  },
  {
    id: 4,
    name: "Estrella Damm",
    sector: "Beverages",
    country: "Spain",
    booth: "Hall 2 - D567",
    description: "Premium beer and beverage manufacturer",
    matchScore: 85
  },
  {
    id: 5,
    name: "Beyond Meat",
    sector: "Plant-Based",
    country: "USA",
    booth: "Hall 4 - E789",
    description: "Innovative plant-based meat alternatives",
    matchScore: 82
  },
  {
    id: 6,
    name: "Oatly",
    sector: "Beverages",
    country: "Sweden",
    booth: "Hall 2 - F234",
    description: "Oat milk and dairy alternative products",
    matchScore: 80
  }
];

export default function ExhibitorDirectory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSector, setSelectedSector] = useState("all");

  const filteredExhibitors = mockExhibitors.filter(exhibitor => {
    const matchesSearch = exhibitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exhibitor.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = selectedSector === "all" || exhibitor.sector === selectedSector;
    return matchesSearch && matchesSector;
  });

  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Exhibitor Directory
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Browse and connect with 8,500+ exhibitors across 12 industry sectors
          </p>
        </div>

        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search exhibitors by name, product, or sector..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-exhibitors"
            />
          </div>
          <Select value={selectedSector} onValueChange={setSelectedSector}>
            <SelectTrigger className="sm:w-[200px]" data-testid="select-sector">
              <SelectValue placeholder="All Sectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              <SelectItem value="Dairy">Dairy</SelectItem>
              <SelectItem value="Beverages">Beverages</SelectItem>
              <SelectItem value="Meat & Poultry">Meat & Poultry</SelectItem>
              <SelectItem value="Plant-Based">Plant-Based</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExhibitors.map((exhibitor) => (
            <Card key={exhibitor.id} className="overflow-hidden group hover-elevate" data-testid={`card-exhibitor-${exhibitor.id}`}>
              <div className="h-40 bg-muted overflow-hidden">
                <img
                  src={boothImage}
                  alt={exhibitor.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg" data-testid={`text-exhibitor-name-${exhibitor.id}`}>{exhibitor.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {exhibitor.matchScore}% Match
                    </Badge>
                  </div>
                  <Badge className="mb-3">{exhibitor.sector}</Badge>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {exhibitor.description}
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="w-4 h-4" />
                    <span>{exhibitor.country}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{exhibitor.booth}</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full gap-2" data-testid={`button-schedule-meeting-${exhibitor.id}`}>
                  <Calendar className="w-4 h-4" />
                  Schedule Meeting
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {filteredExhibitors.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No exhibitors found matching your criteria</p>
          </div>
        )}
      </div>
    </section>
  );
}
