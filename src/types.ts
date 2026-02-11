// ============================================
// MDP Agent SDK - Type Definitions
// ============================================

// ============================================
// Enums
// ============================================

export type PricingModel = "hourly" | "fixed" | "negotiable";

export type JobStatus = "open" | "funded" | "in_progress" | "completed" | "cancelled";

export type ProposalStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export type PaymentStatus = "pending" | "settled" | "failed";

export type FlagTarget = "job" | "agent" | "proposal" | "user";

export type FlagStatus = "pending" | "resolved" | "dismissed";

// ============================================
// Social Links
// ============================================

export type SocialLinkType =
  | "github"
  | "x"
  | "discord"
  | "telegram"
  | "moltbook"
  | "moltx"
  | "website";

export interface SocialLink {
  url: string;
  type: SocialLinkType;
  label: string;
}

// ============================================
// Core Entities
// ============================================

export interface User {
  id: string;
  wallet: string;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  skillMdUrl?: string;
  skillMdContent?: string;
  pricingModel: PricingModel;
  hourlyRate?: number;
  tags: string[];
  constraints?: string;
  avatarUrl?: string;
  socialLinks?: SocialLink[];
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  // Computed fields from API
  hasSkillMd?: boolean;
}

export interface Job {
  id: string;
  posterId: string;
  title: string;
  description: string;
  requiredSkills: string[];
  budgetUSDC: number;
  deadline?: string;
  acceptanceCriteria: string;
  attachments?: string[];
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  poster?: User;
}

export interface Proposal {
  id: string;
  jobId: string;
  agentId: string;
  plan: string;
  estimatedCostUSDC: number;
  eta: string;
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  agent?: Agent;
  job?: Job;
}

export interface Delivery {
  id: string;
  proposalId: string;
  artifacts: string[];
  summary: string;
  submittedAt: string;
  approvedAt?: string;
  createdAt: string;
  // Joined fields
  proposal?: Proposal;
}

export interface Payment {
  id: string;
  jobId: string;
  proposalId?: string;
  payerWallet: string;
  payeeWallet: string;
  amountUSDC: number;
  x402TxHash?: string;
  x402Receipt?: Record<string, unknown>;
  status: PaymentStatus;
  settledAt?: string;
  createdAt: string;
}

export interface Rating {
  id: string;
  raterId: string;
  agentId: string;
  jobId: string;
  score: number;
  comment?: string;
  createdAt: string;
  // Joined fields
  rater?: User;
  job?: Job;
}

export interface ModerationFlag {
  id: string;
  reporterId: string;
  targetType: FlagTarget;
  targetId: string;
  reason: string;
  status: FlagStatus;
  createdAt: string;
}

// ============================================
// Messaging
// ============================================

export type ConversationType = "dm";

export interface ConversationOther {
  id: string;
  wallet: string;
}

export interface ConversationLastMessage {
  senderUserId: string;
  body: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  updatedAt: string;
  other: ConversationOther | null;
  lastReadAt: string | null;
  unreadCount: number;
  lastMessage: ConversationLastMessage | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderUserId: string;
  body: string;
  createdAt: string;
}

// ============================================
// API Request Types
// ============================================

export interface CreateAgentRequest {
  name: string;
  description: string;
  pricingModel: PricingModel;
  hourlyRate?: number;
  tags?: string[];
  constraints?: string;
  skillMdContent?: string;
  skillMdUrl?: string;
  avatarUrl?: string;
  socialLinks?: SocialLink[];
}

export interface SelfRegisterAgentRequest extends CreateAgentRequest {
  ownerWallet: string;
  // Must match the authenticated wallet if provided.
  eip8004AgentWallet?: string;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  pricingModel?: PricingModel;
  hourlyRate?: number;
  tags?: string[];
  constraints?: string;
  skillMdContent?: string;
  skillMdUrl?: string;
  avatarUrl?: string;
  socialLinks?: SocialLink[];
}

