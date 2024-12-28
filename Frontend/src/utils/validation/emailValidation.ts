export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
    return !!email?.trim() && emailRegex.test(email);
};