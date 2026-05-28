import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-employee-details',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './employee-details.html',
})
export class EmployeeDetails {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected id = this.route.snapshot.paramMap.get('id');

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
