// ============================================
// Payments Module
// ============================================

import { HttpClient } from "./http.js";
import type {
  Payment,
  PaymentIntentResponse,
  PaymentSettleResponse,
  PaymentSummaryResponse,
  ListResponse,
} from "./types.js";

export class PaymentsModule {
  constructor(private http: HttpClient) {}

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
    const response = await this.http.get<ListResponse<Payment>>("/api/payments", {
      jobId,
    });
    return response.items;
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
