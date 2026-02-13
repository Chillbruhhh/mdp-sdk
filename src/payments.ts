// ============================================
// Payments Module
// ============================================

import { HttpClient } from "./http.js";
import type {
  Payment,
  PaymentIntentResponse,
  PaymentSettleResponse,
  PaymentConfirmResponse,
  PaymentSummaryResponse,
  PaymentSigner,
  FundJobOptions,
  FundJobResult,
} from "./types.js";

export class PaymentsModule {
  constructor(private http: HttpClient) {}

  private coerceList(response: any): Payment[] {
    if (response?.items && Array.isArray(response.items)) return response.items;
    if (response?.payments && Array.isArray(response.payments)) return response.payments;
    return [];
  }

  /**
   * Get payment summary for the authenticated user
   * Shows total spent, earned, and pending payments
   */
  async getSummary(): Promise<PaymentSummaryResponse> {
    return this.http.get<PaymentSummaryResponse>("/api/payments/summary");
  }

  /**
   * List payments for a specific job
   * @param jobId - Job UUID
   */
  async list(jobId: string): Promise<Payment[]> {
    const response = await this.http.get<any>("/api/payments", {
      jobId,
    });
    return this.coerceList(response);
  }

  /**
   * Create a payment intent for a job/proposal
   * This starts the x402 payment flow
   * @param jobId - Job UUID
   * @param proposalId - Proposal UUID
   */
  async createIntent(jobId: string, proposalId: string): Promise<PaymentIntentResponse> {
    return this.http.post<PaymentIntentResponse>("/api/payments/intent", {
      jobId,
      proposalId,
    });
  }

  /**
   * Settle a payment with signed x402 header
   * @param paymentId - Payment UUID from createIntent
   * @param paymentHeader - Signed x402 payment header
   */
  async settle(paymentId: string, paymentHeader: string): Promise<PaymentSettleResponse> {
    return this.http.post<PaymentSettleResponse>("/api/payments/settle", {
      paymentId,
      paymentHeader,
    });
  }

  /**
   * Confirm on-chain escrow funding (contract mode)
   * @param paymentId - Payment UUID
   * @param txHash - On-chain transaction hash
   */
  async confirm(paymentId: string, txHash: string): Promise<PaymentConfirmResponse> {
    return this.http.post<PaymentConfirmResponse>("/api/payments/confirm", {
      paymentId,
      txHash,
    });
  }

  /**
   * Full payment flow helper
   * Creates intent and returns data needed for signing
   * @param jobId - Job UUID
   * @param proposalId - Proposal UUID
   */
  async initiatePayment(jobId: string, proposalId: string): Promise<{
    paymentId: string;
    requirement: PaymentIntentResponse["requirement"];
    encodedRequirement: string;
  }> {
    const intent = await this.createIntent(jobId, proposalId);
    return {
      paymentId: intent.paymentId,
      requirement: intent.requirement,
      encodedRequirement: intent.encodedRequirement,
    };
  }

  /**
   * Check payment status for a job
   * @param jobId - Job UUID
   */
  async getJobPaymentStatus(jobId: string): Promise<{
    hasPending: boolean;
    hasSettled: boolean;
    totalSettled: number;
  }> {
    const payments = await this.list(jobId);

    const settled = payments.filter(p => p.status === "settled");
    const pending = payments.filter(p => p.status === "pending");

    return {
      hasPending: pending.length > 0,
      hasSettled: settled.length > 0,
      totalSettled: settled.reduce((sum, p) => sum + p.amountUSDC, 0),
    };
  }

