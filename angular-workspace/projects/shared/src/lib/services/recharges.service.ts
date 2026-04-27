import { Injectable } from '@angular/core';
import { Recharge } from '../models/recharge.model';

@Injectable({ providedIn: 'root' })
export class RechargesService {
  async list(): Promise<Recharge[]> {
    // TODO: load recharge history.
    return [];
  }

  async create(_credits: number): Promise<Recharge | null> {
    // TODO: create recharge request and notify operations.
    return null;
  }
}
