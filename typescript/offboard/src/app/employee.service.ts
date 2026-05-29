import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { Employee } from '../models/employee.model';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private http = inject(HttpClient);

  private employees$ = this.http.get<{ employees: Employee[] }>('/data.json').pipe(
    map((data) => data.employees),
    shareReplay(1),
  );

  // service should be stateless, keeping it here for optimistic ui show,
  // state should be stored on the backend side that I dont have..
  // could've used local storage, but since it's only for ui purposes I guess it's fine.
  readonly completedIds = signal<ReadonlySet<string>>(new Set());

  getEmployees(): Observable<Employee[]> {
    return this.employees$;
  }

  getEmployee(id: string): Observable<Employee | undefined> {
    return this.employees$.pipe(map((employees) => employees.find((e) => e.id === id)));
  }

  completeOffboarding(id: string): void {
    this.completedIds.update((ids) => new Set([...ids, id]));
  }
}
