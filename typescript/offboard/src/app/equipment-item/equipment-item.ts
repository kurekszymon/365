import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Equipment, ReturnCondition } from '../../models/equipment.model';
import { ReturnForm } from './return-form/return-form';
import { IssueForm } from './issue-form/issue-form';
import { ItemPhase } from '../../models/itemphase.type';
import { DialogStateService } from '../dialog-state.service';

@Component({
  selector: 'li[app-equipment-item]',
  imports: [ReturnForm, IssueForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './equipment-item.html',
  styleUrl: './equipment-item.css',
})
export class EquipmentItem implements OnInit {
  eq = input.required<Equipment>();

  private dialogState = inject(DialogStateService);

  public phase = signal<ItemPhase>('idle');
  public condition = signal<ReturnCondition>(ReturnCondition.Good);
  public note = signal('');

  public isConditionWorse = computed(
    () =>
      this.condition() === ReturnCondition.Damaged ||
      this.condition() === ReturnCondition.MissingAccessories,
  );

  ngOnInit(): void {
    const saved = this.dialogState.getItem(this.eq().id);
    if (saved) {
      this.phase.set(saved.phase);
      this.condition.set(saved.condition);
      this.note.set(saved.note);
    }
  }

  public openReturnForm(): void {
    this.phase.set('return-form');
    this.save();
  }

  public openIssueForm(): void {
    this.phase.set('issue-form');
    this.save();
  }

  public onReturnConfirmed(condition: ReturnCondition): void {
    this.condition.set(condition);
    this.phase.set('returned');
    this.save();
  }

  public onIssueReported(note: string): void {
    this.note.set(note);
    this.phase.set('issue');
    this.save();
  }

  protected onConditionDraft(condition: ReturnCondition): void {
    this.condition.set(condition);
    this.save();
  }

  protected onNoteDraft(note: string): void {
    this.note.set(note);
    this.save();
  }

  public cancel(): void {
    this.phase.set('idle');
    this.save();
  }

  private save(): void {
    this.dialogState.saveItem(this.eq().id, {
      phase: this.phase(),
      condition: this.condition(),
      note: this.note(),
    });
  }
}
