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
import defaultBoothImage from "@assets/generated_images/Premium_exhibitor_booth_display_ce2758d3.png";
import dairyBoothImage from "@assets/generated_images/Dairy_products_booth_829c48df.png";
import beverageBoothImage from "@assets/generated_images/Beverages_booth_display_d23c0063.png";
import organicBoothImage from "@assets/generated_images/Organic_foods_booth_b43532d6.png";
import meatBoothImage from "@assets/generated_images/Meat_and_poultry_booth_3805ced3.png";
import gourmetBoothImage from "@assets/generated_images/Gourmet_specialty_foods_booth_49ea8d22.png";
import meetingImage from "@assets/generated_images/Business_meeting_at_exhibition_4cc21be9.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Exhibitor, InsertMeeting } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const getBoothImageForSector = (sector: string): string => {
  const sectorLower = sector.toLowerCase();
  if (sectorLower.includes("dairy")) return dairyBoothImage;
  if (sectorLower.includes("beverage")) return beverageBoothImage;
  if (sectorLower.includes("organic") || sectorLower.includes("plant-based")) return organicBoothImage;
  if (sectorLower.includes("meat") || sectorLower.includes("poultry")) return meatBoothImage;
  if (sectorLower.includes("gourmet") || sectorLower.includes("specialty")) return gourmetBoothImage;
  return defaultBoothImage;
};

