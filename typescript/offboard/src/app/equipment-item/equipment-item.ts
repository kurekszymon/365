import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Equipment, ReturnCondition } from '../../models/equipment.model';
import { ReturnForm } from './return-form/return-form';
import { IssueForm } from './issue-form/issue-form';
import { ItemPhase } from '../../models/itemphase.type';

@Component({
  selector: 'li[app-equipment-item]',
  imports: [ReturnForm, IssueForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './equipment-item.html',
  styleUrl: './equipment-item.css',
})
export class EquipmentItem {
  eq = input.required<Equipment>();

  statusChange = output<ItemPhase>();

  protected phase = signal<ItemPhase>('idle');
  protected condition = signal<ReturnCondition>(ReturnCondition.Good);
  protected note = signal('');

  protected isConditionWorse = computed(
    () =>
      this.condition() === ReturnCondition.Damaged ||
      this.condition() === ReturnCondition.MissingAccessories,
  );

  protected openReturnForm(): void {
    this.phase.set('return-form');
  }

  protected openIssueForm(): void {
    this.phase.set('issue-form');
  }

  protected onReturnConfirmed(condition: ReturnCondition): void {
    this.condition.set(condition);
    this.phase.set('returned');
    this.statusChange.emit('returned');
  }

  protected onIssueReported(note: string): void {
    this.note.set(note);
    this.phase.set('issue');
    this.statusChange.emit('issue');
  }

  protected cancel(): void {
    this.phase.set('idle');
  }
}
