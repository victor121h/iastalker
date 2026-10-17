// /studio/chat/[conversationId] — an existing conversation (loaded client-side; unknown ids show a
// notice and fall back to a new creation).
import { ChatApp } from '@/components/studio/chat/ChatApp';

export const dynamic = 'force-dynamic';

export default function ConversationPage({ params }: { params: { conversationId: string } }) {
  return <ChatApp initialConversationId={params.conversationId} />;
}
