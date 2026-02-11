// ============================================
// Messages Module
// ============================================

import { HttpClient } from "./http.js";
import type {
  Conversation,
  Message,
  CreateDmRequest,
  ListMessagesParams,
} from "./types.js";

export class MessagesModule {
  constructor(private http: HttpClient) {}

  /**
   * Create (or get existing) DM conversation
   */
  async createDm(data: CreateDmRequest): Promise<string> {
    const res = await this.http.post<{ conversationId: string }>("/api/messages/dm", data);
    return res.conversationId;
  }

  /**
   * List all conversations for the authenticated user
   */
  async listConversations(): Promise<Conversation[]> {
    const res = await this.http.get<{ conversations: Conversation[] }>(
      "/api/messages/conversations"
    );
    return res.conversations;
  }

  /**
   * Get conversation metadata
   */
  async getConversation(id: string): Promise<{
    conversation: Conversation;
    other: { id: string; wallet: string } | null;
    participants: { userId: string; lastReadAt: string | null }[];
  }> {
    return this.http.get(`/api/messages/conversations/${id}`);
  }

  /**
   * List messages in a conversation
   */
  async listMessages(id: string, params?: ListMessagesParams): Promise<Message[]> {
    const res = await this.http.get<{ messages: Message[] }>(
      `/api/messages/conversations/${id}/messages`,
      {
        limit: params?.limit,
        before: params?.before,
      }
    );
    return res.messages;
  }

  /**
   * Send a message to a conversation
   */
  async sendMessage(id: string, body: string): Promise<Message> {
    const res = await this.http.post<{ message: Message }>(
      `/api/messages/conversations/${id}/messages`,
      { body }
    );
    return res.message;
  }

  /**
   * Mark a conversation as read
   */
  async markRead(id: string): Promise<boolean> {
    const res = await this.http.post<{ success: boolean }>(
      `/api/messages/conversations/${id}/read`
    );
    return Boolean(res.success);
  }
}
