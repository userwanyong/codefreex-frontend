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
    roles?: string[]
    permissions?: string[]
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
    isLiked?: boolean
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

  // === User（个人中心：身份来自 auth-service，码点来自本地业务表） ===
  type UserInfo = {
    userId?: string
    username?: string
    nickname?: string
    avatar?: string
    email?: string
    emailVerified?: boolean
    phone?: string
    phoneVerified?: boolean
    roles?: string[]
    inviterId?: string
    totalCredits?: number
    remainingCredits?: number
    createTime?: string
    updateTime?: string
  }

  type AdminUserVO = {
    userId?: string
    username?: string
    nickname?: string
    avatar?: string
    email?: string
    phone?: string
    roles?: string[]
    /** 1-正常，0-禁用（auth-service） */
    status?: number
    totalCredits?: number
    remainingCredits?: number
    createTime?: string
    /** 已绑定的第三方平台（gitee / github） */
    oauthProviders?: string[]
  }

  type UserQueryRequest = {
    pageNum?: number
    pageSize?: number
    searchKey?: string
    status?: number
  }

  type UserAdminCreateRequest = {
    username: string
    password: string
    nickname?: string
    email?: string
    roleIds?: string[]
  }

  type UserAdminUpdateRequest = {
    userId: string
    username?: string
    password?: string
    email?: string
    phone?: string
    nickname?: string
    avatar?: string
    status?: number
  }

  // === 角色 / 权限（auth-service RPC） ===
  type RoleVO = {
    id?: string
    code?: string
    name?: string
    description?: string
    status?: number
    permissions?: string[]
    builtIn?: boolean
  }

  type RoleSaveRequest = {
    id?: string
    code?: string
    name: string
    description?: string
  }

  type PermissionVO = {
    id?: string
    code?: string
    name?: string
    resource?: string
    action?: string
    description?: string
  }

  type PermissionSaveRequest = {
    code: string
    name: string
    resource?: string
    action?: string
    description?: string
  }

  // === 登录方式配置（租户级） ===
  type LoginMethodConfigVO = {
    method?: string
    category?: string
    displayName?: string
    enabled?: number
    usePlatformConfig?: number
    hasConfig?: boolean
    platformEnabled?: boolean
  }

  type LoginMethodSaveRequest = {
    method: string
    enabled: number
    usePlatformConfig?: number
    configJson?: string
  }

  // === 账号绑定（auth-service RPC） ===
  type OAuthBinding = {
    provider?: string
    providerUid?: string
    createTime?: string
  }

  type AccountBindings = {
    email?: string
    emailVerified?: boolean
    phone?: string
    phoneVerified?: boolean
    emailBindable?: boolean
    phoneBindable?: boolean
    emailBindMethod?: string
    oauthBindings?: OAuthBinding[]
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

  // === Credit Transaction ===
  type CreditTransaction = {
    id?: string
    userId?: string
    type?: string
    amount?: number
    balanceAfter?: number
    sourceType?: string
    sourceId?: string
    description?: string
    operatorId?: string
    createTime?: string
  }

  type CreditAdjustRequest = {
    userId: string
    amount: number
    description?: string
  }

  // === User Usage ===
  type UserUsage = {
    id?: string
    userId?: string
    appId?: string
    modelId?: string
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    latency?: number
    status?: string
    errorInfo?: string
    createTime?: string
  }

  // === Enums ===
  type AppStatus = 'draft' | 'generating' | 'generated' | 'deployed' | 'disabled'
  type CodeGenType = 'html' | 'multi_file' | 'vue_project'
  type InviteStatus = 'unused' | 'partial' | 'used' | 'expired' | 'disabled'

  // === Featured Application ===
  type FeaturedApplication = {
    id?: string
    appId?: string
    userId?: string
    status?: string  // pending / approved / rejected
    reason?: string
    adminRemark?: string
    reviewerId?: string
    reviewTime?: string
    createTime?: string
    updateTime?: string
  }

  // === Notification ===
  type Notification = {
    id?: string
    userId?: string
    title?: string
    content?: string
    type?: string
    isRead?: number
    relatedId?: string
    createTime?: string
    updateTime?: string
  }

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

  type WorkflowEventType = 'tool_request' | 'tool_executed' | 'ai_r' | 'done' | 'error'

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
    cachedEventCount: number
  }
}
