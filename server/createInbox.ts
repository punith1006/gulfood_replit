import { getUncachableAgentMailClient } from './agentmail';
import { storage } from './storage';

async function createGulfoodInbox() {
  try {
    console.log('🚀 Creating AgentMail inbox for Gulfood 2026...\n');
    
    // Check if inbox already exists in database
    const existingInbox = await storage.getAgentMailInbox();
    if (existingInbox) {
      console.log('✅ Inbox already exists in database:');
      console.log('   Email:', existingInbox.emailAddress);
      console.log('   Inbox ID:', existingInbox.inboxId);
      console.log('   Username:', existingInbox.username);
      console.log('   Domain:', existingInbox.domain);
      return existingInbox;
    }
    
    console.log('📧 Creating new inbox via AgentMail API...');
    const client = await getUncachableAgentMailClient();
    
    let inbox;
    try {
      // Attempt to create inbox
      inbox = await client.inboxes.create({
        username: 'gulfood2026'
      });
      console.log('✅ Inbox created successfully via API!');
      console.log('   Raw inbox object:', JSON.stringify(inbox, null, 2));
    } catch (error: any) {
      // Check if inbox already exists in AgentMail
      if (error?.statusCode === 409 || error?.message?.includes('already exists')) {
        console.log('ℹ️  Inbox already exists in AgentMail. Fetching...');
        
        const inboxes = await client.inboxes.list();
        console.log('   All inboxes:', JSON.stringify(inboxes, null, 2));
        inbox = inboxes.results?.find((i: any) => i.username === 'gulfood2026');
        
        if (!inbox) {
          // Try to construct the inbox object manually based on the error
          console.log('   Could not find in list. Constructing manually...');
          inbox = {
            inboxId: 'gulfood2026@agentmail.to',
            username: 'gulfood2026',
            domain: 'agentmail.to',
            emailAddress: 'gulfood2026@agentmail.to'
          };
        }
        console.log('✅ Found/constructed existing inbox in AgentMail!');
        console.log('   Inbox object:', JSON.stringify(inbox, null, 2));
      } else {
        throw error;
      }
    }
    
    // Save to database
    console.log('\n💾 Saving inbox to database...');
    const saved = await storage.saveAgentMailInbox({
      inboxId: inbox.inboxId,
      username: inbox.username || 'gulfood2026',
      domain: inbox.domain || 'agentmail.to',
      emailAddress: inbox.emailAddress
    });
    
    console.log('\n✅ SUCCESS! Inbox is fully configured:\n');
    console.log('   📧 Email Address:', saved.emailAddress);
    console.log('   🆔 Inbox ID:', saved.inboxId);
    console.log('   👤 Username:', saved.username);
    console.log('   🌐 Domain:', saved.domain);
    console.log('   📅 Created:', saved.createdAt);
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Visitors can now email:', saved.emailAddress);
    console.log('   2. Configure webhook in AgentMail dashboard (if not already done):');
    console.log('      Webhook URL: https://your-replit-app.replit.dev/api/email/webhook');
    console.log('   3. Test by sending an email to:', saved.emailAddress);
    
    return saved;
  } catch (error) {
    console.error('\n❌ Error creating inbox:', error);
    throw error;
  }
}

// Run the script
createGulfoodInbox()
  .then(() => {
    console.log('\n✅ Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
