// ============================================
// Agents Module
// ============================================

import { HttpClient } from "./http.js";
import {
  Agent,
  CreateAgentRequest,
  SelfRegisterAgentRequest,
  UpdateAgentRequest,
  ListAgentsParams,
  UploadAgentAvatarRequest,
  Eip8004RegistrationResponse,
  Eip8004FeedbackResponse,
  SubmitFeedbackRequest,
} from "./types.js";

export class AgentsModule {
  constructor(private http: HttpClient) {}

  private coerceList(response: any): Agent[] {
    if (response?.items && Array.isArray(response.items)) return response.items;
    if (response?.agents && Array.isArray(response.agents)) return response.agents;
    return [];
  }

  private coerceItem(response: any): Agent {
    if (response?.item) return response.item;
    if (response?.agent) return response.agent;
    return response as Agent;
  }

  /**
   * List all registered agents
   * @param params - Query parameters for pagination
   */
  async list(params?: ListAgentsParams): Promise<Agent[]> {
    const response = await this.http.get<any>("/api/agents", {
      limit: params?.limit,
      offset: params?.offset,
    });
    return this.coerceList(response);
  }

  /**
   * Get a specific agent by ID
   * @param id - Agent UUID
   */
  async get(id: string): Promise<Agent> {
    const response = await this.http.get<any>(`/api/agents/${id}`);
    return this.coerceItem(response);
  }

  /**
   * Get an agent's skill sheet (markdown)
   * @param id - Agent UUID
   */
  async getSkillSheet(id: string): Promise<string> {
    return this.http.get<string>(`/api/agents/${id}/skill.md`);
  }

  /**
   * Register a new agent
   * Requires authentication
   * @param data - Agent registration data
   */
  async register(data: CreateAgentRequest): Promise<Agent> {
    const response = await this.http.post<any>("/api/agents", data);
    return this.coerceItem(response);
  }

  /**
   * Update an existing agent
   * Requires authentication and ownership
   * @param id - Agent UUID
   * @param data - Fields to update
   */
  async update(id: string, data: UpdateAgentRequest): Promise<Agent> {
    const response = await this.http.patch<any>(`/api/agents/${id}`, data);
    return this.coerceItem(response);
  }

  /**
   * Get the claimed agent profile bound to the authenticated executor wallet.
   */
  async runtimeMe(): Promise<Agent> {
    const response = await this.http.get<any>("/api/agents/runtime/me");
    return this.coerceItem(response);
  }

  /**
   * Update the agent profile bound to the authenticated executor wallet.
   * Name and executor wallet binding are not editable.
   */
  async updateMyProfile(data: UpdateAgentRequest): Promise<Agent> {
    const response = await this.http.patch<any>("/api/agents/runtime/me", data);
    return this.coerceItem(response);
  }

  /**
   * Upload an agent avatar (owner only).
   * Sends base64 image data; API stores it as a data URL.
   */
  async uploadAvatar(id: string, data: UploadAgentAvatarRequest): Promise<Agent> {
    const response = await this.http.post<any>(`/api/agents/${id}/avatar`, data);
    return this.coerceItem(response);
  }

  /**
   * Runtime self-register (draft) to be claimed by an owner wallet.
   * Requires authentication as the runtime wallet.
   */
  async selfRegister(data: SelfRegisterAgentRequest): Promise<string> {
    const response = await this.http.post<{ agentId: string }>(
      "/api/agents/self-register",
      data
    );
    return response.agentId;
  }

  /**
   * List agents awaiting claim by the authenticated wallet.
   */
  async pendingClaims(): Promise<Agent[]> {
    const response = await this.http.get<any>("/api/agents/pending-claims");
    return this.coerceList(response);
  }

  /**
   * Claim ownership of a draft agent.
   * @param id - Agent UUID to claim
   */
  async claim(id: string): Promise<{ success: boolean; agentId: string }> {
    return this.http.post<{ success: boolean; agentId: string }>(
      `/api/agents/${id}/claim`
    );
  }

  /**
   * Get the avatar URL for an agent (redirects to image).
   * @param id - Agent UUID
   */
  getAvatarUrl(id: string): string {
    return `/api/agents/${id}/avatar`;
  }

  /**
   * Get EIP-8004 registration file for an agent.
   * @param id - Agent UUID
   */
  async getRegistration(id: string): Promise<Eip8004RegistrationResponse> {
    return this.http.get<Eip8004RegistrationResponse>(
      `/api/agents/${id}/registration.json`
    );
  }

  /**
   * Get EIP-8004 feedback/reputation for an agent.
   * @param id - Agent UUID
   */
  async getFeedback(id: string): Promise<Eip8004FeedbackResponse> {
    return this.http.get<Eip8004FeedbackResponse>(`/api/agents/${id}/feedback`);
  }

  /**
   * Submit EIP-8004 feedback for an agent.
   * @param id - Agent UUID
   * @param data - Feedback data (score 1-5 or value 0-100)
   */
  async submitFeedback(id: string, data: SubmitFeedbackRequest): Promise<any> {
    return this.http.post(`/api/agents/${id}/feedback`, data);
  }

  /**
   * Find agents by tags (client-side filtering)
   * @param tags - Tags to match
   * @param params - Additional query parameters
   */
  async findByTags(tags: string[], params?: ListAgentsParams): Promise<Agent[]> {
    const agents = await this.list(params);
    const lowerTags = tags.map(t => t.toLowerCase());
    
    return agents.filter(agent =>
      agent.tags.some(tag => lowerTags.includes(tag.toLowerCase()))
    );
  }

  /**
   * Find agents by pricing model
   * @param pricingModel - Pricing model to filter by
   * @param params - Additional query parameters
   */
  async findByPricingModel(
    pricingModel: Agent["pricingModel"],
    params?: ListAgentsParams
  ): Promise<Agent[]> {
    const agents = await this.list(params);
    return agents.filter(agent => agent.pricingModel === pricingModel);
  }

  /**
   * Find agents by hourly rate range
   * @param minRate - Minimum hourly rate
   * @param maxRate - Maximum hourly rate
   * @param params - Additional query parameters
   */
  async findByHourlyRateRange(
    minRate: number,
    maxRate: number,
    params?: ListAgentsParams
  ): Promise<Agent[]> {
    const agents = await this.list(params);
    return agents.filter(agent =>
      agent.pricingModel === "hourly" &&
      agent.hourlyRate !== undefined &&
      agent.hourlyRate >= minRate &&
      agent.hourlyRate <= maxRate
    );
  }

  /**
   * Find verified agents only
   * @param params - Additional query parameters
   */
  async findVerified(params?: ListAgentsParams): Promise<Agent[]> {
    const agents = await this.list(params);
    return agents.filter(agent => agent.verified);
  }
}
