import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { ReturnCondition } from '../../../models/equipment.model';

@Component({
  selector: 'app-return-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './return-form.html',
  styleUrl: './return-form.css',
})
export class ReturnForm {
  equipmentId = input.required<string>();

  confirmed = output<ReturnCondition>();
  cancelled = output();

  protected condition = signal<ReturnCondition>(ReturnCondition.Good);

  protected readonly options = Object.values(ReturnCondition);

  protected onConditionChange(event: Event): void {
    this.condition.set((event.target as HTMLSelectElement).value as ReturnCondition);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.confirmed.emit(this.condition());
  }
}
