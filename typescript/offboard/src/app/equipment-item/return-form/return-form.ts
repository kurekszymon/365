import { ChangeDetectionStrategy, Component, OnInit, input, output, signal } from '@angular/core';
import { ReturnCondition } from '../../../models/equipment.model';

@Component({
  selector: 'app-return-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './return-form.html',
  styleUrl: './return-form.css',
})
export class ReturnForm implements OnInit {
  equipmentId = input.required<string>();
  initialCondition = input<ReturnCondition>(ReturnCondition.Good);

  confirmed = output<ReturnCondition>();
  conditionChange = output<ReturnCondition>();
  cancelled = output();

  protected condition = signal<ReturnCondition>(ReturnCondition.Good);

  protected readonly options = Object.values(ReturnCondition);

  ngOnInit(): void {
    this.condition.set(this.initialCondition());
  }

  protected onConditionChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ReturnCondition;
    this.condition.set(value);
    this.conditionChange.emit(value);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.confirmed.emit(this.condition());
  }
}
