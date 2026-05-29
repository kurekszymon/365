import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { Equipment, ReturnCondition } from '../../models/equipment.model';
import { ReturnForm } from './return-form/return-form';
import { IssueForm } from './issue-form/issue-form';

type ItemPhase = 'idle' | 'return-form' | 'issue-form' | 'returned' | 'issue';

@Component({
  selector: 'li[app-equipment-item]',
  imports: [ReturnForm, IssueForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './equipment-item.html',
  styleUrl: './equipment-item.css',
})
export class EquipmentItem {
  eq = input.required<Equipment>();

  protected phase = signal<ItemPhase>('idle');
  protected condition = signal<ReturnCondition>(ReturnCondition.Good);
  protected note = signal('');

  protected openReturnForm(): void {
    this.phase.set('return-form');
  }

  protected openIssueForm(): void {
    this.phase.set('issue-form');
  }

  protected onReturnConfirmed(condition: ReturnCondition): void {
    this.condition.set(condition);
    this.phase.set('returned');
  }

  protected onIssueReported(note: string): void {
    this.note.set(note);
    this.phase.set('issue');
  }

  protected cancel(): void {
    this.phase.set('idle');
  }
}
