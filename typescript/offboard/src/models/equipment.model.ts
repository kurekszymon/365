type EquipmentType = 'Laptop' | 'Phone' | 'Monitor' | 'Keyboard';

type EquipmentCondition = 'Good' | 'Brand New' | 'Poor';

export enum ReturnCondition {
  Good = 'Good',
  Damaged = 'Damaged',
  MissingAccessories = 'Missing accessories',
}

export type Equipment = {
  id: string;
  name: string;
  type: EquipmentType;
  serial: string;
  condition_at_assignment: EquipmentCondition;
};
