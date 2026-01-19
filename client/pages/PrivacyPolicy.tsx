import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, ChevronLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background">
      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              conneclify
            </span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-muted-foreground">Last Updated: January 2026</p>
          </div>

          <section>
            <h2 className="text-2xl font-bold mb-4">Introduction</h2>
            <p className="text-muted-foreground mb-4">
              Welcome to conneclify ("Company," "we," "our," or "us"). We are
              committed to protecting your privacy. This Privacy Policy explains
              how we collect, use, disclose, and safeguard your information when
              you visit our website and use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">
              1. Information We Collect
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  Personal Information
                </h3>
                <p>
                  We collect information you provide directly to us, such as:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                  <li>Name, email address, and phone number</li>
                  <li>Company information and job title</li>
                  <li>Billing and payment information</li>
                  <li>Twilio account credentials and authentication tokens</li>
                  <li>Communication history and support inquiries</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  Automatically Collected Information
                </h3>
                <p>
                  When you access our services, we may automatically collect:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                  <li>IP address and browser type</li>
                  <li>Device information and operating system</li>
                  <li>Pages visited and time spent on our services</li>
                  <li>Referral source and links clicked</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">SMS Data</h3>
                <p>
                  When using our SMS management features, we process SMS
                  messages, phone numbers, and related metadata as directed by
                  you through your Twilio integration.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">
              2. How We Use Your Information
            </h2>
            <p className="text-muted-foreground mb-4">
              We use the information we collect for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
              <li>Providing and improving our services</li>
              <li>Authenticating users and preventing fraud</li>
              <li>Processing transactions and sending related notifications</li>
              <li>
                Communicating with you about updates, security alerts, and
                support
              </li>
              <li>Analyzing usage patterns to enhance user experience</li>
              <li>Complying with legal obligations and protecting rights</li>
              <li>Marketing and promotional purposes (with your consent)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">
              3. How We Share Your Information
            </h2>
            <p className="text-muted-foreground mb-4">
              We may share your information with:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
              <li>
                <strong>Service Providers:</strong> Third-party services that
                help us operate, such as cloud hosting, payment processors, and
                analytics platforms
              </li>
              <li>
                <strong>Twilio:</strong> Your Twilio credentials are shared
                securely with Twilio to enable SMS services
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law or
                legal process
              </li>
              <li>
                <strong>Business Transfers:</strong> In case of merger,
                acquisition, or sale of assets
              </li>
              <li>
                <strong>Your Consent:</strong> When you explicitly authorize
                sharing with third parties
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Data Security</h2>
            <p className="text-muted-foreground mb-4">
              We implement comprehensive security measures to protect your
              information, including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
              <li>SSL/TLS encryption for data in transit</li>
              <li>Encrypted storage for sensitive information</li>
              <li>Regular security audits and assessments</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Secure authentication for Twilio credentials</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              While we strive to protect your information, no security system is
              impenetrable. We cannot guarantee absolute security, but we are
              committed to maintaining industry-standard protections.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your personal information for as long as necessary to
              provide our services and fulfill the purposes outlined in this
              policy. You can request deletion of your account and associated
              data at any time through your account settings or by contacting
              us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">
              6. Your Rights and Choices
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of marketing communications</li>
                <li>Export your data in a portable format</li>
              </ul>
              <p>
                To exercise these rights, please contact us at
                contact@conneclify.com
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Cookies and Tracking</h2>
            <p className="text-muted-foreground mb-4">
              We use cookies and similar technologies to enhance your
              experience, remember preferences, and understand how you use our
              services. You can control cookie settings through your browser
              preferences.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Third-Party Links</h2>
            <p className="text-muted-foreground">
              Our website may contain links to third-party websites. We are not
              responsible for the privacy practices of these external sites.
              Please review their privacy policies before sharing your
              information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Children's Privacy</h2>
            <p className="text-muted-foreground">
              Our services are not intended for individuals under 18 years of
              age. We do not knowingly collect personal information from minors.
              If we learn that we have collected such information, we will
              delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">
              10. International Data Transfer
            </h2>
            <p className="text-muted-foreground">
              If you are located outside the United States, your data may be
              transferred to, stored in, and processed in the United States or
              other countries. By using our services, you consent to such
              transfers and processing under applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">
              11. Changes to This Privacy Policy
            </h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy to reflect changes in our
              practices or applicable laws. We will notify you of significant
              changes by updating the "Last Updated" date. Your continued use of
              our services after such changes constitutes your acceptance of the
              updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              If you have questions or concerns about this Privacy Policy or our
              privacy practices, please contact us:
            </p>
            <div className="bg-card border border-border rounded-lg p-6 text-muted-foreground">
              <p className="font-semibold text-foreground mb-2">conneclify</p>
              <p>Email: contact@conneclify.com</p>
              <p>Website: https://conneclify.com</p>
            </div>
          </section>

          <div className="border-t border-border pt-8 mt-8">
            <p className="text-sm text-muted-foreground">
              &copy; 2026 conneclify. All rights reserved.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
