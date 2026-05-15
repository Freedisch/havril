'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { FC, useState, FormEvent, startTransition, useActionState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { formSchema } from '../utils/waitlist/schema';
import { submitWaitlistForm } from '../utils/waitlist/action';
import * as z from 'zod';

type FormValues = z.infer<typeof formSchema>;

export const CTA: FC = () => {
  const [email, setEmail] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [, formAction] = useActionState(submitWaitlistForm, { message: '' });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    startTransition(() => {
      formAction(new FormData(formRef.current!));
      form.reset();
    });
    setSubmitted(true);
  };

  return (
    <section className="py-36 px-6 md:px-12 relative overflow-hidden bg-ink" id="get-access">
      <div className="absolute inset-0 grid-bg opacity-70" />
      <div className="absolute top-0 left-0 right-0 h-px bg-edge" />

      <div className="relative max-w-xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 border border-edge bg-ink2/80 px-4 py-1.5 mb-10 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-amber animate-blink" />
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-fog">
            Early access open
          </span>
        </div>

        <h2 className="font-display text-[clamp(36px,5vw,64px)] font-normal text-cream mb-5 leading-[1.05]">
          Memory that never
          <br />
          <span className="text-amber italic">forgets you.</span>
        </h2>

        <p className="text-[14px] text-mist mb-10 leading-relaxed font-body">
          Be among the first to bring persistent memory to every AI you use.
          <br className="hidden md:block" />
          No credit card. No setup fees.
        </p>

        {!submitted ? (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto"
          >
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 bg-ink2 border border-edge text-cream placeholder:text-fog px-4 py-3 text-[13px] font-body focus:outline-none focus:border-amber/40 transition-colors rounded-sm"
              required
            />
            <button
              type="submit"
              className="bg-amber text-white px-7 py-3 text-[11px] tracking-widest uppercase font-medium hover:bg-amber/90 transition-colors whitespace-nowrap rounded-sm"
            >
              Get Access
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-center gap-3 border border-edge bg-ink2/80 px-8 py-4 max-w-sm mx-auto animate-fade-in rounded-sm">
            <span className="text-amber">✦</span>
            <span className="font-mono text-[12px] text-mist">
              You&apos;re on the list. We&apos;ll be in touch.
            </span>
          </div>
        )}

        <p className="mt-8 font-mono text-[10px] text-fog tracking-wide">
          Built with Go · Qdrant · PostgreSQL · MCP
        </p>
      </div>
    </section>
  );
};
