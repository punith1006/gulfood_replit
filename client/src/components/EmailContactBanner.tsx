import { useQuery } from '@tanstack/react-query';
import { Mail, MessageCircle, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface InboxInfo {
  inboxId: string;
  username: string;
  domain: string;
  emailAddress: string;
  totalEmails: number;
  pendingCount: number;
  respondedCount: number;
  escalatedCount: number;
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
    <div className="container mx-auto px-4 py-8">
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">Need Help? Email Us</CardTitle>
              <p className="text-muted-foreground mt-1">
                Our AI assistant is available 24/7 to answer your Gulfood 2026 questions
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-accent/50">
            <Mail className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium text-foreground">Email Address</p>
              <a 
                href={`mailto:${primaryInbox.emailAddress}`}
                className="text-primary hover:underline font-mono text-lg"
                data-testid="link-email-contact"
              >
                {primaryInbox.emailAddress}
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Inquiries</p>
                <p className="text-lg font-semibold" data-testid="text-total-emails">
                  {primaryInbox.totalEmails}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Clock className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-lg font-semibold" data-testid="text-pending-emails">
                  {primaryInbox.pendingCount}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Responded</p>
                <p className="text-lg font-semibold" data-testid="text-responded-emails">
                  {primaryInbox.respondedCount}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Escalated</p>
                <p className="text-lg font-semibold" data-testid="text-escalated-emails">
                  {primaryInbox.escalatedCount}
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
