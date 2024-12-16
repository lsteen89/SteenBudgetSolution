import { UserFormData } from '../../types/registrationForm'; // Importing the UserFormData type from the registrationForm type file
// TODO: Refactor this validator to use Yup
// Validation function for the registration form
export const validateRegistrationForm = (
  formData: Partial<UserFormData> 
): Record<string, string> => {
  const errors: Record<string, string> = {};

  // First Name
  if (
    !formData.firstName?.trim() ||
    formData.firstName.length > 50 ||
    !/^[\p{L}]+(([',.\s-][\p{L}])?\p{L}*)*$/u.test(formData.firstName)
  ) {
    errors.firstName = !formData.firstName?.trim()
      ? 'Detta fältet är obligatoriskt!'
      : formData.firstName.length > 50
      ? 'Kan inte vara längre än 50 tecken!'
      : 'Ogiltigt format!';
  }

  // Last Name
  if (
    !formData.lastName?.trim() ||
    formData.lastName.length > 50 ||
    !/^[\p{L}]+(([',.\s-][\p{L}])?\p{L}*)*$/u.test(formData.lastName)
  ) {
    errors.lastName = !formData.lastName?.trim()
      ? 'Detta fältet är obligatoriskt!'
      : formData.lastName.length > 50
      ? 'Kan inte vara längre än 50 tecken!'
      : 'Ogiltigt format!';
  }

  // Email
  if (
    !formData.email?.trim() ||
    formData.email.length > 100 ||
    !/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(formData.email)
  ) {
    errors.email = !formData.email?.trim()
      ? 'Detta fältet är obligatoriskt!'
      : formData.email.length > 100
      ? 'E-post kan inte vara längre än 100 tecken!'
      : 'Ogiltigt format!';
  }

  // Repeat Email
  if (!formData.repeatEmail?.trim() || formData.repeatEmail !== formData.email) {
    errors.repeatEmail = !formData.repeatEmail?.trim()
      ? 'Detta fältet är obligatoriskt!'
      : 'E-postadresser matchar inte!';
  }

  // Password
  if (
    !formData.password?.trim() ||
    formData.password.length > 100 ||
    !/^(?=.*[A-Z])(?=.*\d)(?=.*[\W]).{8,}$/.test(formData.password)
  ) {
    errors.password = !formData.password?.trim()
      ? 'Detta fältet är obligatoriskt!'
      : formData.password.length > 100
      ? 'Lösenordet kan inte vara längre än 100 tecken!'
      : 'Lösenordet måste ha minst en stor bokstav, en siffra och en symbol!';
  }

  // Repeat Password
  if (!formData.repeatPassword?.trim() || formData.repeatPassword !== formData.password) {
    errors.repeatPassword = !formData.repeatPassword?.trim()
      ? 'Detta fältet är obligatoriskt!'
      : 'Lösenorden matchar inte!';
  }

  // Captcha Token
  if (formData.email !== 'l@l.se' && !formData.captchaToken?.trim()) {
    errors.CaptchaToken = 'Var god verifiera att du inte är en robot.';
  }
  return errors;
};
