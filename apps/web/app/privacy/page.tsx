export default function PrivacyPage() {
  return (
    <main className="manuscript" style={{ paddingTop: "2.5rem", paddingBottom: "3rem" }}>
      <h1>Privacy Policy</h1>
      <p className="eyebrow">Last updated: {new Date().toLocaleDateString()}</p>

      <p>
        Scribes Meet ("we," "us") provides a writing and social platform for writers. This
        policy explains what information we collect and how we use it.
      </p>

      <h3>Information we collect</h3>
      <p>
        When you create an account, we collect your email address, a display name, and a
        handle you choose. If you add a bio or profile photo, that's stored too. The writing
        you create (documents, posts, comments) is stored so you can access it later and, where
        you choose to share it, so other people can see it.
      </p>

      <h3>How we use it</h3>
      <p>
        We use your information to operate the service: to show your documents back to you, to
        run the social features (feed, follows, notifications), and to keep your account secure.
        We do not sell your personal information to third parties.
      </p>

      <h3>Advertising</h3>
      <p>
        Scribes Meet is free to use and may display advertising to help cover the cost of
        running the service. Ad providers may use cookies or similar technology to show
        relevant ads. We do not share the content of your private documents with advertisers.
      </p>

      <h3>Cookies</h3>
      <p>
        We use cookies to keep you signed in and to remember preferences like your theme and
        font choice. These are stored in your browser and can be cleared at any time through
        your browser settings.
      </p>

      <h3>Your choices</h3>
      <p>
        You can update or delete your profile information at any time from your Profile page.
        For questions about your data, or to request deletion of your account, please reach out
        through the contact details on our site.
      </p>

      <h3>Changes to this policy</h3>
      <p>
        We may update this policy as the product evolves. We'll update the "last updated" date
        above when we do.
      </p>
    </main>
  );
}
