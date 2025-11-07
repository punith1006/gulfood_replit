import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Copy, Check, Linkedin, Facebook, Mail } from "lucide-react";
import { SiX, SiWhatsapp } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";

interface ReferralShareCardProps {
  sessionId: string;
  name?: string;
  email?: string;
}

export default function ReferralShareCard({ sessionId, name, email }: ReferralShareCardProps) {
  const [referralUrl, setReferralUrl] = useState<string>("");
  const [referralCode, setReferralCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [clickedPlatform, setClickedPlatform] = useState<string | null>(null);
  const { toast } = useToast();

  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/referrals/generate-code", {
        sessionId,
        name,
        email
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      setReferralUrl(data.referralUrl);
      setReferralCode(data.referralCode);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate referral link. Please try again.",
        variant: "destructive"
      });
    }
  });

  const trackReferralMutation = useMutation({
    mutationFn: async (platform: string) => {
      return await apiRequest("POST", "/api/referrals", {
        platform,
        referralCode,
        referrerName: name,
        referrerEmail: email,
        sessionId
      });
    },
    onError: (error) => {
      console.error("Failed to track referral:", error);
    }
  });

  useEffect(() => {
    generateCodeMutation.mutate();
  }, [sessionId]);

  const handleCopyLink = async () => {
    if (!referralUrl) return;
    
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      trackReferralMutation.mutate("copy_link");
      toast({
        title: "Link copied!",
        description: "Your referral link has been copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleShare = async (platform: string) => {
    if (!referralUrl) return;

    setClickedPlatform(platform);
    trackReferralMutation.mutate(platform);

    const shareContent = {
      title: "Join me at Gulfood 2026!",
      text: "Join me at Gulfood 2026 - the world's largest annual food & beverage event! January 26-30, 2026 in Dubai. Discover 5,000+ exhibitors, network with industry leaders, and explore the future of food.",
      url: referralUrl,
      hashtags: "Gulfood2026,FoodInnovation,Dubai"
    };

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
      label: "LinkedIn",
      bgColor: "bg-[#0077B5]"
    },
    {
      platform: "facebook",
      icon: Facebook,
      label: "Facebook",
      bgColor: "bg-[#1877F2]"
    },
    {
      platform: "x",
      icon: SiX,
      label: "X",
      bgColor: "bg-black"
    },
    {
      platform: "email",
      icon: Mail,
      label: "Email",
      bgColor: "bg-gray-600"
    },
    {
      platform: "whatsapp",
      icon: SiWhatsapp,
      label: "WhatsApp",
      bgColor: "bg-[#25D366]"
    }
  ];

  if (generateCodeMutation.isPending) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        <p className="mt-4 text-sm text-muted-foreground">Generating your referral link...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">
          Join me at Gulfood 2026 and be part of this exciting event by registering today
        </h2>
      </div>

      <Card className="overflow-hidden border-2 border-[#FFC107]/20" data-testid="card-gulfood-preview">
        <div className="bg-gradient-to-br from-gray-900 via-black to-gray-800 p-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#FFC107]/10 via-transparent to-transparent" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFC107]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl" />
          
          <div className="relative text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-6xl md:text-7xl font-black text-white tracking-tight leading-none">
                GULFOOD
              </h1>
              <div className="flex items-center justify-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#FFC107]" />
                <p className="text-[#FFC107] text-3xl font-bold">2026</p>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#FFC107]" />
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-white/90 text-sm font-medium tracking-wider uppercase">
                The World's Largest Food & Beverage Event
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-[#FFC107] to-amber-500 text-black font-bold text-center py-4 px-6 rounded-lg shadow-lg">
              <p className="text-lg">26-30 January 2026</p>
              <p className="text-sm mt-1 opacity-90">Dubai World Trade Centre & Expo City Dubai</p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center space-y-1">
                <p className="text-[#FFC107] text-2xl font-bold">5,000+</p>
                <p className="text-white/60 text-xs uppercase tracking-wide">Exhibitors</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-[#FFC107] text-2xl font-bold">120+</p>
                <p className="text-white/60 text-xs uppercase tracking-wide">Countries</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-[#FFC107] text-2xl font-bold">100K+</p>
                <p className="text-white/60 text-xs uppercase tracking-wide">Visitors</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-3 py-5 bg-gradient-to-br from-background to-muted/30 border-t border-border">
          {socialButtons.map(({ platform, icon: Icon, bgColor }) => (
            <button
              key={platform}
              onClick={() => handleShare(platform)}
              className={`w-12 h-12 rounded-full ${bgColor} flex items-center justify-center hover-elevate active-elevate-2 shadow-md`}
              data-testid={`button-share-${platform}`}
              aria-label={`Share on ${platform}`}
            >
              <Icon className="w-5 h-5 text-white" />
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Your unique referral link
        </label>
        <div className="flex gap-2">
          <Input
            value={referralUrl}
            readOnly
            className="flex-1 font-mono text-sm"
            data-testid="input-referral-url"
          />
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="gap-2"
            data-testid="button-copy-link"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Share this link with your network to invite them to Gulfood 2026
        </p>
      </div>
    </div>
  );
}
