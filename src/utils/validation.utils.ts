interface UserInput {
  email?: string;
  password?: string;
  firstName?: string;
  isUpdate?: boolean; // If true, allow partial input
}

export function validateUserInput(input: UserInput): { valid: boolean; message?: string } {
  const { email, password, firstName, isUpdate = false } = input;

  if (!isUpdate || email !== undefined) {
    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
      return { valid: false, message: 'Valid email is required.' };
    }
  }

  if (!isUpdate || password !== undefined) {
    if (
      !password ||
      typeof password !== 'string' ||
      password.length < 8 ||
      !/[a-zA-Z]/.test(password) ||
      !/\d/.test(password) ||
      !/[!@#$%^&*(),.?":{}|<>]/.test(password)
    ) {
      return {
        valid: false,
        message:
          'Password must be at least 8 characters long and contain at least one letter, one number, and one special character.',
      };
    }
  }

  if (!isUpdate || firstName !== undefined) {
    if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
      return { valid: false, message: 'First name is required.' };
    }
  }

  return { valid: true };
}
