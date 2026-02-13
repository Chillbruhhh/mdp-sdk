// ============================================
// Authentication Module
// ============================================

import { HttpClient } from "./http.js";
import type {
  User,
  WalletSigner,
  PaymentSigner,
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
 * Compatible with wagmi's useWalletClient hook.
 * If the walletClient supports signTypedData / sendTransaction, those
 * capabilities are exposed on the returned PaymentSigner.
 */
export function createViemSigner(walletClient: {
  account: { address: string };
  signMessage: (args: { message: string }) => Promise<string>;
  signTypedData?: (args: any) => Promise<string>;
  sendTransaction?: (args: any) => Promise<string>;
}): PaymentSigner {
  return {
    async getAddress() {
      return walletClient.account.address;
    },
    async signMessage(message: string) {
      return walletClient.signMessage({ message });
    },
    async signTypedData(params) {
      if (!walletClient.signTypedData) {
        throw new Error("walletClient does not support signTypedData");
      }
      return walletClient.signTypedData(params);
    },
    ...(walletClient.sendTransaction
      ? {
          async sendTransaction(params: {
            to: string;
            data: string;
            value?: bigint;
            chainId?: number;
          }) {
            return walletClient.sendTransaction!(params);
          },
        }
      : {}),
  };
}

/**
 * Create a wallet signer from a private key (for automated agents).
 * Requires viem to be installed.
 * Supports EIP-3009 typed-data signing and on-chain transactions.
 *
 * @param privateKey  Hex-encoded private key
 * @param opts.rpcUrl RPC endpoint for sendTransaction (defaults to Base mainnet public RPC)
 */
export async function createPrivateKeySigner(
  privateKey: `0x${string}`,
  opts?: { rpcUrl?: string },
): Promise<PaymentSigner> {
  const { privateKeyToAccount } = await import("viem/accounts");
  const account = privateKeyToAccount(privateKey);

  // Lazily create a wallet client only when sendTransaction is first called
  let walletClientPromise: Promise<any> | null = null;
  const getWalletClient = () => {
    if (!walletClientPromise) {
      walletClientPromise = import("viem").then((v) => {
        const chain =
          opts?.rpcUrl?.includes("sepolia")
            ? (v as any).baseSepolia ?? { id: 84532 }
            : (v as any).base ?? { id: 8453 };
        return v.createWalletClient({
          account,
          chain,
          transport: v.http(opts?.rpcUrl),
        });
      });
    }
    return walletClientPromise;
  };

  return {
    async getAddress() {
      return account.address;
    },
    async signMessage(message: string) {
      return account.signMessage({ message });
    },
    async signTypedData(params) {
      return account.signTypedData(params as any);
    },
    async sendTransaction(params) {
      const client = await getWalletClient();
      return client.sendTransaction({
        to: params.to as `0x${string}`,
        data: params.data as `0x${string}`,
        value: params.value,
        chain: client.chain,
      });
    },
  };
}

/**
 * Create a wallet signer with manual signing (for external wallets).
 * Useful when the signing happens outside the SDK.
 *
 * Supply optional `signTypedDataFn` and `sendTransactionFn` to enable
 * autonomous payment flows (fundJob).
 */
export function createManualSigner(
  address: string,
  signFn: (message: string) => Promise<string>,
  opts?: {
    signTypedDataFn?: (params: {
      domain: Record<string, unknown>;
      types: Record<string, Array<{ name: string; type: string }>>;
      primaryType: string;
      message: Record<string, unknown>;
    }) => Promise<string>;
    sendTransactionFn?: (params: {
      to: string;
      data: string;
      value?: bigint;
      chainId?: number;
    }) => Promise<string>;
  },
): PaymentSigner {
  return {
    async getAddress() {
      return address;
    },
    signMessage: signFn,
    async signTypedData(params) {
      if (!opts?.signTypedDataFn) {
        throw new Error("signTypedData not provided to createManualSigner");
      }
      return opts.signTypedDataFn(params);
    },
    ...(opts?.sendTransactionFn
      ? { sendTransaction: opts.sendTransactionFn }
      : {}),
  };
}

export interface CdpEvmSignerConfig {
  address: `0x${string}`;
  apiKeyId: string;
  apiKeySecret: string;
  walletSecret: string;
}

/**
 * Create a wallet signer backed by Coinbase CDP Server Wallet v2.
 * Supports EIP-3009 typed-data signing and on-chain transactions.
 */
export function createCdpEvmSigner(config: CdpEvmSignerConfig): PaymentSigner {
  let clientPromise: Promise<any> | null = null;
  const getClient = async () => {
    if (!clientPromise) {
      clientPromise = import("@coinbase/cdp-sdk").then(
        (m: any) =>
          new m.CdpClient({
            apiKeyId: config.apiKeyId,
            apiKeySecret: config.apiKeySecret,
            walletSecret: config.walletSecret,
          })
      );
    }
    return clientPromise;
  };

  return {
    async getAddress() {
      return config.address;
    },
    async signMessage(message: string) {
      const cdp = await getClient();
      const { signature } = await cdp.evm.signMessage({
        address: config.address,
        message,
      });
      return signature;
    },
    async signTypedData(params) {
      const cdp = await getClient();
      const { signature } = await cdp.evm.signTypedData({
        address: config.address,
        typedData: params,
      });
      return signature;
    },
    async sendTransaction(params) {
      const cdp = await getClient();
      const { transactionHash } = await cdp.evm.sendTransaction({
        address: config.address,
        transaction: {
          to: params.to as `0x${string}`,
          data: params.data as `0x${string}`,
          value: params.value ? `0x${params.value.toString(16)}` : "0x0",
        },
      });
      return transactionHash;
    },
  };
}
