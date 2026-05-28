import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { EmployeeService } from '../employee.service';

@Component({
  selector: 'app-employee-details',
  imports: [],
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

  constructor() {
    // https://angular.dev/guide/components/lifecycle
    afterNextRender(() => this.dialogRef()?.nativeElement.showModal());
  }

  close() {
    this.dialogRef()?.nativeElement.close();
    this.router.navigate(['/']);
  }
}
