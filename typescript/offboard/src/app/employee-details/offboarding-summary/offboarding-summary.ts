import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-offboarding-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './offboarding-summary.css',
  templateUrl: './offboarding-summary.html',
})
export class OffboardingSummary {
  pending = input.required<number>();
  returned = input.required<number>();
  issues = input.required<number>();
  allActioned = input.required<boolean>();
  complete = output<void>();
}
