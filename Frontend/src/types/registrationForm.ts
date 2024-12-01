import { UserCreationDto } from './userCreation';

// Composite type for registration form
export type UserFormData = UserCreationDto & {
  repeatEmail: string;
  repeatPassword: string;
};