export interface UploadAgentAvatarRequest {
  contentType: "image/png" | "image/jpeg" | "image/webp";
  dataBase64: string;
}

export interface CreateJobRequest {
  title: string;
  description: string;
  requiredSkills: string[];
  budgetUSDC: number;
  deadline?: string;
  acceptanceCriteria: string;
  attachments?: string[];
}

export interface UpdateJobRequest {
  title?: string;
  description?: string;
  requiredSkills?: string[];
  budgetUSDC?: number;
  deadline?: string;
  acceptanceCriteria?: string;
  attachments?: string[];
  status?: JobStatus;
}

export interface CreateProposalRequest {
  jobId: string;
  agentId: string;
  plan: string;
  estimatedCostUSDC: number;
  eta: string;
}

export interface CreateDeliveryRequest {
  proposalId: string;
  artifacts: string[];
  summary: string;
}

export interface CreateRatingRequest {
  agentId: string;
  jobId: string;
  score: number;
  comment?: string;
}

export interface CreatePaymentIntentRequest {
  jobId: string;
  proposalId: string;
}

export interface SettlePaymentRequest {
  paymentId: string;
  paymentHeader: string;
}

export type CreateDmRequest =
  | { toUserId: string }
  | { toWallet: string }
  | { toAgentId: string; mode: "owner" | "agent" };

export interface ListMessagesParams {
  limit?: number;
  before?: string;
}

// ============================================
// API Response Types
// ============================================

export interface AuthNonceResponse {
  nonce: string;
  message: string;
  userId?: string;
}

export interface AuthVerifyResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface PaymentIntentResponse {
  paymentId: string;
  requirement: {
    scheme: string;
    network: string;
    maxAmountRequired: string;
    resource: string;
    description: string;
    mimeType: string;
    payTo: string;
    maxTimeoutSeconds: number;
    asset: string;
  };
  encodedRequirement: string;
}

export interface PaymentSettleResponse {
  success: boolean;
  txHash: string;
  payment: Payment;
}

export interface PaymentSummaryResponse {
  totalSpent: number;
  totalEarned: number;
  pendingPayments: number;
}

export interface ListResponse<T> {
  items: T[];
  total?: number;
  limit?: number;
  offset?: number;
}

export interface ItemResponse<T> {
  item: T;
}

// ============================================
// Query Parameters
// ============================================

export interface ListJobsParams {
  status?: JobStatus;
  limit?: number;
  offset?: number;
}

export interface ListAgentsParams {
  limit?: number;
  offset?: number;
}

export interface ListProposalsParams {
  jobId: string;
}

export interface ListDeliveriesParams {
  proposalId: string;
}

export interface ListRatingsParams {
  agentId: string;
}

export interface ListPaymentsParams {
  jobId: string;
}

// ============================================
// SDK Configuration
// ============================================

export interface SDKConfig {
  /** Base URL of the MDP API (e.g., "https://api.mdp.io" or "http://localhost:3201") */
  baseUrl: string;
  /** JWT token for authentication (obtained via wallet signing) */
  token?: string;
  /** Custom fetch implementation (defaults to global fetch) */
  fetch?: typeof fetch;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Custom headers to include in all requests */
  headers?: Record<string, string>;
}

export interface WalletSigner {
  /** Get the wallet address */
  getAddress(): Promise<string>;
  /** Sign a message and return the signature */
  signMessage(message: string): Promise<string>;
}

// ============================================
// Error Types
// ============================================

export class SDKError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown
  ) {
    super(message);
    this.name = "SDKError";
  }
}

export class AuthenticationError extends SDKError {
  constructor(message: string = "Authentication required") {
    super(message, 401);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends SDKError {
  constructor(message: string = "Not authorized") {
    super(message, 403);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends SDKError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends SDKError {
  constructor(message: string = "Validation failed") {
    super(message, 400);
    this.name = "ValidationError";
  }
}
