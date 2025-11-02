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

export default function ExhibitorDirectory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSector, setSelectedSector] = useState("all");
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

  const { data: exhibitors = [], isLoading } = useQuery<Exhibitor[]>({
    queryKey: ["/api/exhibitors", searchTerm, selectedSector],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (selectedSector !== "all") params.append("sector", selectedSector);
      
      return await apiRequest<Exhibitor[]>(`/api/exhibitors?${params}`);
    }
  });

  const scheduleMeetingMutation = useMutation({
    mutationFn: async (meetingData: InsertMeeting) => {
      return await apiRequest("/api/meetings", {
        method: "POST",
        body: JSON.stringify(meetingData),
        headers: { "Content-Type": "application/json" }
      });
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
      ...meetingForm,
      exhibitorId: meetingDialog.exhibitor.id,
      meetingDate: new Date(meetingForm.meetingDate),
      status: "pending"
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
                    src={boothImage}
                    alt={exhibitor.name}
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
            <p className="text-muted-foreground">No exhibitors found matching your criteria</p>
          </div>
        )}

        <Dialog open={meetingDialog.open} onOpenChange={(open) => setMeetingDialog({ open, exhibitor: meetingDialog.exhibitor })}>
          <DialogContent>
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
                disabled={scheduleMeetingMutation.isPending || !meetingForm.visitorName || !meetingForm.visitorEmail || !meetingForm.meetingDate}
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
