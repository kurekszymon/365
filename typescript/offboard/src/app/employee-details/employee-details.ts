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
import { DialogStateService } from '../dialog-state.service';

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
  private dialogState = inject(DialogStateService);

  protected id = this.route.snapshot.paramMap.get('id')!;
  protected employee = toSignal(this.employeeService.getEmployee(this.id));

  private dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  public returnedCount = computed(() => {
    const emp = this.employee();
    if (!emp) return 0;
    const state = this.dialogState.state();
    return emp.equipment.filter((eq) => state[eq.id]?.phase === 'returned').length;
  });

  public issueCount = computed(() => {
    const emp = this.employee();
    if (!emp) return 0;
    const state = this.dialogState.state();
    return emp.equipment.filter((eq) => state[eq.id]?.phase === 'issue').length;
  });

  public pending = computed(
    () => (this.employee()?.equipment.length ?? 0) - this.returnedCount() - this.issueCount(),
  );
  public allActioned = computed(() => this.pending() === 0 && !!this.employee()?.equipment.length);
  protected offboardingDone = signal(false);

  constructor() {
    // https://angular.dev/guide/components/lifecycle
    afterNextRender(() => this.dialogRef()?.nativeElement.showModal());
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
