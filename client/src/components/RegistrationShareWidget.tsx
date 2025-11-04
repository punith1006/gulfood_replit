import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, CheckCircle2 } from "lucide-react";
import { SiLinkedin, SiFacebook, SiInstagram } from "react-icons/si";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RegistrationShareWidgetProps {
  compact?: boolean;
}

export default function RegistrationShareWidget({ compact = false }: RegistrationShareWidgetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const trackShareMutation = useMutation({
    mutationFn: async (platform: string) => {
      const res = await apiRequest("POST", "/api/referrals", { platform });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to track share");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/stats"] });
    }
  });

  const handleShare = (platform: string) => {
    // Track the share
    trackShareMutation.mutate(platform);

    const shareText = "I just registered for Gulfood 2026 - the world's largest food & beverage exhibition! Join me in Dubai, January 26-30, 2026. 🌍🍽️";
    const shareUrl = "https://visit.gulfood.com/reg/taTvFu6IraZ5MsCnrdzbHutAykNXdxkNXqaJunHZMSi?utm_source=www.gulfood.com&utm_medium=referral";
    
    let targetUrl = "";
    switch (platform) {
      case "linkedin":
        targetUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case "facebook":
        targetUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
        break;
      case "instagram":
        // Instagram doesn't support direct web sharing, so we'll copy to clipboard
        navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        toast({
          title: "Copied to Clipboard! 📋",
          description: "Share text copied. Open Instagram and paste it in your story or post!",
          duration: 5000,
        });
        return;
    }

    if (targetUrl) {
      window.open(targetUrl, '_blank', 'width=600,height=400');
    }
  };

  const platforms = [
    { name: "linkedin", icon: SiLinkedin, label: "LinkedIn", color: "#0A66C2" },
    { name: "facebook", icon: SiFacebook, label: "Facebook", color: "#1877F2" },
    { name: "instagram", icon: SiInstagram, label: "Instagram", color: "#E4405F" },
  ];

  if (compact) {
    return (
      <div className="space-y-2 pt-3 mt-2 border-t border-border" data-testid="registration-share-widget-container">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <h4 className="text-sm font-semibold text-green-900 dark:text-green-100">
            Registered? Share the News!
          </h4>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Let your network know you're attending Gulfood 2026
        </p>
        <div className="flex flex-wrap gap-2">
          {platforms.map((platform) => (
            <Button
              key={platform.name}
              onClick={() => handleShare(platform.name)}
              variant="outline"
              size="sm"
              className="gap-2 flex-1 min-w-[100px]"
              style={{ 
                borderColor: platform.color + '40',
                color: platform.color 
              }}
              data-testid={`button-share-${platform.name}`}
            >
              <platform.icon className="w-3.5 h-3.5" />
              <span className="text-xs">{platform.label}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className="p-6" data-testid="registration-share-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-green-900 dark:text-green-100">
            Registered? Spread the Word!
          </h3>
          <p className="text-sm text-muted-foreground">
            Share your excitement with your professional network
          </p>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Let colleagues and connections know you're attending the world's largest F&B exhibition
      </p>

      <div className="flex flex-wrap gap-3">
        {platforms.map((platform) => (
          <Button
            key={platform.name}
            onClick={() => handleShare(platform.name)}
            className="gap-2 flex-1 min-w-[140px]"
            style={{ 
              backgroundColor: platform.color,
              color: 'white'
            }}
            data-testid={`button-share-${platform.name}`}
          >
            <platform.icon className="w-4 h-4" />
            Share on {platform.label}
          </Button>
        ))}
      </div>

      <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-start gap-2">
          <Share2 className="w-4 h-4 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <strong>Pro tip:</strong> Share after you complete registration to help grow the Gulfood community!
          </p>
        </div>
      </div>
    </Card>
  );
}
