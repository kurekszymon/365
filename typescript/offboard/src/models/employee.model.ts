import { Equipment } from './equipment.model';

type Department =
  | 'Engineering'
  | 'Sales' // from json
  | 'HR' // can be extended by any department needed
  | 'Marketing'
  | 'Finance';

export type Employee = {
  id: string;
  name: string;
  last_day: string;
  department: Department;
  equipment: Equipment[];
};
