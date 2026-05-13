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
    userName?: string
    userAvatar?: string
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
    tagIds?: number[]
  }

  type AppEditRequest = {
    id: string
    appName?: string
    description?: string
    cover?: string
    initPrompt?: string
    tagIds?: number[]
    isPublic?: number
  }

  type FeaturedAppResponse = {
    records?: AppVO[]
    nextCursor?: string
    hasNext?: boolean
  }

  type AppDeployResponse = {
    appId?: number
    deployKey?: string
    status?: string
    previewUrl?: string
    deployedUrl?: string
    coverUrl?: string
    deployedTime?: string
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
    nickname?: string
    avatar?: string
    status?: string
    totalCredits?: number
    remainingCredits?: number
    createTime?: string
    updateTime?: string
  }

  type AdminUserVO = {
    userId?: string
    nickname?: string
    avatar?: string
    email?: string
    phone?: string
    roles?: string[]
    status?: string
    totalCredits?: number
    remainingCredits?: number
    createTime?: string
  }

  type UserQueryRequest = {
    pageNum?: number
    pageSize?: number
    searchKey?: string
    status?: string
  }

  // === Chat History ===
  type ChatHistoryItem = {
    id?: string
    appId?: string
    messageType?: string
    message?: string
    parentId?: string | null
    userId?: string
    createTime?: string
    updateTime?: string
    isDelete?: number
  }

  // === Enums ===
  type AppStatus = 'draft' | 'generating' | 'generated' | 'deployed' | 'disabled'
  type CodeGenType = 'html' | 'multi_file' | 'vue_project'
  type InviteStatus = 'unused' | 'partial' | 'used' | 'expired' | 'disabled'

  // === Tag ===
  type TagVO = {
    id?: number
    name?: string
    sortOrder?: number
    appCount?: number
  }

  // === Workflow ===
  type WorkflowNode =
    | 'promptGuardNode' | 'promptReviewNode' | 'prdGenNode'
    | 'imagePlanNode' | 'imageFetchNode' | 'promptEnhanceNode'
    | 'routeNode' | 'codeGenNode' | 'buildNode' | 'qualityCheckNode' | 'persistNode'

  type WorkflowEventType = 'tool_request' | 'tool_executed' | 'ai_response' | 'done' | 'error'

  type WorkflowEvent = {
    type: WorkflowEventType
    data?: unknown
  }

  type WorkflowStatus = 'idle' | 'running' | 'completed' | 'failed' | 'blocked'

  type WorkflowRoute = 'html' | 'multi_file' | 'vue'

  type WorkflowStatusResponse = {
    appId: number
    status: WorkflowStatus
    currentNode: WorkflowNode | null
    route: WorkflowRoute | null
    retryCount: number
    message: string | null
    updateTime: string
  }
}
