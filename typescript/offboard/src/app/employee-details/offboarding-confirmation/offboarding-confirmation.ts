import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-offboarding-confirmation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './offboarding-confirmation.css',
  templateUrl: './offboarding-confirmation.html',
})
export class OffboardingConfirmation {
  employeeName = input.required<string>();
  closed = output<void>();
}
