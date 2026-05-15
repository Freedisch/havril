import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Havril',
  description: 'How Havril collects, uses, and protects your data.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-xl font-medium text-zinc-900 mb-3">{title}</h2>
      <div className="space-y-3 text-zinc-600 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="max-w-2xl mx-auto px-6 py-20">

        <Link href="/" className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-zinc-600 transition-colors mb-12">
          ← havril
        </Link>

        <h1 className="font-display text-4xl font-light mb-2">Privacy Policy</h1>
        <p className="text-xs font-mono text-zinc-400 mb-12">Last updated: May 2025</p>

        <Section title="Overview">
          <p>
            Havril is a memory service for AI assistants. This policy explains what data the
            Havril browser extension and API collect, why, and how it is protected.
          </p>
          <p>
            If you have questions, contact us at{' '}
            <a href="mailto:freedischthibaut@proton.me" className="underline underline-offset-2 hover:text-zinc-900 transition-colors">
              freedischthibaut@proton.me
            </a>.
          </p>
        </Section>

        <Section title="Data we collect">
          <p><strong className="text-zinc-800">Account information.</strong> When you sign in with Google or GitHub, we receive your name, email address, and profile picture from that provider. We use this to identify your account.</p>
          <p><strong className="text-zinc-800">Authentication token.</strong> We generate a Bearer token that authenticates your requests to the Havril API. This token is stored only in your browser's session storage (<code className="text-xs bg-zinc-100 px-1 py-0.5 rounded">chrome.storage.session</code>) and is never written to disk or synced across devices.</p>
          <p><strong className="text-zinc-800">Conversation content.</strong> When you send a message on Claude, ChatGPT, or Gemini, the extension submits that conversation to the Havril API. The API extracts facts and preferences worth remembering and discards the raw transcript. We do not store your full conversation history.</p>
          <p><strong className="text-zinc-800">Memories.</strong> Distilled facts extracted from your conversations are stored in your Havril account and used to provide context in future conversations. You can view and delete all memories at any time.</p>
          <p><strong className="text-zinc-800">Preferences.</strong> Your display name, avatar URL, and UI theme preference are stored in <code className="text-xs bg-zinc-100 px-1 py-0.5 rounded">chrome.storage.sync</code> so they persist across devices.</p>
        </Section>

        <Section title="Data we do not collect">
          <ul className="list-disc list-inside space-y-1">
            <li>Health or medical information</li>
            <li>Financial or payment information</li>
            <li>Browsing history outside of supported AI platforms</li>
            <li>Location data</li>
            <li>Keystrokes, mouse movements, or screen content outside the chat input</li>
          </ul>
        </Section>

        <Section title="How we use your data">
          <p>We use the data listed above exclusively to operate the Havril memory service — storing memories and returning relevant context when you start a new AI conversation. We do not sell, rent, or share your data with third parties for advertising or analytics purposes.</p>
        </Section>

        <Section title="Third-party services">
          <p>Havril uses OpenAI's API to generate embeddings and extract facts from conversations. Conversation content is transmitted to OpenAI solely for this purpose and is subject to <a href="https://openai.com/policies/privacy-policy" className="underline underline-offset-2 hover:text-zinc-900 transition-colors" target="_blank" rel="noopener noreferrer">OpenAI's privacy policy</a>.</p>
          <p>Authentication is handled by Google and GitHub OAuth. We receive only the profile information those providers share and do not have access to your Google or GitHub account beyond that.</p>
        </Section>

        <Section title="Data retention and deletion">
          <p>You can delete individual memories or your entire account at any time from the Havril dashboard. Deletion removes your data from our database and vector store immediately.</p>
          <p>Session tokens are cleared when you log out or your browser session ends. Sync preferences are cleared when you log out via the extension popup.</p>
        </Section>

        <Section title="Security">
          <p>Bearer tokens are stored as SHA-256 hashes — the raw token is never persisted on our servers. All communication between the extension and the Havril API uses HTTPS.</p>
          <p>If you discover a security vulnerability, please report it to <a href="mailto:freedischthibaut@proton.me" className="underline underline-offset-2 hover:text-zinc-900 transition-colors">freedischthibaut@proton.me</a>. All reports are addressed promptly.</p>
        </Section>

        <Section title="Changes to this policy">
          <p>We may update this policy as the product evolves. Material changes will be noted with an updated date at the top of this page.</p>
        </Section>

      </div>
    </main>
  );
}
