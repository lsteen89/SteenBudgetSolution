export interface UserDto {
    id: number;
    persoId: string;
    firstName: string;
    lastName: string;
    email: string;
    emailConfirmed: boolean;
    roles: string;
    firstLogin: boolean;
  }