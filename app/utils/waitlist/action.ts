'use server';

import { formSchema } from './schema';

type FormState = {
  message: string;
};

export async function submitWaitlistForm(
  prevState: FormState,
  data: FormData,
): Promise<FormState> {
  const formData = Object.fromEntries(data);
  const parsed = formSchema.safeParse(formData);

  if (!parsed.success) {
    return { message: 'Invalid form data' };
  }

  try {
    const response = await fetch(
      'https://app.router.so/api/endpoints/vsoosrl7',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.ROUTER_API_KEY}`,
        },
        body: JSON.stringify(parsed.data),
      },
    );

    if (!response.ok) {
      return { message: 'Failed to submit form' };
    }

    return { message: 'Message sent successfully!' };
  } catch (error) {
    return { message: 'Failed to submit form. Please try again.' };
  }
}
