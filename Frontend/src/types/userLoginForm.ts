export interface UserLoginDto {
    email: string;
    password: string;
    captchaToken?: string | null;
    form?: string;
}