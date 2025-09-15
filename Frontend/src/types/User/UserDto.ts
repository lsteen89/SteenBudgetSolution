export interface UserDto {
  firstName: string
  lastName: string
  email: string
  persoId: string
  roles: string[] | null     // TODO: implement roles
  firstLogin: boolean
  lastLogin: Date | null
}