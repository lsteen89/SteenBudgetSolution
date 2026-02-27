export interface UserLoginDto {
  email: string;
  password: string;
  HumanToken: string | null;
  form?: string;
}
