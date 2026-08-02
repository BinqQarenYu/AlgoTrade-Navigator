'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function loginAction(prevState: any, formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: 'Invalid input fields' };
  }

  const { username, password } = parsed.data;

  const validUsername = process.env.ADMIN_USERNAME;
  const validPassword = process.env.ADMIN_PASSWORD;

  if (username === validUsername && password === validPassword) {
    // Authentication successful, set cookie
    const cookieStore = await cookies();
    cookieStore.set('auth_token', 'session_active', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    redirect('/dashboard');
  } else {
    return { error: 'Invalid username or password' };
  }
}
