import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { TenantContext } from './request-context.interface';

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<TenantContext>();

  run<T>(context: TenantContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  get(): TenantContext {
    return this.storage.getStore() ?? { requestId: 'unknown' };
  }

  set(partial: Partial<TenantContext>) {
    const current = this.get();
    this.storage.enterWith({ ...current, ...partial });
  }
}
