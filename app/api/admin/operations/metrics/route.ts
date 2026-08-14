import { PermissionService } from "@/lib/auth/PermissionService";
import { jsonError, jsonOk } from "@/lib/api/http";
import { OperationsMetricsService } from "@/lib/services/OperationsMetricsService";

export async function GET() {
  try {
    await PermissionService.requireAdmin();
    const metrics = await OperationsMetricsService.getMetrics();
    return jsonOk(metrics);
  } catch (error) {
    return jsonError(error, "Operations metrics failed.");
  }
}
