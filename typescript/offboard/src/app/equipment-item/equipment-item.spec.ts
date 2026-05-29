import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EquipmentItem } from './equipment-item';
import { Equipment, ReturnCondition } from '../../models/equipment.model';
import { DialogStateService } from '../dialog-state.service';

const EQ: Equipment = {
  id: 'eq-101',
  name: 'MacBook Pro',
  type: 'Laptop',
  serial: 'C02XG2JHQ6DN',
  condition_at_assignment: 'Good',
};

describe('EquipmentItem', () => {
  let dialogState: DialogStateService;

  function createFixture(): ComponentFixture<EquipmentItem> {
    const fixture = TestBed.createComponent(EquipmentItem);
    fixture.componentRef.setInput('eq', EQ);
    fixture.detectChanges();
    return fixture;
  }

  function get(fixture: ComponentFixture<EquipmentItem>) {
    return fixture.componentInstance;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EquipmentItem],
    }).compileComponents();

    dialogState = TestBed.inject(DialogStateService);
  });

  describe('phase transitions', () => {
    it('starts in idle phase', () => {
      const f = createFixture();
      expect(get(f).phase()).toBe('idle');
    });

    it('openReturnForm transitions to return-form', () => {
      const f = createFixture();
      get(f).openReturnForm();
      expect(get(f).phase()).toBe('return-form');
    });

    it('openIssueForm transitions to issue-form', () => {
      const f = createFixture();
      get(f).openIssueForm();
      expect(get(f).phase()).toBe('issue-form');
    });

    it('onReturnConfirmed transitions to returned with the given condition', () => {
      const f = createFixture();
      get(f).onReturnConfirmed(ReturnCondition.Damaged);
      expect(get(f).phase()).toBe('returned');
      expect(get(f).condition()).toBe(ReturnCondition.Damaged);
    });

    it('onIssueReported transitions to issue with the given note', () => {
      const f = createFixture();
      get(f).onIssueReported('Screen cracked');
      expect(get(f).phase()).toBe('issue');
      expect(get(f).note()).toBe('Screen cracked');
    });

    it('cancel resets phase to idle', () => {
      const f = createFixture();
      get(f).openReturnForm();
      get(f).cancel();
      expect(get(f).phase()).toBe('idle');
    });
  });

  describe('isConditionWorse', () => {
    it('is false for Good', () => {
      const f = createFixture();
      get(f).onReturnConfirmed(ReturnCondition.Good);
      expect(get(f).isConditionWorse()).toBe(false);
    });

    it('is true for Damaged', () => {
      const f = createFixture();
      get(f).onReturnConfirmed(ReturnCondition.Damaged);
      expect(get(f).isConditionWorse()).toBe(true);
    });

    it('is true for MissingAccessories', () => {
      const f = createFixture();
      get(f).onReturnConfirmed(ReturnCondition.MissingAccessories);
      expect(get(f).isConditionWorse()).toBe(true);
    });
  });

  describe('state persistence', () => {
    it('saves phase to service on transition', () => {
      const f = createFixture();
      get(f).onReturnConfirmed(ReturnCondition.Good);
      expect(dialogState.getItem('eq-101')?.phase).toBe('returned');
    });

    it('saves condition to service when returning', () => {
      const f = createFixture();
      get(f).onReturnConfirmed(ReturnCondition.Damaged);
      expect(dialogState.getItem('eq-101')?.condition).toBe(ReturnCondition.Damaged);
    });

    it('saves note to service when reporting an issue', () => {
      const f = createFixture();
      get(f).onIssueReported('Battery dead');
      expect(dialogState.getItem('eq-101')?.note).toBe('Battery dead');
    });
  });

  describe('state restoration', () => {
    it('restores returned phase and condition from service on init', () => {
      dialogState.saveItem('eq-101', {
        phase: 'returned',
        condition: ReturnCondition.Damaged,
        note: '',
      });

      const f = createFixture();
      expect(get(f).phase()).toBe('returned');
      expect(get(f).condition()).toBe(ReturnCondition.Damaged);
    });

    it('restores issue phase and note from service on init', () => {
      dialogState.saveItem('eq-101', {
        phase: 'issue',
        condition: ReturnCondition.Good,
        note: 'Missing charger',
      });

      const f = createFixture();
      expect(get(f).phase()).toBe('issue');
      expect(get(f).note()).toBe('Missing charger');
    });

    it('leaves phase as idle when no saved state exists', () => {
      const f = createFixture();
      expect(get(f).phase()).toBe('idle');
    });
  });
});
