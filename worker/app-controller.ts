import { DurableObject } from 'cloudflare:workers';
import type { SessionInfo, Expense } from './types';
import type { Env } from './core-utils';
// 🤖 AI Extension Point: Add session management features
export class AppController extends DurableObject<Env> {
  private sessions = new Map<string, SessionInfo>();
  private expenses = new Map<string, Expense>();
  private loaded = false;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }
  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      const stored = await this.ctx.storage.list<SessionInfo | Expense>();
      for (const [key, value] of stored) {
        if (key.startsWith('session:')) {
          this.sessions.set(key.replace('session:', ''), value as SessionInfo);
        } else if (key.startsWith('expense:')) {
          this.expenses.set(key.replace('expense:', ''), value as Expense);
        }
      }
      this.loaded = true;
    }
  }
  // Session Management
  async addSession(sessionId: string, title?: string): Promise<void> {
    await this.ensureLoaded();
    const now = Date.now();
    const session: SessionInfo = {
      id: sessionId,
      title: title || `Chat ${new Date(now).toLocaleDateString()}`,
      createdAt: now,
      lastActive: now
    };
    this.sessions.set(sessionId, session);
    await this.ctx.storage.put(`session:${sessionId}`, session);
  }
  async removeSession(sessionId: string): Promise<boolean> {
    await this.ensureLoaded();
    const deleted = this.sessions.delete(sessionId);
    if (deleted) await this.ctx.storage.delete(`session:${sessionId}`);
    return deleted;
  }
  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.ensureLoaded();
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActive = Date.now();
      await this.ctx.storage.put(`session:${sessionId}`, session);
    }
  }
  async updateSessionTitle(sessionId: string, title: string): Promise<boolean> {
    await this.ensureLoaded();
    const session = this.sessions.get(sessionId);
    if (session) {
      session.title = title;
      await this.ctx.storage.put(`session:${sessionId}`, session);
      return true;
    }
    return false;
  }
  async listSessions(): Promise<SessionInfo[]> {
    await this.ensureLoaded();
    return Array.from(this.sessions.values()).sort((a, b) => b.lastActive - a.lastActive);
  }
  async getSessionCount(): Promise<number> {
    await this.ensureLoaded();
    return this.sessions.size;
  }
  async getSession(sessionId: string): Promise<SessionInfo | null> {
    await this.ensureLoaded();
    return this.sessions.get(sessionId) || null;
  }
  async clearAllSessions(): Promise<number> {
    await this.ensureLoaded();
    const count = this.sessions.size;
    const keys = Array.from(this.sessions.keys()).map(k => `session:${k}`);
    this.sessions.clear();
    await this.ctx.storage.delete(keys);
    return count;
  }
  // Expense Management
  async addExpense(expense: Expense): Promise<void> {
    await this.ensureLoaded();
    this.expenses.set(expense.id, expense);
    await this.ctx.storage.put(`expense:${expense.id}`, expense);
  }
  async listExpenses(): Promise<Expense[]> {
    await this.ensureLoaded();
    return Array.from(this.expenses.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  async clearExpenses(): Promise<number> {
    await this.ensureLoaded();
    const count = this.expenses.size;
    const keys = Array.from(this.expenses.keys()).map(k => `expense:${k}`);
    this.expenses.clear();
    await this.ctx.storage.delete(keys);
    return count;
  }
}