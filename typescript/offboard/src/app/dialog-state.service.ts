import { Injectable, signal } from '@angular/core';
import { ReturnCondition } from '../models/equipment.model';
import { ItemPhase } from '../models/itemphase.type';

export type EquipmentItemState = {
  phase: ItemPhase;
  condition: ReturnCondition;
  note: string;
};

@Injectable({ providedIn: 'root' })
export class DialogStateService {
  private readonly stateSignal = signal<Record<string, EquipmentItemState>>({});

  readonly state = this.stateSignal.asReadonly();

  getItem(equipmentId: string): EquipmentItemState | null {
    return this.stateSignal()[equipmentId] ?? null;
  }

  saveItem(equipmentId: string, itemState: EquipmentItemState): void {
    this.stateSignal.update((s) => ({ ...s, [equipmentId]: itemState }));
  }
}
