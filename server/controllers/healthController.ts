
import { successResponse } from "../utils/response";

export const getSystemHealth = (req: any, res: any) => {
  successResponse(
    res,
    {
      status: "UP",
      uptime: (process as any).uptime(),
      timestamp: new Date().toISOString(),
      service: "KMP - ADNG Academy Backend",
    },
    "System is running normally",
  );
};
