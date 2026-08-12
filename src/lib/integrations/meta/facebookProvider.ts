import type {
  SendMessageInput,
  SendMessageResult,
  SocialAccount,
  SocialProvider,
} from '@/lib/integrations/social/types'
import { metaGraphGet, metaGraphPost } from './client'

/** Facebook Page + Messenger via Page access token. */
export const facebookProvider: SocialProvider = {
  id: 'facebook',

  async getAccount(accessToken: string): Promise<SocialAccount> {
    const me = await metaGraphGet<{ id: string; name?: string }>(
      '/me',
      accessToken,
      { fields: 'id,name' },
      { host: 'facebook' },
    )
    return {
      provider: 'facebook',
      providerAccountId: me.id,
      username: null,
      displayName: me.name ?? null,
      accountType: 'page',
    }
  },

  async sendMessage(accessToken, input: SendMessageInput): Promise<SendMessageResult> {
    const json = await metaGraphPost<{ message_id?: string }>(
      '/me/messages',
      accessToken,
      {
        recipient: { id: input.recipientId },
        messaging_type: 'RESPONSE',
        message: { text: input.text },
      },
      { host: 'facebook' },
    )
    if (!json.message_id) throw new Error('Messenger sendMessage missing message_id')
    return { providerMessageId: json.message_id, raw: json }
  },
}

export const messengerProvider: SocialProvider = {
  ...facebookProvider,
  id: 'messenger',
}
