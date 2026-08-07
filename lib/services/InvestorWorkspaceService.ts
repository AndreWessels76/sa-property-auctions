import {
  InvestorWorkspaceRepository,
  SmartAlertRepository,
} from "@/lib/repositories/InvestorWorkspaceRepository";
import {
  evaluateSmartAlertRules,
  type SmartAlertRule,
} from "@/lib/alerts/smartAlertRules";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import { AlertRepository } from "@/lib/repositories/AlertRepository";
import { LoggerService } from "@/lib/logger";

export class InvestorWorkspaceService {
  static listNotes(userId: string, propertyId?: string) {
    return InvestorWorkspaceRepository.listNotes(userId, propertyId);
  }

  static createNote(input: {
    userId: string;
    propertyId?: string | null;
    title?: string | null;
    body: string;
    noteType?: string;
  }) {
    return InvestorWorkspaceRepository.createNote(input);
  }

  static listDocuments(userId: string, propertyId?: string) {
    return InvestorWorkspaceRepository.listDocuments(userId, propertyId);
  }

  static upsertTracker(input: {
    userId: string;
    propertyId: string;
    viewingDate?: string | null;
    registrationStatus?: string | null;
    legalStatus?: string | null;
    settlementStatus?: string | null;
  }) {
    return InvestorWorkspaceRepository.upsertTracker(input);
  }

  static listTrackers(userId: string) {
    return InvestorWorkspaceRepository.listTrackers(userId);
  }
}

export class SmartAlertService {
  static listRules(userId: string) {
    return SmartAlertRepository.listByUser(userId);
  }

  static createRule(userId: string, rule: Omit<SmartAlertRule, "id" | "user_id">) {
    return SmartAlertRepository.create(userId, rule);
  }

  static async processProperty(property: PropertyDTO): Promise<number> {
    const rules = await SmartAlertRepository.listActive();
    const byUser = new Map<string, SmartAlertRule[]>();
    for (const rule of rules) {
      const uid = rule.user_id;
      if (!uid) continue;
      const list = byUser.get(uid) ?? [];
      list.push(rule);
      byUser.set(uid, list);
    }

    let created = 0;
    for (const [userId, userRules] of byUser) {
      const matches = evaluateSmartAlertRules(property, userRules);
      for (const match of matches) {
        await AlertRepository.create({
          userId,
          propertyId: property.id,
          alertType: "NEW_MATCH",
          title: `Smart alert: ${match.ruleName}`,
          message: `${match.title} — ${match.reasons.join("; ")}`,
        });
        created += 1;
      }
    }

    if (created > 0) {
      LoggerService.audit("smart_alerts.matched", {
        propertyId: property.id,
        created,
      });
    }
    return created;
  }
}
