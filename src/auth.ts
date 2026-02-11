// ============================================
// Authentication Module
// ============================================

import { HttpClient } from "./http.js";
import type {
  User,
  WalletSigner,
  AuthNonceResponse,
  AuthVerifyResponse,
} from "./types.js";

export class AuthModule {
  constructor(private http: HttpClient) {}

  /**
   * Get a nonce and sign-in message for wallet authentication
   * @param wallet - Ethereum wallet address
   */
  async getNonce(wallet: string): Promise<AuthNonceResponse> {
    return this.http.get<AuthNonceResponse>("/api/auth/nonce", { wallet });
  }

  /**
   * Verify wallet signature and receive JWT token
   * @param wallet - Ethereum wallet address
   * @param signature - Signed message from wallet
   */
  async verify(wallet: string, signature: string): Promise<AuthVerifyResponse> {
    const response = await this.http.post<AuthVerifyResponse>("/api/auth/verify", {
      wallet,
      signature,
    });
    
    // Store the token in the HTTP client for subsequent requests
    if (response.token) {
      this.http.setToken(response.token);
    }
    
    return response;
  }

  /**
   * Full authentication flow using a wallet signer
   * This handles the complete nonce -> sign -> verify flow
   * @param signer - Wallet signer implementation
   */
  async authenticate(signer: WalletSigner): Promise<AuthVerifyResponse> {
    const wallet = await signer.getAddress();
    const { message } = await this.getNonce(wallet);
    const signature = await signer.signMessage(message);
    return this.verify(wallet, signature);
  }

  /**
   * Get the currently authenticated user
   * @throws AuthenticationError if not authenticated
   */
  async me(): Promise<User> {
    const response = await this.http.get<{ user: User }>("/api/auth/me");
    return response.user;
  }

  /**
   * Logout and clear authentication
   */
  async logout(): Promise<void> {
    await this.http.post("/api/auth/logout");
    this.http.setToken(undefined);
  }

  /**
   * Check if the SDK is currently authenticated
   */
  isAuthenticated(): boolean {
    return !!this.http.getToken();
  }

  /**
   * Set authentication token directly (useful for restoring sessions)
   * @param token - JWT token
   */
  setToken(token: string): void {
    this.http.setToken(token);
  }

  /**
   * Get the current authentication token
   */
  getToken(): string | undefined {
    return this.http.getToken();
  }
}

// ============================================
// Wallet Signer Implementations
// ============================================

/**
 * Create a wallet signer from viem's WalletClient
 * Compatible with wagmi's useWalletClient hook
 */
export function createViemSigner(walletClient: {
  account: { address: string };
  signMessage: (args: { message: string }) => Promise<string>;
}): WalletSigner {
  return {
    async getAddress() {
      return walletClient.account.address;
    },
    async signMessage(message: string) {
      return walletClient.signMessage({ message });
    },
  };
}

/**
 * Create a wallet signer from a private key (for automated agents)
 * Requires viem to be installed
 */
export async function createPrivateKeySigner(privateKey: `0x${string}`): Promise<WalletSigner> {
  // Dynamic import to avoid requiring viem if not using this function
  const { privateKeyToAccount } = await import("viem/accounts");
  
  const account = privateKeyToAccount(privateKey);
  
  return {
    async getAddress() {
      return account.address;
    },
    async signMessage(message: string) {
      return account.signMessage({ message });
    },
  };
}

/**
 * Create a wallet signer with manual signing (for external wallets)
 * Useful when the signing happens outside the SDK
 */
export function createManualSigner(
  address: string,
  signFn: (message: string) => Promise<string>
): WalletSigner {
  return {
    async getAddress() {
      return address;
    },
    signMessage: signFn,
  };
}
