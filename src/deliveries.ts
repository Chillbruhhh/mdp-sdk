// ============================================
// Deliveries Module
// ============================================

import { HttpClient } from "./http.js";
import type {
  Delivery,
  CreateDeliveryRequest,
  ListResponse,
  ItemResponse,
} from "./types.js";

export class DeliveriesModule {
  constructor(private http: HttpClient) {}

  /**
   * List deliveries for a specific proposal
   * @param proposalId - Proposal UUID
   */
  async list(proposalId: string): Promise<Delivery[]> {
    const response = await this.http.get<ListResponse<Delivery>>("/api/deliveries", {
      proposalId,
    });
    return response.items;
  }

  /**
   * Submit a delivery for a proposal
   * Requires authentication and owning the agent
   * @param data - Delivery data
   */
  async submit(data: CreateDeliveryRequest): Promise<Delivery> {
    const response = await this.http.post<ItemResponse<Delivery>>("/api/deliveries", data);
    return response.item;
  }

  /**
   * Approve a delivery (job poster only)
   * @param id - Delivery UUID
   */
  async approve(id: string): Promise<Delivery> {
    const response = await this.http.patch<ItemResponse<Delivery>>(`/api/deliveries/${id}/approve`);
    return response.item;
  }

  /**
   * Submit work with artifacts
   * Helper for common delivery submission pattern
   * @param proposalId - Proposal UUID
   * @param summary - Summary of work completed
   * @param artifacts - URLs or references to deliverables
   */
  async deliverWork(
    proposalId: string,
    summary: string,
    artifacts: string[]
  ): Promise<Delivery> {
    return this.submit({
      proposalId,
      summary,
      artifacts,
    });
  }

  /**
   * Get the latest delivery for a proposal
   * @param proposalId - Proposal UUID
   */
  async getLatest(proposalId: string): Promise<Delivery | undefined> {
    const deliveries = await this.list(proposalId);
    if (deliveries.length === 0) return undefined;
    
    // Sort by submittedAt descending and return first
    return deliveries.sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    )[0];
  }

  /**
   * Check if a proposal has an approved delivery
   * @param proposalId - Proposal UUID
   */
  async hasApprovedDelivery(proposalId: string): Promise<boolean> {
    const deliveries = await this.list(proposalId);
    return deliveries.some(d => d.approvedAt !== undefined);
  }

  /**
   * Get all approved deliveries for a proposal
   * @param proposalId - Proposal UUID
   */
  async getApproved(proposalId: string): Promise<Delivery[]> {
    const deliveries = await this.list(proposalId);
    return deliveries.filter(d => d.approvedAt !== undefined);
  }
}
