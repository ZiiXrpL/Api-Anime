import { Request, Response } from 'express';

export function healthCheck(_req: Request, res: Response): void {
  res.status(200).json({
    status: true,
    message: 'API sehat',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
