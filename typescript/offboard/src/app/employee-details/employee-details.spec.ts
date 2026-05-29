import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { EmployeeDetails } from './employee-details';
import { EmployeeService } from '../employee.service';
import { DialogStateService } from '../dialog-state.service';
import { Employee } from '../../models/employee.model';
import { ReturnCondition } from '../../models/equipment.model';

const EMPLOYEE: Employee = {
  id: 'emp-001',
  name: 'Alice Kowalski',
  department: 'Engineering',
  last_day: '2024-06-30',
  equipment: [
    {
      id: 'eq-101',
      name: 'MacBook',
      type: 'Laptop',
      serial: 'S1',
      condition_at_assignment: 'Good',
    },
    {
      id: 'eq-102',
      name: 'Monitor',
      type: 'Monitor',
      serial: 'S2',
      condition_at_assignment: 'Good',
    },
    {
      id: 'eq-103',
      name: 'Keyboard',
      type: 'Keyboard',
      serial: 'S3',
      condition_at_assignment: 'Good',
    },
  ],
};

const RETURNED = { phase: 'returned' as const, condition: ReturnCondition.Good, note: '' };
const ISSUE = { phase: 'issue' as const, condition: ReturnCondition.Good, note: 'Broken' };

describe('EmployeeDetails', () => {
  let fixture: ComponentFixture<EmployeeDetails>;
  let component: EmployeeDetails;
  let dialogState: DialogStateService;

  beforeEach(async () => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();

    await TestBed.configureTestingModule({
      imports: [EmployeeDetails],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'emp-001' } } },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: EmployeeService,
          useValue: {
            getEmployee: () => of(EMPLOYEE),
            completeOffboarding: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeDetails);
    dialogState = TestBed.inject(DialogStateService);
    fixture.detectChanges();
    await fixture.whenStable();
    component = fixture.componentInstance;
  });

  function get(): EmployeeDetails {
    return component;
  }

  describe('returnedCount', () => {
    it('is 0 when no items are saved as returned', () => {
      expect(get().returnedCount()).toBe(0);
    });

    it('counts items with returned phase', () => {
      dialogState.saveItem('eq-101', RETURNED);
      expect(get().returnedCount()).toBe(1);
    });

    it('does not count items with issue phase', () => {
      dialogState.saveItem('eq-101', ISSUE);
      expect(get().returnedCount()).toBe(0);
    });
  });

  describe('issueCount', () => {
    it('is 0 when no items are saved as issue', () => {
      expect(get().issueCount()).toBe(0);
    });

    it('counts items with issue phase', () => {
      dialogState.saveItem('eq-102', ISSUE);
      expect(get().issueCount()).toBe(1);
    });
  });

  describe('pending', () => {
    it('equals total equipment count initially', () => {
      expect(get().pending()).toBe(3);
    });

    it('decreases when an item is returned', () => {
      dialogState.saveItem('eq-101', RETURNED);
      expect(get().pending()).toBe(2);
    });

    it('decreases when an item has an issue', () => {
      dialogState.saveItem('eq-101', ISSUE);
      expect(get().pending()).toBe(2);
    });
  });

  describe('allActioned', () => {
    it('is false when some items are still pending', () => {
      dialogState.saveItem('eq-101', RETURNED);
      expect(get().allActioned()).toBe(false);
    });

    it('is true when every item has been returned or has an issue', () => {
      dialogState.saveItem('eq-101', RETURNED);
      dialogState.saveItem('eq-102', RETURNED);
      dialogState.saveItem('eq-103', ISSUE);
      expect(get().allActioned()).toBe(true);
    });
  });
});
