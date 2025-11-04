import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Share2, Linkedin, Facebook, Mail } from "lucide-react";
import { SiX, SiWhatsapp } from "react-icons/si";

interface ReferralWidgetProps {
  referrerName?: string;
  referrerEmail?: string;
  sessionId?: string;
  compact?: boolean;
}

export default function ReferralWidget({ 
  referrerName, 
  referrerEmail, 
  sessionId,
  compact = false 
}: ReferralWidgetProps) {
  const [clickedPlatform, setClickedPlatform] = useState<string | null>(null);

  const trackReferralMutation = useMutation({
    mutationFn: async (platform: string) => {
      return await apiRequest("/api/referrals", "POST", {
        platform,
        referrerName,
        referrerEmail,
        sessionId
      });
    }
  });

  const shareContent = {
    title: "Join me at Gulfood 2026!",
    text: "Join me at Gulfood 2026 - the world's largest annual food & hospitality event! January 26-30, 2026 in Dubai. Discover 5,000+ exhibitors, network with industry leaders, and explore the future of food.",
    url: typeof window !== 'undefined' ? window.location.origin : "https://gulfood2026.com",
    hashtags: "Gulfood2026,FoodInnovation,Dubai"
  };

  const handleShare = async (platform: string) => {
    setClickedPlatform(platform);
    trackReferralMutation.mutate(platform);

    let shareUrl = "";
    const encodedUrl = encodeURIComponent(shareContent.url);
    const encodedText = encodeURIComponent(shareContent.text);
    const encodedTitle = encodeURIComponent(shareContent.title);

    switch (platform) {
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
        break;
      case "x":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}&hashtags=${shareContent.hashtags}`;
        break;
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodedTitle}%0A%0A${encodedText}%0A%0A${encodedUrl}`;
        break;
      case "email":
        shareUrl = `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }

    setTimeout(() => setClickedPlatform(null), 1000);
  };

  const socialButtons = [
    {
      platform: "linkedin",
      icon: Linkedin,
      color: "bg-[#0077B5] hover:bg-[#006399]",
      label: "LinkedIn"
    },
    {
      platform: "facebook",
      icon: Facebook,
      color: "bg-[#1877F2] hover:bg-[#0d6efd]",
      label: "Facebook"
    },
    {
      platform: "x",
      icon: SiX,
      color: "bg-black hover:bg-gray-800",
      label: "X"
    },
    {
      platform: "whatsapp",
      icon: SiWhatsapp,
      color: "bg-[#25D366] hover:bg-[#20BD5A]",
      label: "WhatsApp"
    },
    {
      platform: "email",
      icon: Mail,
      color: "bg-gray-600 hover:bg-gray-700",
      label: "Email"
    }
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Share2 className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground mr-2">Share:</span>
        <div className="flex gap-2">
          {socialButtons.map(({ platform, icon: Icon, color }) => (
            <Button
              key={platform}
              size="icon"
              variant="ghost"
              className={`h-8 w-8 ${clickedPlatform === platform ? "scale-95" : ""}`}
              onClick={() => handleShare(platform)}
              data-testid={`button-share-${platform}`}
            >
              <Icon className="w-4 h-4" />
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-full bg-gradient-to-br from-orange-600 to-amber-600">
          <Share2 className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold mb-1">Help Gulfood 2026 Grow!</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Share Gulfood 2026 with your network and help grow our community.
          </p>
          
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              Share on social media
            </p>
            <div className="flex flex-wrap gap-3">
              {socialButtons.map(({ platform, icon: Icon, color, label }) => (
                <Button
                  key={platform}
                  variant="outline"
                  size="sm"
                  className={`${color} text-white border-0 ${
                    clickedPlatform === platform ? "scale-95" : ""
                  }`}
                  onClick={() => handleShare(platform)}
                  data-testid={`button-share-${platform}`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
