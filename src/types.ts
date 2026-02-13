// ============================================
// MDP Agent SDK - Type Definitions
// ============================================

// ============================================
// Enums
// ============================================

export type PricingModel = "hourly" | "fixed" | "negotiable";

export type JobStatus = "open" | "funded" | "in_progress" | "completed" | "cancelled";

export type ProposalStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export type PaymentStatus = "pending" | "settling" | "settled" | "failed";

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

export interface Eip8004Service {
  name: string;
  endpoint: string;
  version?: string;
  skills?: string[];
  domains?: string[];
}

export interface Eip8004Registration {
  agentId: number;
  agentRegistry: string;
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
  ownerId?: string;
  ownerWallet?: string;
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
  eip8004Services?: Eip8004Service[];
  eip8004Registrations?: Eip8004Registration[];
  eip8004SupportedTrust?: string[];
  eip8004X402Support?: boolean;
  eip8004AgentWallet?: string;
  eip8004Active?: boolean;
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
  // Joined fields from proposal list endpoints
  agentName?: string;
  agentWallet?: string;
  agentVerified?: boolean;
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
  eip8004Services?: Eip8004Service[];
  eip8004Registrations?: Eip8004Registration[];
  eip8004X402Support?: boolean;
  eip8004AgentWallet?: string;
}

export interface SelfRegisterAgentRequest extends CreateAgentRequest {
  ownerWallet: string;
  eip8004SupportedTrust?: string[];
}

export interface UpdateAgentRequest {
  description?: string;
  pricingModel?: PricingModel;
  hourlyRate?: number;
  tags?: string[];
  constraints?: string;
  skillMdContent?: string;
  skillMdUrl?: string;
  avatarUrl?: string;
  socialLinks?: SocialLink[];
  eip8004Services?: Eip8004Service[];
  eip8004Registrations?: Eip8004Registration[];
  eip8004SupportedTrust?: string[];
  eip8004X402Support?: boolean;
  eip8004Active?: boolean;
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
    mimeType?: string;
    payTo: string;
    maxTimeoutSeconds: number;
    asset: string;
    extra?: PaymentRequirementExtra;
  };
  encodedRequirement: string;
  /** All payment IDs (escrow + fee) when multiple requirements exist */
  paymentIds?: string[];
  /** All requirements when multiple payments are needed */
  requirements?: PaymentIntentResponse["requirement"][];
}

export interface PaymentSettleResponse {
  success: boolean;
  status: "settling" | "settled";
  paymentId: string;
  txHash?: string;
}

export interface PaymentConfirmResponse {
  success: boolean;
  status: "settled" | "pending";
  txHash: string;
  paymentId?: string;
}

export interface PaymentSummaryResponse {
  settled: {
    totalSpentUSDC: number;
    totalEarnedUSDC: number;
  };
  pending: {
    totalSpentUSDC: number;
    totalEarnedUSDC: number;
  };
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
// EIP-8004 Types
// ============================================

export interface Eip8004RegistrationResponse {
  type: string;
  name: string;
  description: string;
  image?: string;
  services: Eip8004Service[];
  x402Support: boolean;
  active: boolean;
  registrations: Eip8004Registration[];
  supportedTrust?: string[];
}

export interface Eip8004Feedback {
  jobId: string;
  score?: number;
  value?: number;
  valueDecimals?: number;
  tag1?: string;
  tag2?: string;
  endpoint?: string;
  comment?: string;
  createdAt: string;
}

export interface Eip8004FeedbackResponse {
  feedback: Eip8004Feedback[];
  summary: {
    count: number;
    summaryValue: number;
    summaryValueDecimals: number;
  };
}

export interface SubmitFeedbackRequest {
  jobId: string;
  score?: number;
  value?: number;
  valueDecimals?: number;
  tag1?: string;
  tag2?: string;
  endpoint?: string;
  comment?: string;
}

// ============================================
// Escrow Types
// ============================================

export interface EscrowState {
  usingContract: boolean;
  escrowContract?: string;
  rpcUrl?: string;
  rpcFallbackUrls?: string[];
  chainId: number;
  jobId: string;
  jobKey?: string;
  escrow?: Record<string, unknown>;
  computed?: {
    acceptDeadlineSeconds: number;
    autoReleaseDelaySeconds: number;
    acceptDeadlineAt: string;
    autoReleaseAt: string;
    canAutoRelease: boolean;
    canRefundExpired: boolean;
  };
}

// ============================================
// Dispute Types
// ============================================

export interface OpenDisputeRequest {
  reason: string;
  txHash?: string;
}

// ============================================
// Bazaar Types
// ============================================

export interface BazaarSearchParams {
  q?: string;
  limit?: number;
}

export interface BazaarSearchResponse {
  jobs: Job[];
  count: number;
}

// ============================================
// Pending Proposals Types
// ============================================

export interface PendingProposal extends Proposal {
  jobTitle?: string;
  jobStatus?: string;
}

export interface ListPendingProposalsParams {
  status?: string;
  limit?: number;
  offset?: number;
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

/**
 * Extended signer with EIP-3009 typed-data signing for autonomous payments.
 * Backward-compatible with WalletSigner.
 */
export interface PaymentSigner extends WalletSigner {
  /** Sign EIP-712 typed data (required for EIP-3009 TransferWithAuthorization) */
  signTypedData(params: {
    domain: Record<string, unknown>;
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  }): Promise<string>;

  /** Send a raw transaction (required for contract escrow mode) */
  sendTransaction?(params: {
    to: string;
    data: string;
    value?: bigint;
    chainId?: number;
  }): Promise<string>;
}

// ============================================
// Payment Flow Types
// ============================================

/** Extra metadata returned on a payment requirement when contract escrow is enabled */
export interface PaymentRequirementExtra {
  contractMode: boolean;
  jobKey: string;
  agentWallet?: string;
  agentExecutorWallet?: string;
  agentPayoutWallet?: string;
}

/** Options for the fundJob() high-level flow */
export interface FundJobOptions {
  /** Milliseconds between confirm polls (default: 5000) */
  pollIntervalMs?: number;
  /** Maximum milliseconds to wait for on-chain confirmation (default: 180000) */
  timeoutMs?: number;
}

/** Result of a fundJob() call */
export interface FundJobResult {
  success: boolean;
  txHash?: string;
  paymentId: string;
  mode: "facilitator" | "contract";
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
