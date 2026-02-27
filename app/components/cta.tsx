import { zodResolver } from '@hookform/resolvers/zod';
import {
  FC,
  useState,
  FormEvent,
  startTransition,
  useActionState,
  useRef,
} from 'react';
import { useForm } from 'react-hook-form';
import { formSchema } from '../utils/waitlist/schema';
import { submitWaitlistForm } from '../utils/waitlist/action';
import * as z from 'zod';

type FormValues = z.infer<typeof formSchema>;
export const CTA: FC = () => {
  const [email, setEmail] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [state, formAction] = useActionState(submitWaitlistForm, {
    message: '',
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });
  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    startTransition(() => {
      formAction(new FormData(formRef.current!));
      form.reset();
    });
    setSubmitted(true);
  };

  const formRef = useRef<HTMLFormElement>(null);

  return (
    <section
      className="py-40 px-8 md:px-12 relative overflow-hidden"
      id="get-access"
    >
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute inset-0 amber-glow" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber/30 to-transparent" />

      <div className="relative max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 border border-amber/20 bg-amber/5 px-4 py-1.5 mb-10">
          <span className="w-1.5 h-1.5 rounded-full bg-amber animate-blink" />
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-amber">
            Early access open
          </span>
        </div>

        <h2 className="font-display text-5xl md:text-7xl font-light text-cream mb-6 leading-tight">
          Memory that never
          <br />
          <em className="italic text-gradient font-light">forgets you.</em>
        </h2>

        <p className="text-base text-mist mb-12 leading-relaxed font-light">
          Be among the first to connect Havril to your Claude setup.
          <br className="hidden md:block" />
          No credit card. No setup fees. Just memory that works.
        </p>

        {!submitted ? (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 bg-ink2 border border-edge2 text-cream placeholder:text-fog px-4 py-3 text-sm focus:outline-none focus:border-amber/50 transition-colors duration-200"
              required
            />
            <button
              type="submit"
              className="bg-amber text-ink px-8 py-3 text-[11px] tracking-widest uppercase font-medium hover:bg-amber/90 transition-all duration-200 hover:-translate-y-px whitespace-nowrap"
            >
              Get Access
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-center gap-3 border border-amber/20 bg-amber/5 px-8 py-4 max-w-md mx-auto animate-fade-in">
            <span className="text-amber">✦</span>
            <span className="font-mono text-sm text-amber tracking-wide">
              You&apos;re on the list. We&apos;ll be in touch.
            </span>
          </div>
        )}

        <p className="mt-6 font-mono text-[10px] text-fog tracking-wide">
          Built with Go · Qdrant · PostgreSQL · MCP
        </p>
      </div>
    </section>
  );
};