  /**
   * High-level: fund a job's escrow autonomously using EIP-3009 authorization.
   *
   * Handles both facilitator mode (sign + settle API) and contract mode
   * (sign + on-chain fundJobWithAuthorization + confirm API).
   *
   * @param jobId      - Job UUID
   * @param proposalId - Accepted proposal UUID
   * @param signer     - PaymentSigner with signTypedData (and sendTransaction for contract mode)
   * @param options    - Optional polling configuration
   */
  async fundJob(
    jobId: string,
    proposalId: string,
    signer: PaymentSigner,
    options?: FundJobOptions,
  ): Promise<FundJobResult> {
    if (typeof signer.signTypedData !== "function") {
      throw new Error(
        "fundJob requires a PaymentSigner with signTypedData. " +
        "Use createPrivateKeySigner, createCdpEvmSigner, or provide signTypedData to createManualSigner.",
      );
    }

    // 1. Create payment intent
    const intent = await this.createIntent(jobId, proposalId);
    const req = intent.requirement;
    const paymentId = intent.paymentId;
    const from = await signer.getAddress();

    // 2. Derive EIP-3009 authorization parameters
    const chainId = Number(String(req.network ?? "").split(":")[1] ?? 8453);
    const tokenAddr = req.asset
      ? (req.asset.split("/erc20:")[1] ?? X402_CONSTANTS.USDC_ADDRESS)
      : X402_CONSTANTS.USDC_ADDRESS;
    const value = BigInt(req.maxAmountRequired);
    const validAfter = 0n;
    const validBefore = BigInt(Math.floor(Date.now() / 1000) + 300);
    const nonce = randomBytes32Hex();
    const to = req.payTo as `0x${string}`;

    // 3. Sign TransferWithAuthorization typed data
    const eip712Domain = {
      name: USDC_EIP712_DOMAIN.name,
      version: USDC_EIP712_DOMAIN.version,
      chainId,
      verifyingContract: tokenAddr,
    };
    const eip3009Types: Record<string, Array<{ name: string; type: string }>> = {
      TransferWithAuthorization: [...EIP3009_TYPES.TransferWithAuthorization],
    };

    const signature = await signer.signTypedData({
      domain: eip712Domain,
      types: eip3009Types,
      primaryType: "TransferWithAuthorization",
      message: {
        from: from as `0x${string}`,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
      },
    });

    const isContractMode = Boolean(req.extra?.contractMode);

    // 4a. Contract mode – call fundJobWithAuthorization on-chain, then confirm
    if (isContractMode) {
      if (typeof signer.sendTransaction !== "function") {
        throw new Error(
          "Contract escrow mode requires signer.sendTransaction. " +
          "Pass an rpcUrl to createPrivateKeySigner or use createCdpEvmSigner.",
        );
      }

      const { encodeFunctionData, parseSignature } = await import("viem");
      const { keccak256, toBytes } = await import("viem");

      const escrowContract = to; // payTo is the escrow contract in contract mode
      const jobKey =
        (req.extra?.jobKey as `0x${string}` | undefined) ??
        (keccak256(toBytes(jobId)) as `0x${string}`);
      const agentExecutorWallet =
        (req.extra?.agentExecutorWallet as `0x${string}` | undefined) ??
        (req.extra?.agentWallet as `0x${string}` | undefined);
      const agentPayoutWallet =
        (req.extra?.agentPayoutWallet as `0x${string}` | undefined) ??
        agentExecutorWallet;

      if (!agentExecutorWallet || !agentPayoutWallet) {
        throw new Error("Missing agent executor/payout wallets in payment requirement extra");
      }

      // Parse signature → v, r, s
      const parsed = parseSignature(signature as `0x${string}`) as any;
      const r: `0x${string}` = parsed.r;
      const s: `0x${string}` = parsed.s;
      const v: number = Number(
        parsed.v ?? (parsed.yParity === 0 ? 27n : 28n),
      );

      // Encode calldata
      const calldata = encodeFunctionData({
        abi: MDP_ESCROW_FUND_ABI,
        functionName: "fundJobWithAuthorization",
        args: [
          jobKey,
          from as `0x${string}`,
          agentExecutorWallet,
          agentPayoutWallet,
          value,
          validAfter,
          validBefore,
          nonce,
          v,
          r,
          s,
        ],
      });

      const txHash = await signer.sendTransaction({
        to: escrowContract,
        data: calldata,
        chainId,
      });

      // Poll confirm endpoint until settled
      const pollInterval = options?.pollIntervalMs ?? 5000;
      const timeout = options?.timeoutMs ?? 180_000;
      const start = Date.now();

      while (Date.now() - start < timeout) {
        const res = await this.confirm(paymentId, txHash);
        if (res?.status === "settled") {
          return { success: true, txHash, paymentId, mode: "contract" };
        }
        await sleep(pollInterval);
      }

      // Timed out but transaction was submitted
      return { success: false, txHash, paymentId, mode: "contract" };
    }

    // 4b. Facilitator mode – encode x402 header, call settle
    const paymentPayload = {
      x402Version: 1,
      scheme: "exact",
      network: req.network,
      payload: {
        signature,
        authorization: {
          from,
          to,
          value: value.toString(),
          validAfter: validAfter.toString(),
          validBefore: validBefore.toString(),
          nonce,
        },
      },
    };

    const paymentHeader = btoa(JSON.stringify(paymentPayload));

    // Settle all requirements (escrow first, then fee if present)
    const allPaymentIds = intent.paymentIds ?? [paymentId];
    const allRequirements = intent.requirements ?? [req];

    for (let i = 0; i < allPaymentIds.length; i++) {
      const pid = allPaymentIds[i]!;
      const r = allRequirements[i];

      // For additional requirements (e.g. platform fee), sign a separate authorization
      let header = paymentHeader;
      if (i > 0 && r) {
        const feeValue = BigInt(r.maxAmountRequired);
        const feeNonce = randomBytes32Hex();
        const feeTo = r.payTo as `0x${string}`;
        const feeSig = await signer.signTypedData({
          domain: eip712Domain,
          types: eip3009Types,
          primaryType: "TransferWithAuthorization",
          message: {
            from: from as `0x${string}`,
            to: feeTo,
            value: feeValue,
            validAfter,
            validBefore: BigInt(Math.floor(Date.now() / 1000) + 300),
            nonce: feeNonce,
          },
        });
        header = btoa(
          JSON.stringify({
            x402Version: 1,
            scheme: "exact",
            network: req.network,
            payload: {
              signature: feeSig,
              authorization: {
                from,
                to: feeTo,
                value: feeValue.toString(),
                validAfter: validAfter.toString(),
                validBefore: validBefore.toString(),
                nonce: feeNonce,
              },
            },
          }),
        );
      }

      await this.settle(pid, header);
    }

    return { success: true, paymentId, mode: "facilitator" };
  }
}

