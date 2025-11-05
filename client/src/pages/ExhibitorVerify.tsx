import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Building2, Key } from "lucide-react";
import { useLocation } from "wouter";

export default function ExhibitorVerify() {
  const [, setLocation] = useLocation();
  const { loginExhibitor } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter your access code",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/exhibitor/verify-code", { code: code.trim() });
      const data = await res.json();
      
      if (data.success) {
        loginExhibitor({
          email: data.email,
          companyName: data.companyName,
          code: code.trim(),
          token: data.token
        });
        
        toast({
          title: "Access Granted!",
          description: `Welcome, ${data.companyName}!`,
        });
        
        setLocation("/");
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired access code",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500/5 via-background to-orange-500/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Building2 className="w-10 h-10 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">Exhibitor Access</CardTitle>
          <CardDescription className="text-center">
            Enter the special access code sent to your email to access exhibitor features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="access-code">Access Code</Label>
              <Input
                id="access-code"
                type="text"
                placeholder="XXXX-XXXX-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono text-center tracking-wider"
                data-testid="input-access-code"
              />
              <p className="text-xs text-muted-foreground">
                This code was sent to your registered email address
              </p>
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
              disabled={isLoading}
              data-testid="button-verify-submit"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Verify Access
                </>
              )}
            </Button>
          </form>
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-center text-muted-foreground">
              Don't have an access code? Contact the Gulfood 2026 team to get your exhibitor credentials.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
