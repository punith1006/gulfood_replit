import { useState } from "react";
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
import { Bell, Calendar, Key, Plus, Edit2, Trash2, Loader2, LogOut, Users } from "lucide-react";

export default function OrganizerAdmin() {
  const [, setLocation] = useLocation();
  const { authType, organizerAuth, logout } = useAuth();
  const { toast } = useToast();

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
          <TabsList className="grid w-full grid-cols-3">
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
