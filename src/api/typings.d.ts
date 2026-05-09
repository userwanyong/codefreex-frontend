declare namespace API {
  // === Base response ===
  type BaseResponseString = {
    code?: number
    data?: string
    message?: string
  }

  /** Generic response — backend returns data as the actual type, not always a string */
  type BaseResponse<T> = {
    code?: number
    data?: T
    message?: string
  }

  type PageResponse<T> = {
    records?: T[]
    total?: number
    pageNum?: number
    pageSize?: number
    totalPages?: number
  }

  // === Auth ===
  type TokenResponse = {
    accessToken?: string
    refreshToken?: string
    tokenType?: string
    expiresIn?: number
  }

  type LoginUserContext = {
    userId?: string
    username?: string
    email?: string
    phone?: string
    nickname?: string
    avatar?: string
    tenantId?: string
    roles?: string[]
    permissions?: string[]
  }

  type WechatQrCodeResponse = {
    qrcodeId?: string
    qrCodeUrl?: string
    status?: string
    ticket?: string
    displayName?: string
    photo?: string
  }

  type WechatLoginResponse = {
    newUser?: boolean
    tempToken?: string
    token?: TokenResponse
    nickname?: string
    avatar?: string
  }

  // === App ===
  type AppVO = {
    id?: string
    appName?: string
    description?: string
    cover?: string
    codeGenType?: string
    status?: string
    isPublic?: number
    isFeatured?: number
    priority?: number
    viewCount?: number
    likeCount?: number
    tags?: string[]
    userId?: string
    editTime?: string
    createTime?: string
  }

  type App = {
    id?: string
    appName?: string
    description?: string
    cover?: string
    initPrompt?: string
    codeGenType?: string
    status?: string
    deployKey?: string
    deployedTime?: string
    isPublic?: number
    isFeatured?: number
    priority?: number
    viewCount?: number
    likeCount?: number
    tags?: string[]
    userId?: string
    editTime?: string
    createTime?: string
    updateTime?: string
  }

  type AppCreateRequest = {
    appName?: string
    description?: string
    initPrompt: string
    tags?: string[]
  }

  type AppEditRequest = {
    id: string
    appName?: string
    description?: string
    cover?: string
    initPrompt?: string
    tags?: string[]
  }

  type FeaturedAppResponse = {
    records?: AppVO[]
    nextCursor?: string
    hasNext?: boolean
  }

  // === Invite ===
  type Invite = {
    id?: string
    inviteCode?: string
    userId?: string
    batch?: string
    status?: string
    expireTime?: string
    maxUseCount?: number
    usedCount?: number
    createTime?: string
    updateTime?: string
  }

  type InviteUser = {
    id?: number
    inviteId?: string
    inviterId?: string
    inviteeId?: string
    createTime?: string
    updateTime?: string
  }

  // === Redeem ===
  type Redeem = {
    id?: string
    redeemCode?: string
    userId?: string
    batch?: string
    quota?: number
    status?: string
    expireTime?: string
    maxUseCount?: number
    usedCount?: number
    createTime?: string
    updateTime?: string
  }

  type RedeemUser = {
    id?: number
    redeemId?: string
    creatorId?: string
    userId?: string
    createTime?: string
    updateTime?: string
  }

  // === User ===
  type UserInfo = {
    id?: string
    userId?: string
    inviterId?: string
    totalCredits?: number
    remainingCredits?: number
    createTime?: string
    updateTime?: string
  }

  // === Enums ===
  type AppStatus = 'draft' | 'generating' | 'generated' | 'deployed' | 'disabled'
  type CodeGenType = 'html' | 'multi_file' | 'vue_project'
  type InviteStatus = 'unused' | 'partial' | 'used' | 'expired' | 'disabled'
}
