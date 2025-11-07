import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Code, Copy, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EmbeddableWidgetGenerator() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Use production URL from environment variable, fallback to current origin for development
  const productionUrl = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://gulfood2026.replit.app');
  const isProduction = import.meta.env.VITE_APP_URL !== undefined;
  
  const widgetCode = `<!-- Gulfood 2026 Referral Widget -->
<div id="gulfood-referral-widget"></div>
<script>
(function() {
  const widget = document.getElementById('gulfood-referral-widget');
  // Production Gulfood application URL - ensures tracking works when embedded on external sites
  const baseUrl = '${productionUrl}';
  
  const shareContent = {
    title: "Join me at Gulfood 2026!",
    text: "Join me at Gulfood 2026 - the world's largest annual food & hospitality event! January 26-30, 2026 in Dubai. Discover 5,000+ exhibitors, network with industry leaders, and explore the future of food.",
    url: baseUrl,
    hashtags: "Gulfood2026,FoodInnovation,Dubai"
  };

  const platforms = [
    { name: 'linkedin', color: '#0077B5', icon: 'in', label: 'LinkedIn' },
    { name: 'facebook', color: '#1877F2', icon: 'f', label: 'Facebook' },
    { name: 'x', color: '#000000', icon: 'X', label: 'X' },
    { name: 'whatsapp', color: '#25D366', icon: 'W', label: 'WhatsApp' },
    { name: 'email', color: '#666666', icon: '@', label: 'Email' }
  ];

  function trackReferral(platform) {
    fetch(baseUrl + '/api/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform })
    }).catch(err => console.log('Tracking error:', err));
  }

  function share(platform) {
    trackReferral(platform);
    const encodedUrl = encodeURIComponent(shareContent.url);
    const encodedText = encodeURIComponent(shareContent.text);
    const encodedTitle = encodeURIComponent(shareContent.title);
    
    let shareUrl = '';
    switch (platform) {
      case 'linkedin':
        shareUrl = \`https://www.linkedin.com/sharing/share-offsite/?url=\${encodedUrl}\`;
        break;
      case 'facebook':
        shareUrl = \`https://www.facebook.com/sharer/sharer.php?u=\${encodedUrl}&quote=\${encodedText}\`;
        break;
      case 'x':
        shareUrl = \`https://twitter.com/intent/tweet?url=\${encodedUrl}&text=\${encodedText}&hashtags=\${shareContent.hashtags}\`;
        break;
      case 'whatsapp':
        shareUrl = \`https://wa.me/?text=\${encodedTitle}%0A%0A\${encodedText}%0A%0A\${encodedUrl}\`;
        break;
      case 'email':
        shareUrl = \`mailto:?subject=\${encodedTitle}&body=\${encodedText}%0A%0A\${encodedUrl}\`;
        break;
    }
    if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
  }

  widget.innerHTML = \`
    <div style="max-width: 600px; margin: 0 auto; border: 2px solid rgba(255, 193, 7, 0.2); border-radius: 12px; overflow: hidden; background: #ffffff; font-family: system-ui, -apple-system, sans-serif;">
      <div style="text-align: center; padding: 16px 16px 8px;">
        <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #111827;">
          Join me at Gulfood 2026 and be part of this exciting event by registering today
        </h2>
      </div>
      
      <div style="position: relative; width: 100%; aspect-ratio: 16 / 9;">
        <img 
          src="\${baseUrl}/gulfood-2026-share.png" 
          alt="Gulfood 2026 - January 26-30, 2026 in Dubai"
          style="width: 100%; height: 100%; object-fit: cover; display: block;"
        />
      </div>
      
      <div style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 20px; background: linear-gradient(to bottom right, #f9fafb, #f3f4f6); border-top: 1px solid #e5e7eb;">
        \${platforms.map(p => \`
          <button 
            onclick="window.gulfoodShare('\${p.name}')" 
            style="width: 48px; height: 48px; background: \${p.color}; color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 20px; font-weight: 600; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.2s;"
            onmouseover="this.style.transform='scale(1.1)'" 
            onmouseout="this.style.transform='scale(1)'"
            title="Share on \${p.label}"
          >
            \${p.icon}
          </button>
        \`).join('')}
      </div>
    </div>
  \`;

  window.gulfoodShare = share;
})();
</script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(widgetCode);
    setCopied(true);
    toast({
      title: "✓ Widget Code Copied!",
      description: "The embeddable code has been copied to your clipboard. You can now paste it into your website, email template, or registration page.",
      duration: 4000,
    });
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-bold">Embeddable Referral Widget</h3>
        </div>
        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
          For Marketing
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Copy and paste this code into your registration pages, confirmation emails, or marketing materials to add social sharing buttons.
      </p>

      {!isProduction && (
        <Alert className="mb-4 border-orange-600 bg-orange-50 dark:bg-orange-950/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-700 dark:text-orange-400">
            <strong>Development Environment Detected:</strong> This widget code uses your current URL ({productionUrl}). 
            For production use, set the <code className="px-1 py-0.5 bg-orange-100 dark:bg-orange-900 rounded text-xs">VITE_APP_URL</code> environment variable to your production domain.
          </AlertDescription>
        </Alert>
      )}

      <div className="relative">
        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto border border-border">
          <code>{widgetCode}</code>
        </pre>
        <Button
          size="sm"
          className="absolute top-2 right-2"
          onClick={copyToClipboard}
          data-testid="button-copy-widget-code"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy Code
            </>
          )}
        </Button>
      </div>

      <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <h4 className="text-sm font-semibold mb-2">Preview:</h4>
        <div className="max-w-xl mx-auto">
          <Card className="overflow-hidden border-2 border-[#FFC107]/20">
            <div className="text-center p-4 pb-2">
              <h2 className="text-base font-bold text-foreground">
                Join me at Gulfood 2026 and be part of this exciting event by registering today
              </h2>
            </div>
            
            <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
              <img 
                src="/gulfood-2026-share.png" 
                alt="Gulfood 2026 - January 26-30, 2026 in Dubai"
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex items-center justify-center gap-3 py-5 bg-gradient-to-br from-background to-muted/30 border-t border-border">
              <div className="w-12 h-12 rounded-full bg-[#0077B5] flex items-center justify-center shadow-md">
                <span className="text-white text-xl font-semibold">in</span>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center shadow-md">
                <span className="text-white text-xl font-semibold">f</span>
              </div>
              <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center shadow-md">
                <span className="text-white text-xl font-semibold">X</span>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center shadow-md">
                <span className="text-white text-xl font-semibold">W</span>
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center shadow-md">
                <span className="text-white text-xl font-semibold">@</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        <strong>Usage tips:</strong>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Paste this code in your website's HTML where you want the widget to appear</li>
          <li>Include in email templates (HTML emails only)</li>
          <li>Add to registration confirmation pages to maximize sharing</li>
          <li>All clicks are automatically tracked in your analytics dashboard</li>
          <li className="text-orange-700 dark:text-orange-400 font-medium">
            Widget calls API at: <code className="px-1 bg-orange-100 dark:bg-orange-900 rounded">{productionUrl}</code>
          </li>
          {isProduction && (
            <li className="text-green-700 dark:text-green-400 font-medium">
              ✓ Production URL configured - safe for external embedding
            </li>
          )}
        </ul>
      </div>
    </Card>
  );
}