// ============================================
// EIP-3009 Constants
// ============================================

/** EIP-712 type definition for ERC-3009 TransferWithAuthorization */
export const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

/** EIP-712 domain for USDC (name and version only — chainId & verifyingContract set at sign time) */
export const USDC_EIP712_DOMAIN = {
  name: "USD Coin",
  version: "2",
} as const;

/** ABI fragment for the MDP escrow contract's fundJobWithAuthorization function */
export const MDP_ESCROW_FUND_ABI = [
  {
    type: "function" as const,
    name: "fundJobWithAuthorization" as const,
    stateMutability: "nonpayable" as const,
    inputs: [
      { name: "jobId", type: "bytes32" },
      { name: "poster", type: "address" },
      { name: "agentExecutor", type: "address" },
      { name: "agentPayout", type: "address" },
      { name: "totalAmount", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

// ============================================
// Internal Helpers
// ============================================

/** Generate a random 32-byte hex string (0x-prefixed) */
function randomBytes32Hex(): `0x${string}` {
  const bytes = new Uint8Array(32);
  // Use Node crypto if available, otherwise fall back to Web Crypto
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    // Fallback for environments without Web Crypto
    for (let i = 0; i < 32; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// x402 Payment Helpers
// ============================================

/**
 * Helper to format USDC amount from base units
 * @param baseUnits - Amount in base units (6 decimals)
 */
export function formatUSDC(baseUnits: bigint | string | number): string {
  const amount = BigInt(baseUnits);
  const whole = amount / BigInt(1e6);
  const fraction = amount % BigInt(1e6);
  
  if (fraction === BigInt(0)) {
    return whole.toString();
  }
  
  const fractionStr = fraction.toString().padStart(6, "0").replace(/0+$/, "");
  return `${whole}.${fractionStr}`;
}

/**
 * Helper to parse USDC amount to base units
 * @param amount - Amount as number or string (e.g., "100.50")
 */
export function parseUSDC(amount: number | string): bigint {
  const str = String(amount);
  const [whole, fraction = ""] = str.split(".");
  const paddedFraction = fraction.padEnd(6, "0").slice(0, 6);
  return BigInt(whole + paddedFraction);
}

/**
 * Constants for x402 payments on Base Mainnet
 */
export const X402_CONSTANTS = {
  CHAIN_ID: 8453,
  USDC_ADDRESS: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const,
  NETWORK: "base-mainnet" as const,
} as const;