export default function ExhibitorDirectory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSector, setSelectedSector] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [meetingDialog, setMeetingDialog] = useState<{ open: boolean; exhibitor: Exhibitor | null }>({
    open: false,
    exhibitor: null
  });
  const [meetingForm, setMeetingForm] = useState({
    visitorName: "",
    visitorEmail: "",
    visitorCompany: "",
    meetingDate: "",
    duration: 30,
    notes: ""
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Only fetch exhibitors when user has entered search term or selected filters
  const hasSearchCriteria = searchTerm.trim() !== "" || selectedSector !== "all" || selectedCountry !== "all";
  
  const { data: exhibitors = [], isLoading } = useQuery<Exhibitor[]>({
    queryKey: ["/api/exhibitors", searchTerm, selectedSector, selectedCountry],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (selectedSector !== "all") params.append("sector", selectedSector);
      if (selectedCountry !== "all") params.append("country", selectedCountry);
      
      const res = await fetch(`/api/exhibitors?${params}`);
      if (!res.ok) throw new Error("Failed to fetch exhibitors");
      return await res.json();
    },
    enabled: hasSearchCriteria // Only fetch when search criteria is provided
  });

  const scheduleMeetingMutation = useMutation({
    mutationFn: async (meetingData: InsertMeeting) => {
      const res = await apiRequest("POST", "/api/meetings", meetingData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Meeting Scheduled",
        description: "Your meeting request has been submitted successfully."
      });
      setMeetingDialog({ open: false, exhibitor: null });
      setMeetingForm({
        visitorName: "",
        visitorEmail: "",
        visitorCompany: "",
        meetingDate: "",
        duration: 30,
        notes: ""
      });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
    },
    onError: () => {
      toast({
        title: "Scheduling Failed",
        description: "Unable to schedule meeting. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleScheduleMeeting = (exhibitor: Exhibitor) => {
    setMeetingDialog({ open: true, exhibitor });
  };

  const submitMeeting = () => {
    if (!meetingDialog.exhibitor) return;
    
    scheduleMeetingMutation.mutate({
      visitorName: meetingForm.visitorName,
      visitorEmail: meetingForm.visitorEmail,
      visitorCompany: meetingForm.visitorCompany,
      meetingDate: new Date(meetingForm.meetingDate),
      duration: meetingForm.duration,
      notes: meetingForm.notes,
      exhibitorId: meetingDialog.exhibitor.id,
      status: "pending" as const
    });
  };

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
              <SelectItem value="Snacks">Snacks</SelectItem>
              <SelectItem value="Fats & Oils">Fats & Oils</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="sm:w-[200px]" data-testid="select-country">
              <SelectValue placeholder="All Countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              <SelectItem value="UAE">UAE</SelectItem>
              <SelectItem value="USA">USA</SelectItem>
              <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
              <SelectItem value="France">France</SelectItem>
              <SelectItem value="Brazil">Brazil</SelectItem>
              <SelectItem value="Switzerland">Switzerland</SelectItem>
              <SelectItem value="Spain">Spain</SelectItem>
              <SelectItem value="Sweden">Sweden</SelectItem>
              <SelectItem value="Netherlands">Netherlands</SelectItem>
              <SelectItem value="Denmark">Denmark</SelectItem>
              <SelectItem value="New Zealand">New Zealand</SelectItem>
              <SelectItem value="Egypt">Egypt</SelectItem>
              <SelectItem value="Qatar">Qatar</SelectItem>
              <SelectItem value="Turkey">Turkey</SelectItem>
              <SelectItem value="Jordan">Jordan</SelectItem>
              <SelectItem value="Lebanon">Lebanon</SelectItem>
              <SelectItem value="Italy">Italy</SelectItem>
              <SelectItem value="Germany">Germany</SelectItem>
              <SelectItem value="India">India</SelectItem>
              <SelectItem value="Israel">Israel</SelectItem>
              <SelectItem value="Austria">Austria</SelectItem>
              <SelectItem value="UK">UK</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-6 h-96 animate-pulse">
                <div className="h-40 bg-muted rounded mb-4" />
                <div className="h-6 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded mb-4" />
                <div className="h-20 bg-muted rounded" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exhibitors.map((exhibitor) => (
              <Card key={exhibitor.id} className="overflow-hidden group hover-elevate" data-testid={`card-exhibitor-${exhibitor.id}`}>
                <div className="h-40 bg-muted overflow-hidden">
                  <img
                    src={getBoothImageForSector(exhibitor.sector)}
                    alt={`${exhibitor.sector} booth at ${exhibitor.name}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-lg" data-testid={`text-exhibitor-name-${exhibitor.id}`}>{exhibitor.name}</h3>
                    </div>
                    <Badge className="mb-3">{exhibitor.sector}</Badge>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
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

                  <Button 
                    variant="outline" 
                    className="w-full gap-2" 
                    onClick={() => handleScheduleMeeting(exhibitor)}
                    data-testid={`button-schedule-meeting-${exhibitor.id}`}
                  >
                    <Calendar className="w-4 h-4" />
                    Schedule Meeting
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && exhibitors.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            {!hasSearchCriteria ? (
              <div>
                <p className="text-lg font-semibold mb-2">Start Your Search</p>
                <p className="text-muted-foreground">
                  Enter a company name, select a sector, or choose a country to discover exhibitors
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No exhibitors found matching your criteria</p>
            )}
          </div>
        )}

        <Dialog open={meetingDialog.open} onOpenChange={(open) => {
          if (!open) {
            setMeetingDialog({ open: false, exhibitor: null });
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="rounded-lg overflow-hidden -mx-6 -mt-6 mb-6">
              <img 
                src={meetingImage} 
                alt="Business meeting at exhibition" 
                className="w-full h-40 object-cover"
                data-testid="img-meeting-banner"
              />
            </div>
            <DialogHeader>
              <DialogTitle>Schedule Meeting</DialogTitle>
              <DialogDescription>
                Request a meeting with {meetingDialog.exhibitor?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="visitor-name">Your Name</Label>
                <Input
                  id="visitor-name"
                  value={meetingForm.visitorName}
                  onChange={(e) => setMeetingForm({ ...meetingForm, visitorName: e.target.value })}
                  data-testid="input-visitor-name"
                />
              </div>
              <div>
                <Label htmlFor="visitor-email">Email</Label>
                <Input
                  id="visitor-email"
                  type="email"
                  value={meetingForm.visitorEmail}
                  onChange={(e) => setMeetingForm({ ...meetingForm, visitorEmail: e.target.value })}
                  data-testid="input-visitor-email"
                />
              </div>
              <div>
                <Label htmlFor="visitor-company">Company</Label>
                <Input
                  id="visitor-company"
                  value={meetingForm.visitorCompany}
                  onChange={(e) => setMeetingForm({ ...meetingForm, visitorCompany: e.target.value })}
                  data-testid="input-visitor-company"
                />
              </div>
              <div>
                <Label htmlFor="meeting-date">Preferred Date & Time</Label>
                <Input
                  id="meeting-date"
                  type="datetime-local"
                  value={meetingForm.meetingDate}
                  onChange={(e) => setMeetingForm({ ...meetingForm, meetingDate: e.target.value })}
                  data-testid="input-meeting-date"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={meetingForm.notes}
                  onChange={(e) => setMeetingForm({ ...meetingForm, notes: e.target.value })}
                  data-testid="input-notes"
                />
              </div>
              <Button 
                className="w-full" 
                onClick={submitMeeting}
                disabled={
                  scheduleMeetingMutation.isPending || 
                  !meetingForm.visitorName || 
                  !meetingForm.visitorEmail || 
                  !meetingForm.visitorCompany ||
                  !meetingForm.meetingDate
                }
                data-testid="button-submit-meeting"
              >
                {scheduleMeetingMutation.isPending ? "Scheduling..." : "Submit Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
