export type EmployeeStatus = 'Active' | 'Inactive' | 'Left' | 'Suspended';

export interface Employee {
  name: string;
  employee_name: string;
  user_id: string;
  department: string | null;
  designation: string | null;
  image: string | null;
  status: EmployeeStatus | null;
  date_of_joining: string | null;
  company: string | null;
}
