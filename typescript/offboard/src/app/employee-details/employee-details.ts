import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { EmployeeService } from '../employee.service';
import { EquipmentItem } from '../equipment-item/equipment-item';
import { OffboardingSummary } from './offboarding-summary/offboarding-summary';
import { OffboardingConfirmation } from './offboarding-confirmation/offboarding-confirmation';
import { ItemPhase } from '../../models/itemphase.type';

@Component({
  selector: 'app-employee-details',
  imports: [EquipmentItem, OffboardingSummary, OffboardingConfirmation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './employee-details.html',
  styleUrl: './employee-details.css',
})
export class EmployeeDetails {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private employeeService = inject(EmployeeService);

  protected id = this.route.snapshot.paramMap.get('id')!;
  protected employee = toSignal(this.employeeService.getEmployee(this.id));

  private dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  protected returnedCount = signal(0);
  protected issueCount = signal(0);
  protected pending = computed(
    () => (this.employee()?.equipment.length ?? 0) - this.returnedCount() - this.issueCount(),
  );
  protected allActioned = computed(
    () => this.pending() === 0 && !!this.employee()?.equipment.length,
  );
  protected offboardingDone = signal(false);

  constructor() {
    // https://angular.dev/guide/components/lifecycle
    afterNextRender(() => this.dialogRef()?.nativeElement.showModal());
  }

  protected onStatusChange(phase: ItemPhase): void {
    if (phase === 'returned') this.returnedCount.update((n) => n + 1);
    else if (phase === 'issue') this.issueCount.update((n) => n + 1);
  }

  protected completeOffboarding(): void {
    this.employeeService.completeOffboarding(this.id);
    this.offboardingDone.set(true);
  }

  protected close(): void {
    this.dialogRef()?.nativeElement.close();
    this.router.navigate(['/']);
  }
}
