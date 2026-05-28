import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'offboard/:id',
    loadComponent: () =>
      import('./employee-details/employee-details').then((m) => m.EmployeeDetails),
  },
];
