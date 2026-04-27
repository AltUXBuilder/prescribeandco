import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { Observable } from 'rxjs';
import { Request } from 'express';

export interface AuditContext {
  ipAddress: string | null;
  userAgent: string | null;
  actorId: string | null;
}

/**
 * AsyncLocalStorage instance — one per in-flight request.
 * Exported so AuditService can read it without injecting the interceptor.
 * Using ALS avoids passing audit context through every service call signature.
 */
export const auditContextStorage = new AsyncLocalStorage<AuditContext>();

/**
 * AuditInterceptor
 * ────────────────
 * Wraps every request in an AsyncLocalStorage context carrying:
 *   - ipAddress  (from X-Forwarded-For or req.ip)
 *   - userAgent  (from User-Agent header)
 *   - actorId    (from request.user.id if authenticated)
 *
 * Any service can then call auditContextStorage.getStore() to get this
 * context without it needing to be threaded through every method signature.
 *
 * Registered globally in AppModule so it runs on every route.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req: Request = context.switchToHttp().getRequest();

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.ip ??
      null;

    const userAgent = (req.headers['user-agent'] as string) ?? null;
    const actorId = (req as any).user?.id ?? null;

    const auditCtx: AuditContext = { ipAddress, userAgent, actorId };

    return new Observable((observer) => {
      auditContextStorage.run(auditCtx, () => {
        next.handle().subscribe({
          next: (val) => observer.next(val),
          error: (err) => observer.error(err),
          complete: () => observer.complete(),
        });
      });
    });
  }
}
