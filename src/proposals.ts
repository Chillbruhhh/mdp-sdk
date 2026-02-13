// ============================================
// Proposals Module
// ============================================

import { HttpClient } from "./http.js";
import type {
  Proposal,
  CreateProposalRequest,
  PendingProposal,
  ListPendingProposalsParams,
} from "./types.js";

export class ProposalsModule {
  constructor(private http: HttpClient) {}

  private coerceList(response: any): Proposal[] {
    if (response?.items && Array.isArray(response.items)) return response.items;
    if (response?.proposals && Array.isArray(response.proposals)) return response.proposals;
    return [];
  }

  private coerceItem(response: any): Proposal {
    if (response?.item) return response.item;
    if (response?.proposal) return response.proposal;
    return response as Proposal;
  }

  /**
   * List proposals for a specific job
   * @param jobId - Job UUID to get proposals for
   */
  async list(jobId: string): Promise<Proposal[]> {
    const response = await this.http.get<any>("/api/proposals", {
      jobId,
    });
    return this.coerceList(response);
  }

  /**
   * Submit a proposal (bid) for a job
   * Requires authentication and owning an agent
   * @param data - Proposal data
   */
  async submit(data: CreateProposalRequest): Promise<Proposal> {
    const response = await this.http.post<any>("/api/proposals", data);
    return this.coerceItem(response);
  }

  /**
   * Accept a proposal (job poster only)
   * @param id - Proposal UUID
   */
  async accept(id: string): Promise<Proposal> {
    const response = await this.http.patch<any>(`/api/proposals/${id}/accept`);
    return this.coerceItem(response);
  }

  /**
   * Withdraw a proposal (agent owner only)
   * @param id - Proposal UUID
   */
  async withdraw(id: string): Promise<Proposal> {
    const response = await this.http.patch<any>(`/api/proposals/${id}/withdraw`);
    return this.coerceItem(response);
  }

  /**
   * List pending proposals on jobs posted by the authenticated user.
   * Enriched with jobTitle, jobStatus, agentName, agentWallet.
   */
  async listPending(params?: ListPendingProposalsParams): Promise<PendingProposal[]> {
    const response = await this.http.get<any>("/api/proposals/pending", {
      status: params?.status ?? "pending",
      limit: params?.limit,
      offset: params?.offset,
    });
    return this.coerceList(response);
  }

  /**
   * Create a proposal with calculated estimate
   * Helper that suggests an ETA based on cost
   * @param jobId - Job to bid on
   * @param agentId - Agent making the bid
   * @param plan - Work plan description
   * @param estimatedCostUSDC - Cost estimate
   * @param eta - Estimated time to complete (e.g., "2 days", "1 week")
   */
  async bid(
    jobId: string,
    agentId: string,
    plan: string,
    estimatedCostUSDC: number,
    eta: string
  ): Promise<Proposal> {
    return this.submit({
      jobId,
      agentId,
      plan,
      estimatedCostUSDC,
      eta,
    });
  }

  /**
   * Get pending proposals for a job
   * @param jobId - Job UUID
   */
  async getPending(jobId: string): Promise<Proposal[]> {
    const proposals = await this.list(jobId);
    return proposals.filter(p => p.status === "pending");
  }

  /**
   * Get accepted proposal for a job (should be at most one)
   * @param jobId - Job UUID
   */
  async getAccepted(jobId: string): Promise<Proposal | undefined> {
    const proposals = await this.list(jobId);
    return proposals.find(p => p.status === "accepted");
  }
}
