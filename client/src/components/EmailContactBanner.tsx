import { useQuery } from '@tanstack/react-query';
import { Mail, MessageCircle, CheckCircle, Star } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface InboxInfo {
  inboxId: string;
  username: string;
  domain: string;
  emailAddress: string;
  totalEmails: number;
  resolvedCount: number;
  successRate: number;
}

export default function EmailContactBanner() {
  const { data: inboxInfo, isLoading } = useQuery<InboxInfo[]>({
    queryKey: ['/api/email/inbox-info'],
  });

  if (isLoading) {
    return null;
  }

  if (!inboxInfo || inboxInfo.length === 0 || !inboxInfo[0]) {
    return null;
  }

  const primaryInbox = inboxInfo[0];

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-green-500/5 overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-3xl">Need Help? Email Us</CardTitle>
              <p className="text-muted-foreground mt-1.5 text-base">
                Email us at gulfood2026@agentmail.to anytime:
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 p-5 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <Mail className="w-6 h-6 text-primary" />
            <div className="flex-1">
              <p className="font-semibold text-foreground mb-1">Email Address</p>
              <a 
                href={`mailto:${primaryInbox.emailAddress}`}
                className="text-primary hover:underline font-mono text-xl"
                data-testid="link-email-contact"
              >
                {primaryInbox.emailAddress}
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200/50 dark:border-blue-700/30">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Inquiries</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100" data-testid="text-total-emails">
                  {primaryInbox.totalEmails}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-5 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border border-green-200/50 dark:border-green-700/30">
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Resolved</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100" data-testid="text-resolved-emails">
                  {primaryInbox.resolvedCount}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-5 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border border-amber-200/50 dark:border-amber-700/30">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Star className="w-6 h-6 text-amber-600 dark:text-amber-400 fill-amber-600 dark:fill-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Success Rate</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100" data-testid="text-success-rate">
                  {primaryInbox.successRate}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-muted/20 rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              What can our AI assistant help with?
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">1</Badge>
                <span>Find specific exhibitors, booth locations, and company information</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">2</Badge>
                <span>Event schedule, venues (DEC & DWTC), parking, and logistics</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">3</Badge>
                <span>Meeting requests and appointment booking</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">4</Badge>
                <span>General inquiries about Gulfood 2026 (complex questions escalated to human staff)</span>
              </li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Emails are automatically analyzed and responded to within minutes. Complex inquiries are forwarded to our team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
