import { UserCreationDto } from './userCreation';

export interface UserFormData extends UserCreationDto {
  repeatEmail?: string;
  repeatPassword?: string;
}