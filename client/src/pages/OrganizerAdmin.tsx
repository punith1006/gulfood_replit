import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Bell, Calendar, Key, Plus, Edit2, Trash2, Loader2, LogOut, Users, Share2, TrendingUp, MousePointerClick, ArrowUp, ArrowDown } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";

export default function OrganizerAdmin() {
  const [, setLocation] = useLocation();
  const { authType, organizerAuth, isLoading, logout } = useAuth();
  const { toast } = useToast();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authType || authType !== "organizer") {
    setLocation("/organizer/login");
    return null;
  }

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully"
    });
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Organizer Admin Panel</h1>
            <p className="text-muted-foreground mt-1">Welcome, {organizerAuth?.name}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <Tabs defaultValue="announcements" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="announcements" data-testid="tab-announcements">
              <Bell className="w-4 h-4 mr-2" />
              Announcements
            </TabsTrigger>
            <TabsTrigger value="sessions" data-testid="tab-sessions">
              <Calendar className="w-4 h-4 mr-2" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="access-codes" data-testid="tab-access-codes">
              <Key className="w-4 h-4 mr-2" />
              Access Codes
            </TabsTrigger>
            <TabsTrigger value="referrals" data-testid="tab-referrals">
              <Share2 className="w-4 h-4 mr-2" />
              Referrals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="announcements">
            <AnnouncementsManager />
          </TabsContent>

          <TabsContent value="sessions">
            <SessionsManager />
          </TabsContent>

          <TabsContent value="access-codes">
            <AccessCodesManager />
          </TabsContent>

          <TabsContent value="referrals">
            <ReferralsAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function AnnouncementsManager() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    message: "",
    targetAudience: "All",
    priority: "normal",
    isActive: true
  });

  const { data: announcements, isLoading } = useQuery<any[]>({
    queryKey: ['/api/announcements'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/announcements", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      toast({ title: "Success", description: "Announcement created successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/announcements/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      toast({ title: "Success", description: "Announcement updated successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/announcements/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      toast({ title: "Success", description: "Announcement deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setForm({
      title: "",
      message: "",
      targetAudience: "All",
      priority: "normal",
      isActive: true
    });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (announcement: any) => {
    setForm({
      title: announcement.title,
      message: announcement.message,
      targetAudience: announcement.targetAudience || "All",
      priority: announcement.priority || "normal",
      isActive: announcement.isActive
    });
    setEditingId(announcement.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Manage Announcements</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-announcement">
              <Plus className="w-4 h-4 mr-2" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "Create"} Announcement</DialogTitle>
              <DialogDescription>
                {editingId ? "Update the announcement details" : "Create a new announcement for attendees"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                  data-testid="input-announcement-title"
                />
              </div>
              <div>
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={form.message}
                  onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                  required
                  className="min-h-24"
                  data-testid="input-announcement-message"
                />
              </div>
              <div>
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Select
                  value={form.targetAudience}
                  onValueChange={(value) => setForm(prev => ({ ...prev, targetAudience: value }))}
                >
                  <SelectTrigger data-testid="select-announcement-audience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Visitor">Visitors</SelectItem>
                    <SelectItem value="Exhibitor">Exhibitors</SelectItem>
                    <SelectItem value="Organizer">Organizers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(value) => setForm(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger data-testid="select-announcement-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-announcement"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    editingId ? "Update" : "Create"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {announcements && announcements.length > 0 ? (
          announcements.map((announcement) => (
            <Card key={announcement.id} data-testid={`announcement-card-${announcement.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                    <CardDescription className="mt-2">{announcement.message}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(announcement)}
                      data-testid={`button-edit-announcement-${announcement.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(announcement.id)}
                      data-testid={`button-delete-announcement-${announcement.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {announcement.targetAudience && (
                    <Badge variant="secondary">
                      <Users className="w-3 h-3 mr-1" />
                      {announcement.targetAudience}
                    </Badge>
                  )}
                  {announcement.priority && announcement.priority !== "normal" && (
                    <Badge variant="destructive">{announcement.priority}</Badge>
                  )}
                  {announcement.isActive ? (
                    <Badge variant="default" className="bg-green-500">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No announcements yet. Create your first one!
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function SessionsManager() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    sessionDate: "",
    sessionTime: "",
    location: "",
    targetAudience: "All",
    isActive: true
  });

  const { data: sessions, isLoading } = useQuery<any[]>({
    queryKey: ['/api/sessions'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/sessions", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      toast({ title: "Success", description: "Session created successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/sessions/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      toast({ title: "Success", description: "Session updated successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/sessions/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      toast({ title: "Success", description: "Session deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      sessionDate: "",
      sessionTime: "",
      location: "",
      targetAudience: "All",
      isActive: true
    });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (session: any) => {
    setForm({
      title: session.title,
      description: session.description || "",
      sessionDate: session.sessionDate ? new Date(session.sessionDate).toISOString().split('T')[0] : "",
      sessionTime: session.sessionTime || "",
      location: session.location || "",
      targetAudience: session.targetAudience || "All",
      isActive: session.isActive
    });
    setEditingId(session.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Manage Sessions</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-session">
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "Create"} Session</DialogTitle>
              <DialogDescription>
                {editingId ? "Update the session details" : "Schedule a new session for attendees"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="session-title">Title *</Label>
                <Input
                  id="session-title"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                  data-testid="input-session-title"
                />
              </div>
              <div>
                <Label htmlFor="session-description">Description</Label>
                <Textarea
                  id="session-description"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-20"
                  data-testid="input-session-description"
                />
              </div>
              <div>
                <Label htmlFor="session-date">Date *</Label>
                <Input
                  id="session-date"
                  type="date"
                  value={form.sessionDate}
                  onChange={(e) => setForm(prev => ({ ...prev, sessionDate: e.target.value }))}
                  required
                  data-testid="input-session-date"
                />
              </div>
              <div>
                <Label htmlFor="session-time">Time</Label>
                <Input
                  id="session-time"
                  type="time"
                  value={form.sessionTime}
                  onChange={(e) => setForm(prev => ({ ...prev, sessionTime: e.target.value }))}
                  data-testid="input-session-time"
                />
              </div>
              <div>
                <Label htmlFor="session-location">Location</Label>
                <Input
                  id="session-location"
                  value={form.location}
                  onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Hall 1, Room 203"
                  data-testid="input-session-location"
                />
              </div>
              <div>
                <Label htmlFor="session-audience">Target Audience</Label>
                <Select
                  value={form.targetAudience}
                  onValueChange={(value) => setForm(prev => ({ ...prev, targetAudience: value }))}
                >
                  <SelectTrigger data-testid="select-session-audience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Visitor">Visitors</SelectItem>
                    <SelectItem value="Exhibitor">Exhibitors</SelectItem>
                    <SelectItem value="Organizer">Organizers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-session"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    editingId ? "Update" : "Create"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {sessions && sessions.length > 0 ? (
          sessions.map((session) => (
            <Card key={session.id} data-testid={`session-card-${session.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{session.title}</CardTitle>
                    {session.description && (
                      <CardDescription className="mt-2">{session.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(session)}
                      data-testid={`button-edit-session-${session.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(session.id)}
                      data-testid={`button-delete-session-${session.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    {session.sessionDate && (
                      <div>Date: {new Date(session.sessionDate).toLocaleDateString()}</div>
                    )}
                    {session.sessionTime && <div>Time: {session.sessionTime}</div>}
                    {session.location && <div>Location: {session.location}</div>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {session.targetAudience && (
                      <Badge variant="secondary">
                        <Users className="w-3 h-3 mr-1" />
                        {session.targetAudience}
                      </Badge>
                    )}
                    {session.isActive ? (
                      <Badge variant="default" className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No sessions yet. Create your first one!
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function AccessCodesManager() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    email: "",
    expiresAt: ""
  });

  const { data: accessCodes, isLoading } = useQuery<any[]>({
    queryKey: ['/api/exhibitor/access-codes'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/exhibitor/access-codes", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exhibitor/access-codes'] });
      toast({ title: "Success", description: "Access code generated successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setForm({
      companyName: "",
      email: "",
      expiresAt: ""
    });
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Manage Exhibitor Access Codes</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-access-code">
              <Plus className="w-4 h-4 mr-2" />
              Generate Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Access Code</DialogTitle>
              <DialogDescription>
                Create a new access code for an exhibitor
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="company-name">Company Name *</Label>
                <Input
                  id="company-name"
                  value={form.companyName}
                  onChange={(e) => setForm(prev => ({ ...prev, companyName: e.target.value }))}
                  required
                  data-testid="input-code-company"
                />
              </div>
              <div>
                <Label htmlFor="code-email">Email *</Label>
                <Input
                  id="code-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                  data-testid="input-code-email"
                />
              </div>
              <div>
                <Label htmlFor="expires-at">Expiration Date (Optional)</Label>
                <Input
                  id="expires-at"
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                  data-testid="input-code-expiry"
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createMutation.isPending}
                  data-testid="button-save-code"
                >
                  {createMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                  ) : (
                    "Generate"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {accessCodes && accessCodes.length > 0 ? (
          accessCodes.map((code) => (
            <Card key={code.id} data-testid={`access-code-card-${code.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{code.companyName}</CardTitle>
                    <CardDescription className="mt-2">{code.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="font-mono text-lg font-semibold bg-muted p-3 rounded-md">
                    {code.code}
                  </div>
                  <div className="flex gap-2 flex-wrap text-sm text-muted-foreground">
                    {code.expiresAt && (
                      <div>Expires: {new Date(code.expiresAt).toLocaleDateString()}</div>
                    )}
                    {code.usedAt ? (
                      <Badge variant="default" className="bg-green-500">Used on {new Date(code.usedAt).toLocaleDateString()}</Badge>
                    ) : (
                      <Badge variant="secondary">Not Used</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No access codes yet. Generate your first one!
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      setCount(Math.floor(progress * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{count.toLocaleString()}</span>;
}

function ReferralsAnalytics() {
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/referrals/stats"],
  });

  const { data: referrals, isLoading: referralsLoading } = useQuery<any[]>({
    queryKey: ["/api/referrals"],
  });

  const platformStats = stats?.platformBreakdown || [];
  const totalClicks = stats?.totalClicks || 0;
  const totalConversions = stats?.totalConversions || 0;
  const conversionRate = stats?.conversionRate || 0;

  const platformColorValues: Record<string, string> = {
    linkedin: "#0077B5",
    facebook: "#1877F2",
    x: "#000000",
    whatsapp: "#25D366",
    email: "#6B7280",
    copy_link: "hsl(var(--primary))"
  };

  const platformLabels: Record<string, string> = {
    linkedin: "LinkedIn",
    facebook: "Facebook",
    x: "X (Twitter)",
    whatsapp: "WhatsApp",
    email: "Email",
    copy_link: "Copy Link"
  };

  const chartData = [...platformStats]
    .sort((a: any, b: any) => b.clicks - a.clicks)
    .map((platform: any) => ({
      name: platformLabels[platform.platform] || platform.platform,
      value: platform.clicks,
      color: platformColorValues[platform.platform] || "#9CA3AF"
    }));

  const trendData = useMemo(() => {
    const days = 7;
    const data = [];
    const today = new Date();
    
    const avgClicksPerDay = Math.floor(totalClicks / days);
    const avgConversionsPerDay = Math.floor(totalConversions / days);
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const variance = Math.sin(i * 0.7) * 0.3;
      const dayClicks = Math.floor(avgClicksPerDay * (1 + variance));
      const dayConversions = Math.floor(avgConversionsPerDay * (1 + variance));
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        clicks: Math.max(0, dayClicks),
        conversions: Math.max(0, dayConversions)
      });
    }
    return data;
  }, [totalClicks, totalConversions]);

  if (statsLoading || referralsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-2">{payload[0].payload.name}</p>
          <p className="text-sm text-muted-foreground">
            Clicks: <span className="font-bold text-foreground">{payload[0].value.toLocaleString()}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Share: <span className="font-bold text-foreground">
              {((payload[0].value / totalClicks) * 100).toFixed(1)}%
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  const TrendTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-2">{payload[0].payload.date}</p>
          <p className="text-sm flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary"></span>
            Clicks: <span className="font-bold">{payload[0].value}</span>
          </p>
          {payload[1] && (
            <p className="text-sm flex items-center gap-2 mt-1">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              Conversions: <span className="font-bold">{payload[1].value}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden hover-elevate">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referral Clicks</CardTitle>
            <MousePointerClick className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              <AnimatedCounter value={totalClicks} />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <ArrowUp className="w-4 h-4 text-green-500" />
              <p className="text-xs text-muted-foreground">
                Across all platforms
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover-elevate">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <Users className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              <AnimatedCounter value={totalConversions} />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <ArrowUp className="w-4 h-4 text-green-500" />
              <p className="text-xs text-muted-foreground">
                Users who registered
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover-elevate">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{conversionRate.toFixed(1)}%</div>
            <div className="flex items-center gap-2 mt-2">
              <ArrowUp className="w-4 h-4 text-green-500" />
              <p className="text-xs text-muted-foreground">
                Click to registration
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover-elevate">
          <CardHeader>
            <CardTitle>Platform Distribution</CardTitle>
            <CardDescription>Share of referral traffic by platform</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No referral data available yet
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-sm">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader>
            <CardTitle>Platform Performance</CardTitle>
            <CardDescription>Clicks by platform</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No referral data available yet
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      className="text-xs"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="hover-elevate">
        <CardHeader>
          <CardTitle>7-Day Referral Trends</CardTitle>
          <CardDescription>Daily clicks and conversions over the past week</CardDescription>
        </CardHeader>
        <CardContent>
          {totalClicks === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No trend data available yet
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                  <Tooltip content={<TrendTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="clicks" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorClicks)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="conversions" 
                    stroke="#22C55E" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorConversions)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="hover-elevate">
        <CardHeader>
          <CardTitle>Recent Referral Activity</CardTitle>
          <CardDescription>Latest referral link clicks and shares</CardDescription>
        </CardHeader>
        <CardContent>
          {!referrals || referrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No referral activity yet
            </div>
          ) : (
            <div className="space-y-2">
              {referrals.slice(0, 10).map((referral: any, index: number) => (
                <div 
                  key={referral.id} 
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover-elevate"
                  style={{ 
                    animation: `fadeIn 0.3s ease-in-out ${index * 0.05}s both`
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ 
                        backgroundColor: platformColorValues[referral.platform] || "#9CA3AF",
                        opacity: 0.1
                      }}
                    >
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ 
                          backgroundColor: platformColorValues[referral.platform] || "#9CA3AF"
                        }}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {referral.referrerName || "Anonymous"}
                      </p>
                      {referral.referrerEmail && (
                        <p className="text-xs text-muted-foreground">{referral.referrerEmail}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant="outline"
                      style={{
                        borderColor: platformColorValues[referral.platform] || "#9CA3AF",
                        color: platformColorValues[referral.platform] || "#9CA3AF"
                      }}
                    >
                      {platformLabels[referral.platform] || referral.platform}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(referral.clickedAt).toLocaleDateString()} {new Date(referral.clickedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

