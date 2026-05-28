import { Injectable, inject } from '@angular/core';
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

  getEmployees(): Observable<Employee[]> {
    return this.employees$;
  }

  getEmployee(id: string): Observable<Employee | undefined> {
    return this.employees$.pipe(map((employees) => employees.find((e) => e.id === id)));
  }
}
