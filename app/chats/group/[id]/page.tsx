import GroupChatClient from '@/components/group-chats/GroupChatClient'

export default function GroupChatPage({ params }: { params: { id: string } }) {
  return <GroupChatClient chatId={params.id} />
}
