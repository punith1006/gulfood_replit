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
    <div style="padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff; font-family: system-ui, -apple-system, sans-serif;">
      <div style="display: flex; gap: 16px; align-items: start;">
        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #ea580c, #f59e0b); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <span style="color: white; font-size: 24px;">↗</span>
        </div>
        <div style="flex: 1;">
          <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #111827;">Help Gulfood 2026 Grow!</h3>
          <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280;">Share Gulfood 2026 with your network and help grow our community.</p>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            \${platforms.map(p => \`
              <button 
                onclick="window.gulfoodShare('\${p.name}')" 
                style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: \${p.color}; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: transform 0.2s;"
                onmouseover="this.style.transform='scale(1.05)'" 
                onmouseout="this.style.transform='scale(1)'"
              >
                <span>\${p.icon}</span> \${p.label}
              </button>
            \`).join('')}
          </div>
        </div>
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
        <div className="bg-white p-6 rounded-lg border border-border">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-2xl">↗</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1">Help Gulfood 2026 Grow!</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Share Gulfood 2026 with your network and help grow our community.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-[#0077B5] text-white hover:bg-[#006399]">LinkedIn</Badge>
                <Badge className="bg-[#1877F2] text-white hover:bg-[#0d6efd]">Facebook</Badge>
                <Badge className="bg-black text-white hover:bg-gray-800">X</Badge>
                <Badge className="bg-[#25D366] text-white hover:bg-[#20BD5A]">WhatsApp</Badge>
                <Badge className="bg-gray-600 text-white hover:bg-gray-700">Email</Badge>
              </div>
            </div>
          </div>
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
