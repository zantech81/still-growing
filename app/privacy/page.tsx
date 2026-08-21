// Legal content approved by Zan 2026-08-21. Text is verbatim -- only the
// Markdown structure (headings/bold/lists) is adapted to JSX. Public,
// static page: no auth, no data fetching, same "true public" pattern as
// app/reviews/page.tsx and app/page.tsx, just without force-dynamic since
// there's nothing here that can go stale.
export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-4xl mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 italic mb-8">Last updated: August 21, 2026</p>

      <p className="text-ink leading-relaxed mb-8">
        Effective as of the date above, this Privacy Policy explains how Still Growing
        (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;) collects, uses, and protects information from
        visitors and readers (&ldquo;you&rdquo;) at stillgrowing.co and its related pages (including
        the sales and checkout pages hosted at baby.stillgrowing.co).
      </p>

      <h2 className="text-xl mt-10 mb-3">1. Who we are</h2>
      <p className="text-ink leading-relaxed mb-4">
        Still Growing is a digital reading companion for &ldquo;Life Lessons from a Baby&rdquo; and
        future titles, operated by:
      </p>
      <p className="text-ink leading-relaxed mb-4">
        ClickBloom Marketing
        <br />
        No 3, Jalan Tembusu 3/9, Seksyen 3, 40000 Shah Alam, Selangor, Malaysia
      </p>
      <p className="text-ink leading-relaxed">
        If you have questions about this policy or your data, contact us at{" "}
        <a href="mailto:admin@stillgrowing.co" className="text-pink-deep hover:underline">
          admin@stillgrowing.co
        </a>
        .
      </p>

      <h2 className="text-xl mt-10 mb-3">2. Information we collect</h2>
      <p className="text-ink leading-relaxed mb-2">
        <strong>Information you provide directly:</strong>
      </p>
      <ul className="list-disc pl-5 space-y-1.5 text-ink leading-relaxed mb-4">
        <li>
          Account details: your email address, a display name or nickname, and an avatar you
          select from our illustrated avatar set.
        </li>
        <li>
          Optional profile details: birthday (used only to send you a birthday message, see
          Section 3), display-name overrides on reviews.
        </li>
        <li>
          Content you create: chapter reflections, reactions (&ldquo;I felt this&rdquo;), Circle posts,
          and book reviews (star rating plus written text).
        </li>
        <li>
          Purchase-related details: when you buy through our checkout, your email address, order
          details, and payment confirmation are shared with us by our payment and funnel provider
          (see Section 5); we do not receive or store your card number.
        </li>
      </ul>
      <p className="text-ink leading-relaxed mb-2">
        <strong>Information collected automatically:</strong>
      </p>
      <ul className="list-disc pl-5 space-y-1.5 text-ink leading-relaxed">
        <li>
          Standard technical data such as IP address, browser type, device type, and pages
          visited, collected by our hosting and infrastructure providers for security,
          performance, and fraud-prevention purposes.
        </li>
        <li>
          Session cookies required to keep you signed in (set by our authentication provider). We
          do not currently use third-party advertising or analytics cookies on stillgrowing.co
          itself.
        </li>
      </ul>

      <h2 className="text-xl mt-10 mb-3">3. How we use your information</h2>
      <p className="text-ink leading-relaxed mb-2">We use the information above to:</p>
      <ul className="list-disc pl-5 space-y-1.5 text-ink leading-relaxed mb-4">
        <li>Create and maintain your account, and let you sign in (including via &ldquo;Sign in with Google&rdquo;).</li>
        <li>
          Deliver the reading experience: track which chapters you&apos;ve unlocked, display your
          reflections and reactions to other readers in the Circle, and show your public profile.
        </li>
        <li>Verify purchases against unlocked content, to protect against unauthorized access to paid chapters.</li>
        <li>
          Send you transactional emails: reaction notifications, new-book announcements, and,
          only if you&apos;ve provided a birthday, a birthday message once a year.
        </li>
        <li>
          Moderate community content (reflections, reviews, Circle posts) for safety, including a
          review pass that flags content suggesting self-harm risk, so we can point you toward
          support resources.
        </li>
        <li>Maintain and improve the security and reliability of the service.</li>
      </ul>
      <p className="text-ink leading-relaxed">
        We do not sell your personal information, and we do not use your data for third-party
        advertising.
      </p>

      <h2 className="text-xl mt-10 mb-3">4. Legal basis for processing (EU/UK visitors)</h2>
      <p className="text-ink leading-relaxed">
        Where the GDPR or UK GDPR applies, we process your information on the following bases:
        performance of a contract (running your account and delivering purchased content),
        legitimate interests (security, fraud prevention, moderation), and consent (optional
        fields like your birthday, which you can add or remove at any time from your account
        settings).
      </p>

      <h2 className="text-xl mt-10 mb-3">5. Who we share information with</h2>
      <p className="text-ink leading-relaxed mb-2">
        We share information with the service providers who help us run Still Growing, each
        acting under their own privacy and security commitments:
      </p>
      <ul className="list-disc pl-5 space-y-1.5 text-ink leading-relaxed mb-4">
        <li><strong>Supabase</strong> &ndash; our database and authentication provider; stores your account, profile, and content data.</li>
        <li><strong>Vercel</strong> &ndash; hosts the Still Growing web application.</li>
        <li><strong>Resend</strong> &ndash; sends transactional emails on our behalf (reaction, new-book, and birthday emails).</li>
        <li><strong>Mux</strong> &ndash; hosts and streams chapter reward videos.</li>
        <li><strong>Systeme.io</strong> &ndash; powers our sales funnel and checkout pages (baby.stillgrowing.co), and passes us confirmation of successful or refunded orders.</li>
        <li><strong>Stripe</strong> &ndash; processes payments through our Systeme.io checkout; Still Growing never receives or stores your full card details.</li>
        <li><strong>Google</strong> &ndash; if you choose to sign in with Google, Google shares your basic account info (name, email, profile image) with us per your consent during that sign-in flow.</li>
      </ul>
      <p className="text-ink leading-relaxed">
        We do not share your information with any other third party except where required by
        law, to protect our rights, or in connection with a business transfer (e.g. a merger or
        acquisition).
      </p>

      <h2 className="text-xl mt-10 mb-3">6. Cookies</h2>
      <p className="text-ink leading-relaxed">
        We use only the cookies necessary to keep you signed in and to remember your session. We
        do not currently use cookies for advertising or cross-site tracking on stillgrowing.co.
      </p>

      <h2 className="text-xl mt-10 mb-3">7. International data transfers</h2>
      <p className="text-ink leading-relaxed">
        Our service providers may process and store data outside your home country, including in
        the United States. Where this involves transferring personal data out of the EU/UK, our
        providers rely on standard contractual clauses or equivalent safeguards.
      </p>

      <h2 className="text-xl mt-10 mb-3">8. Data retention</h2>
      <p className="text-ink leading-relaxed">
        We keep your account and content data for as long as your account is active. If you
        delete your account, we remove your personal profile data within a reasonable period,
        except where we&apos;re required to keep records (for example, purchase and refund
        records, which we retain for accounting and legal purposes).
      </p>

      <h2 className="text-xl mt-10 mb-3">9. Security</h2>
      <p className="text-ink leading-relaxed">
        We use reasonable technical and organizational measures to protect your information,
        including row-level access controls on our database so that only you (and authorized
        admins) can access your private data. No method of transmission or storage is 100%
        secure, and we can&apos;t guarantee absolute security.
      </p>

      <h2 className="text-xl mt-10 mb-3">10. Your rights</h2>
      <p className="text-ink leading-relaxed mb-2">Depending on where you live, you may have the right to:</p>
      <ul className="list-disc pl-5 space-y-1.5 text-ink leading-relaxed mb-4">
        <li>
          <strong>EU/UK (GDPR/UK GDPR):</strong> access, correct, delete, or export your data;
          object to or restrict certain processing; and withdraw consent at any time.
        </li>
        <li>
          <strong>California (CCPA/CPRA):</strong> know what personal information we hold about
          you, request deletion, and opt out of the &ldquo;sale&rdquo; or &ldquo;sharing&rdquo; of personal
          information (we do not sell or share your data).
        </li>
        <li>
          <strong>Malaysia (PDPA):</strong> access and correct your personal data, and withdraw
          consent for optional processing.
        </li>
      </ul>
      <p className="text-ink leading-relaxed">
        To exercise any of these rights, email{" "}
        <a href="mailto:admin@stillgrowing.co" className="text-pink-deep hover:underline">
          admin@stillgrowing.co
        </a>
        . You can also update your display name, avatar, and birthday directly from your account
        settings, or delete your account reflections and reviews yourself where that option is
        available in the app.
      </p>

      <h2 className="text-xl mt-10 mb-3">11. Children&apos;s privacy</h2>
      <p className="text-ink leading-relaxed">
        Still Growing is intended for adult readers and is not directed at children. We do not
        knowingly collect personal information from children under 13 (or the relevant minimum
        age in your jurisdiction). If you believe a child has provided us with personal
        information, contact us at{" "}
        <a href="mailto:admin@stillgrowing.co" className="text-pink-deep hover:underline">
          admin@stillgrowing.co
        </a>{" "}
        and we&apos;ll remove it.
      </p>

      <h2 className="text-xl mt-10 mb-3">12. Third-party links</h2>
      <p className="text-ink leading-relaxed">
        Our content may link to third-party sites (for example, our checkout pages or social
        platforms). We aren&apos;t responsible for the privacy practices of those sites, please
        review their own policies.
      </p>

      <h2 className="text-xl mt-10 mb-3">13. Changes to this policy</h2>
      <p className="text-ink leading-relaxed">
        We may update this policy from time to time. If we make material changes, we&apos;ll
        update the &ldquo;Last updated&rdquo; date above and, where appropriate, notify you by email.
      </p>

      <h2 className="text-xl mt-10 mb-3">14. Contact us</h2>
      <p className="text-ink leading-relaxed mb-4">
        Questions about this policy or your data? Email{" "}
        <a href="mailto:admin@stillgrowing.co" className="text-pink-deep hover:underline">
          admin@stillgrowing.co
        </a>
        .
      </p>
    </main>
  );
}
