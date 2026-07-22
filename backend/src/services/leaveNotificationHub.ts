import { Response } from "express";
import { EventEmitter } from "events";
import prisma from "../config/database";

export type LeaveNotificationEvent = {
  pendingCount: number;
  type: "INIT" | "NEW_REQUEST" | "COUNT_UPDATED";
};

class LeaveNotificationHub extends EventEmitter {
  private clients = new Set<Response>();

  async getPendingCount(): Promise<number> {
    return prisma.leaveRequest.count({ where: { status: "PENDING" } });
  }

  private writeEvent(res: Response, event: LeaveNotificationEvent) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  async sendToClient(res: Response, type: LeaveNotificationEvent["type"]) {
    const pendingCount = await this.getPendingCount();
    this.writeEvent(res, { pendingCount, type });
  }

  subscribe(res: Response) {
    this.clients.add(res);
  }

  unsubscribe(res: Response) {
    this.clients.delete(res);
  }

  async broadcast(type: LeaveNotificationEvent["type"] = "COUNT_UPDATED") {
    const pendingCount = await this.getPendingCount();
    const payload: LeaveNotificationEvent = { pendingCount, type };

    for (const client of this.clients) {
      try {
        this.writeEvent(client, payload);
      } catch {
        this.clients.delete(client);
      }
    }

    this.emit("update", payload);
  }
}

export const leaveNotificationHub = new LeaveNotificationHub();
