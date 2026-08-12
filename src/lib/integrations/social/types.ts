/** Provider-agnostic social integration types. */

export type SocialProviderId = 'instagram' | 'facebook' | 'messenger'

export type TokenKind = 'page' | 'instagram_user' | 'user'

export type SocialAccount = {
  provider: SocialProviderId
  providerAccountId: string
  username?: string | null
  displayName?: string | null
  accountType?: string | null
  metadata?: Record<string, unknown>
}

export type SocialMediaItem = {
  providerPostId: string
  caption?: string | null
  mediaType?: string | null
  mediaUrl?: string | null
  permalink?: string | null
  publishedAt?: string | null
  commentsCount?: number
  thumbnailUrl?: string | null
  metadata?: Record<string, unknown>
}

export type SocialCommentItem = {
  providerCommentId: string
  text: string
  authorUsername?: string | null
  authorProviderUserId?: string | null
  parentProviderCommentId?: string | null
  providerTimestamp?: string | null
  metadata?: Record<string, unknown>
}

export type SendMessageInput = {
  recipientId: string
  text: string
}

export type SendMessageResult = {
  providerMessageId: string
  raw?: unknown
}

export interface SocialProvider {
  readonly id: SocialProviderId
  getAccount(accessToken: string): Promise<SocialAccount>
  listMedia?(accessToken: string, opts?: { limit?: number; after?: string }): Promise<{
    items: SocialMediaItem[]
    nextCursor?: string | null
  }>
  listComments?(
    accessToken: string,
    providerPostId: string,
    opts?: { limit?: number },
  ): Promise<SocialCommentItem[]>
  replyToComment?(
    accessToken: string,
    providerCommentId: string,
    text: string,
  ): Promise<{ providerCommentId: string }>
  sendMessage?(accessToken: string, input: SendMessageInput): Promise<SendMessageResult>
  /** Optional historical sync — must tolerate empty results. */
  listConversations?(accessToken: string): Promise<Array<{ id: string; updatedTime?: string }>>
}
