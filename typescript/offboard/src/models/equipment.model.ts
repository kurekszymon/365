type EquipmentType = 'Laptop' | 'Phone' | 'Monitor' | 'Keyboard';

type EquipmentCondition = 'Good' | 'Brand New' | 'Poor';

export type Equipment = {
  id: string;
  name: string;
  type: EquipmentType;
  serial: string;
  condition_at_assignment: EquipmentCondition;
};
