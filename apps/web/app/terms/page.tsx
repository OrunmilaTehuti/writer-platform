export default function TermsPage() {
  return (
    <main className="manuscript" style={{ paddingTop: "2.5rem", paddingBottom: "3rem" }}>
      <h1>Terms of Service</h1>
      <p className="eyebrow">Last updated: {new Date().toLocaleDateString()}</p>

      <p>
        By using Scribes Meet, you agree to these terms. Please read them, and reach out if
        anything is unclear.
      </p>

      <h3>Your content</h3>
      <p>
        You own what you write. By posting or publishing content on Scribes Meet, you give us
        the permission needed to store, display, and distribute it back to you and, where you
        choose to make it public, to other users - nothing more. You're responsible for making
        sure you have the right to post what you post.
      </p>

      <h3>Acceptable use</h3>
      <p>
        Don't use Scribes Meet to post content that is illegal, infringes someone else's rights,
        or harasses other users. We may remove content or suspend accounts that violate this.
      </p>

      <h3>Collaboration &amp; invitations</h3>
      <p>
        Inviting someone to collaborate on a document requires that they already follow you.
        Collaboration access can be revoked by the document owner at any time.
      </p>

      <h3>The service is provided "as is"</h3>
      <p>
        Scribes Meet is provided without warranties of any kind. We do our best to keep your
        writing safe and the service running, but we can't guarantee uninterrupted availability.
        We recommend keeping your own backup copies of anything important.
      </p>

      <h3>Advertising</h3>
      <p>
        Scribes Meet is free to use, supported in part by advertising. Ads will not block access
        to your own documents or account.
      </p>

      <h3>Changes</h3>
      <p>
        We may update these terms as the product evolves, and will update the date above when we
        do. Continued use of Scribes Meet after changes means you accept the updated terms.
      </p>
    </main>
  );
}
