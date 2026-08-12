import type {
  SendMessageInput,
  SendMessageResult,
  SocialAccount,
  SocialCommentItem,
  SocialMediaItem,
  SocialProvider,
} from '@/lib/integrations/social/types'
import { metaGraphGet, metaGraphPost } from './client'

/**
 * Instagram API with Instagram Login (Business) — uses graph.instagram.com
 * and /me identity for the IG user. Messaging is webhook-first.
 */
export const instagramProvider: SocialProvider = {
  id: 'instagram',

  async getAccount(accessToken: string): Promise<SocialAccount> {
    const me = await metaGraphGet<{
      id: string
      username?: string
      name?: string
      account_type?: string
    }>(
      '/me',
      accessToken,
      { fields: 'id,username,name,account_type' },
      { host: 'instagram' },
    )
    return {
      provider: 'instagram',
      providerAccountId: me.id,
      username: me.username ?? null,
      displayName: me.name ?? me.username ?? null,
      accountType: me.account_type ?? null,
    }
  },

  async listMedia(accessToken, opts) {
    const limit = opts?.limit ?? 25
    const json = await metaGraphGet<{
      data?: Array<{
        id: string
        caption?: string
        media_type?: string
        media_url?: string
        permalink?: string
        timestamp?: string
        comments_count?: number
        thumbnail_url?: string
      }>
      paging?: { cursors?: { after?: string } }
    }>(
      '/me/media',
      accessToken,
      {
        fields: 'id,caption,media_type,media_url,permalink,timestamp,comments_count,thumbnail_url',
        limit,
        after: opts?.after,
      },
      { host: 'instagram' },
    )
    const items: SocialMediaItem[] = (json.data ?? []).map((m) => ({
      providerPostId: m.id,
      caption: m.caption ?? null,
      mediaType: m.media_type ?? null,
      mediaUrl: m.media_url ?? null,
      permalink: m.permalink ?? null,
      publishedAt: m.timestamp ?? null,
      commentsCount: m.comments_count ?? 0,
      thumbnailUrl: m.thumbnail_url ?? m.media_url ?? null,
    }))
    return { items, nextCursor: json.paging?.cursors?.after ?? null }
  },

  async listComments(accessToken, providerPostId) {
    const json = await metaGraphGet<{
      data?: Array<{
        id: string
        text?: string
        timestamp?: string
        username?: string
        from?: { id?: string; username?: string }
        parent_id?: string
      }>
    }>(
      `/${providerPostId}/comments`,
      accessToken,
      { fields: 'id,text,timestamp,username,from,parent_id', limit: 50 },
      { host: 'instagram' },
    )
    return (json.data ?? []).map(
      (c): SocialCommentItem => ({
        providerCommentId: c.id,
        text: c.text ?? '',
        authorUsername: c.username || c.from?.username || null,
        authorProviderUserId: c.from?.id || null,
        parentProviderCommentId: c.parent_id || null,
        providerTimestamp: c.timestamp || null,
      }),
    )
  },

  async replyToComment(accessToken, providerCommentId, text) {
    const json = await metaGraphPost<{ id?: string }>(
      `/${providerCommentId}/replies`,
      accessToken,
      { message: text },
      { host: 'instagram' },
    )
    if (!json.id) throw new Error('Instagram comment reply missing id')
    return { providerCommentId: json.id }
  },

  async sendMessage(accessToken, input: SendMessageInput): Promise<SendMessageResult> {
    // Instagram Messaging API (IG Login) — recipient is IGSID
    const json = await metaGraphPost<{ message_id?: string }>(
      '/me/messages',
      accessToken,
      {
        recipient: { id: input.recipientId },
        message: { text: input.text },
      },
      { host: 'instagram' },
    )
    if (!json.message_id) throw new Error('Instagram sendMessage missing message_id')
    return { providerMessageId: json.message_id, raw: json }
  },

  async listConversations(accessToken) {
    try {
      const json = await metaGraphGet<{
        data?: Array<{ id: string; updated_time?: string }>
      }>('/me/conversations', accessToken, { platform: 'instagram' }, { host: 'instagram' })
      return (json.data ?? []).map((c) => ({ id: c.id, updatedTime: c.updated_time }))
    } catch {
      // Tolerate incomplete conversation history APIs
      return []
    }
  },
}

/** Page-linked Instagram Business account via graph.facebook.com */
export async function getPageLinkedInstagramAccount(
  pageAccessToken: string,
  igUserId: string,
): Promise<SocialAccount> {
  const me = await metaGraphGet<{
    id: string
    username?: string
    name?: string
  }>(`/${igUserId}`, pageAccessToken, { fields: 'id,username,name' }, { host: 'facebook' })
  return {
    provider: 'instagram',
    providerAccountId: me.id,
    username: me.username ?? null,
    displayName: me.name ?? me.username ?? null,
    accountType: 'BUSINESS',
  }
}
