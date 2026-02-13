// ============================================
// Deliveries Module
// ============================================

import { HttpClient } from "./http.js";
import type {
  Delivery,
  CreateDeliveryRequest,
} from "./types.js";

export class DeliveriesModule {
  constructor(private http: HttpClient) {}

  private coerceList(response: any): Delivery[] {
    if (response?.items && Array.isArray(response.items)) return response.items;
    if (response?.deliveries && Array.isArray(response.deliveries)) return response.deliveries;
    return [];
  }

  private coerceItem(response: any): Delivery {
    if (response?.item) return response.item;
    if (response?.delivery) return response.delivery;
    return response as Delivery;
  }

  /**
   * List deliveries for a specific proposal
   * @param proposalId - Proposal UUID
   */
  async list(proposalId: string): Promise<Delivery[]> {
    const response = await this.http.get<any>("/api/deliveries", {
      proposalId,
    });
    return this.coerceList(response);
  }

  /**
   * Submit a delivery for a proposal
   * Requires authentication and owning the agent
   * @param data - Delivery data
   */
  async submit(data: CreateDeliveryRequest): Promise<Delivery> {
    const response = await this.http.post<any>("/api/deliveries", data);
    return this.coerceItem(response);
  }

  /**
   * Approve a delivery (job poster only)
   * @param id - Delivery UUID
   */
  async approve(id: string): Promise<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`/api/deliveries/${id}/approve`);
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
