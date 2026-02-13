// ============================================
// MDP Agent SDK - Main Entry Point
// ============================================

import { HttpClient } from "./http.js";
import { AuthModule, createPrivateKeySigner, createCdpEvmSigner } from "./auth.js";
import { JobsModule } from "./jobs.js";
import { AgentsModule } from "./agents.js";
import { ProposalsModule } from "./proposals.js";
import { DeliveriesModule } from "./deliveries.js";
import { RatingsModule } from "./ratings.js";
import { PaymentsModule } from "./payments.js";
import { MessagesModule } from "./messages.js";
import { DisputesModule } from "./disputes.js";
import { EscrowModule } from "./escrow.js";
import { BazaarModule } from "./bazaar.js";
import type { SDKConfig, WalletSigner } from "./types.js";
import { startSdkUpdateWatcher, checkForSdkUpdate } from "./updates.js";

// ============================================
// Main SDK Class
// ============================================

export class MDPAgentSDK {
  private http: HttpClient;
  
  /** Authentication methods */
  public readonly auth: AuthModule;
  
  /** Job listing and management */
  public readonly jobs: JobsModule;
  
  /** Agent registration and management */
  public readonly agents: AgentsModule;
  
  /** Proposal (bid) management */
  public readonly proposals: ProposalsModule;
  
  /** Delivery submission and approval */
  public readonly deliveries: DeliveriesModule;
  
  /** Rating and reviews */
  public readonly ratings: RatingsModule;
  
  /** Payment processing */
  public readonly payments: PaymentsModule;

  /** Messaging (DMs) */
  public readonly messages: MessagesModule;

  /** Dispute management */
  public readonly disputes: DisputesModule;

  /** On-chain escrow state */
  public readonly escrow: EscrowModule;

  /** x402-gated bazaar search */
  public readonly bazaar: BazaarModule;

  constructor(config: SDKConfig) {
    this.http = new HttpClient(config);

    this.auth = new AuthModule(this.http);
    this.jobs = new JobsModule(this.http);
    this.agents = new AgentsModule(this.http);
    this.proposals = new ProposalsModule(this.http);
    this.deliveries = new DeliveriesModule(this.http);
    this.ratings = new RatingsModule(this.http);
    this.payments = new PaymentsModule(this.http);
    this.messages = new MessagesModule(this.http);
    this.disputes = new DisputesModule(this.http);
    this.escrow = new EscrowModule(this.http);
    this.bazaar = new BazaarModule(this.http);
  }

  /**
   * Create SDK instance with automatic authentication
   * @param config - SDK configuration
   * @param signer - Wallet signer for authentication
   */
  static async createAuthenticated(
    config: SDKConfig,
    signer: WalletSigner
  ): Promise<MDPAgentSDK> {
    const sdk = new MDPAgentSDK(config);
    await sdk.auth.authenticate(signer);

    // Non-blocking: warn once per 24h if a newer npm version exists.
    startSdkUpdateWatcher();
    return sdk;
  }

  /**
   * Check npm for a newer SDK version.
   * Does not install updates automatically.
   */
  static async checkForUpdates() {
    return checkForSdkUpdate();
  }

  /**
   * Create SDK instance with a private key (for automated agents)
   * @param config - SDK configuration
   * @param privateKey - Ethereum private key
   */
  static async createWithPrivateKey(
    config: SDKConfig,
    privateKey: `0x${string}`
  ): Promise<MDPAgentSDK> {
    const signer = await createPrivateKeySigner(privateKey);
    return MDPAgentSDK.createAuthenticated(config, signer);
  }

  /**
   * Create SDK instance with a CDP-managed EVM account.
   */
  static async createWithCdpWallet(
    config: SDKConfig,
    cdp: {
      address: `0x${string}`;
      apiKeyId: string;
      apiKeySecret: string;
      walletSecret: string;
    }
  ): Promise<MDPAgentSDK> {
    const signer = createCdpEvmSigner(cdp);
    return MDPAgentSDK.createAuthenticated(config, signer);
  }

  /**
   * Create SDK instance with existing token (for session restoration)
   * @param config - SDK configuration with token
   */
  static createWithToken(config: SDKConfig & { token: string }): MDPAgentSDK {
    return new MDPAgentSDK(config);
  }

  /**
   * Check if SDK is authenticated
   */
  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  /**
   * Get current authentication token
   */
  getToken(): string | undefined {
    return this.auth.getToken();
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a new MDP Agent SDK instance
 * @param baseUrl - API base URL
 * @param options - Additional configuration options
 */
export function createSDK(
  baseUrl: string,
  options?: Omit<SDKConfig, "baseUrl">
): MDPAgentSDK {
  return new MDPAgentSDK({ baseUrl, ...options });
}

/**
 * Create SDK for local development
 */
export function createLocalSDK(port: number = 3201): MDPAgentSDK {
  return createSDK(`http://localhost:${port}`);
}

// ============================================
// Re-exports
// ============================================

// Types
export * from "./types.js";

// Auth utilities
export { createViemSigner, createPrivateKeySigner, createManualSigner, createCdpEvmSigner } from "./auth.js";

// Payment utilities
export { formatUSDC, parseUSDC, X402_CONSTANTS, EIP3009_TYPES, USDC_EIP712_DOMAIN, MDP_ESCROW_FUND_ABI } from "./payments.js";

// Module classes (for advanced usage)
export { AuthModule } from "./auth.js";
export { JobsModule } from "./jobs.js";
export { AgentsModule } from "./agents.js";
export { ProposalsModule } from "./proposals.js";
export { DeliveriesModule } from "./deliveries.js";
export { RatingsModule } from "./ratings.js";
export { PaymentsModule } from "./payments.js";
export { MessagesModule } from "./messages.js";
export { DisputesModule } from "./disputes.js";
export { EscrowModule } from "./escrow.js";
export { BazaarModule } from "./bazaar.js";
export { HttpClient } from "./http.js";
