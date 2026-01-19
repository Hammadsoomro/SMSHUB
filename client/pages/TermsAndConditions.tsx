import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, ChevronLeft } from "lucide-react";

export default function TermsAndConditions() {
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
            <h1 className="text-4xl font-bold mb-2">Terms and Conditions</h1>
            <p className="text-muted-foreground">
              Last Updated: January 2026
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-bold mb-4">Introduction</h2>
            <p className="text-muted-foreground mb-4">
              These Terms and Conditions ("Terms") govern your access to and use
              of conneclify's website, services, and applications (collectively,
              the "Service"). By accessing or using the Service, you agree to be
              bound by these Terms. If you do not agree to these Terms, do not
              use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">1. Service Description</h2>
            <p className="text-muted-foreground">
              conneclify provides a platform for SMS management, team
              collaboration, and integration with Twilio services. The Service
              enables users to manage phone numbers, send and receive SMS
              messages, manage team members, and access messaging analytics.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. User Accounts</h2>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  Account Registration
                </h3>
                <p>
                  To use the Service, you must create an account. You agree to
                  provide accurate, current, and complete information during
                  registration and maintain the accuracy of such information.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  Responsibility for Accounts
                </h3>
                <p>
                  You are responsible for maintaining the confidentiality of
                  your account credentials and for all activities that occur
                  under your account. You agree to notify us immediately of any
                  unauthorized use of your account.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  Account Types
                </h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    <strong>Admin Account:</strong> Full access to all features
                    and settings
                  </li>
                  <li>
                    <strong>Team Member Account:</strong> Limited access based
                    on permissions set by admin
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Acceptable Use Policy</h2>
            <p className="text-muted-foreground mb-4">You agree not to use the Service for:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
              <li>Sending spam, harassment, or abusive messages</li>
              <li>Violating any applicable laws or regulations</li>
              <li>Impersonating others or providing false information</li>
              <li>Transmitting malware or harmful code</li>
              <li>Attempting to gain unauthorized access to our systems</li>
              <li>Engaging in fraudulent or deceptive practices</li>
              <li>Interfering with the Service's normal operation</li>
              <li>
                Violating intellectual property rights of others
              </li>
              <li>
                Engaging in any activity that violates Twilio's terms of
                service
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Twilio Integration</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                By connecting your Twilio account to our Service, you:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Authorize conneclify to access your Twilio account</li>
                <li>
                  Agree to use the Service in compliance with Twilio's Terms of
                  Service
                </li>
                <li>
                  Understand that SMS costs are billed by Twilio, not by
                  conneclify
                </li>
                <li>
                  Acknowledge that conneclify is not affiliated with or
                  endorsed by Twilio
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Payment and Billing</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                <strong>SMS Costs:</strong> SMS message costs are charged
                directly by Twilio and are separate from any fees charged by
                conneclify. You are responsible for all charges incurred through
                your Twilio account.
              </p>
              <p>
                <strong>Service Fees:</strong> Any applicable conneclify service
                fees will be clearly stated in your account and invoiced
                accordingly.
              </p>
              <p>
                <strong>Payment Authorization:</strong> By providing payment
                information, you authorize conneclify to charge your account for
                services rendered.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">
              6. Intellectual Property
            </h2>
            <p className="text-muted-foreground mb-4">
              The Service, including all content, features, and functionality,
              is owned by conneclify or its content suppliers and is protected
              by international copyright, trademark, and other intellectual
              property laws. You are granted a limited, non-exclusive license to
              use the Service solely for your authorized purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. User Content</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                <strong>Ownership:</strong> You retain ownership of any content
                you upload or transmit through the Service ("User Content").
              </p>
              <p>
                <strong>License Grant:</strong> By uploading User Content, you
                grant conneclify a worldwide, royalty-free license to use,
                reproduce, and process your content to provide the Service.
              </p>
              <p>
                <strong>Responsibility:</strong> You are solely responsible for
                User Content and warrant that you have all necessary rights to
                provide such content.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Limitation of Liability</h2>
            <p className="text-muted-foreground mb-4">
              TO THE FULLEST EXTENT PERMITTED BY LAW:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
              <li>
                conneclify shall not be liable for any indirect, incidental,
                special, or consequential damages
              </li>
              <li>
                Our total liability shall not exceed the fees paid by you in
                the past 12 months
              </li>
              <li>
                We are not liable for unauthorized access to your account due to
                your failure to maintain password confidentiality
              </li>
              <li>
                We are not liable for any issues arising from Twilio service
                outages or third-party services
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">
              9. Disclaimer of Warranties
            </h2>
            <p className="text-muted-foreground">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
              WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. conneclify DISCLAIMS
              ALL WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A
              PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify and hold harmless conneclify and its
              officers, directors, employees, and agents from any claims,
              damages, losses, or expenses arising from your use of the Service
              or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Termination</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                <strong>Termination by You:</strong> You may terminate your
                account at any time through your account settings.
              </p>
              <p>
                <strong>Termination by conneclify:</strong> We may terminate or
                suspend your account immediately for violations of these Terms,
                applicable laws, or to prevent fraud or abuse.
              </p>
              <p>
                <strong>Effects of Termination:</strong> Upon termination, your
                access to the Service ceases, but provisions regarding
                intellectual property, liability limitations, and indemnification
                survive.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Data and Security</h2>
            <p className="text-muted-foreground mb-4">
              While we implement security measures, we do not guarantee
              uninterrupted access or error-free operation. You are responsible
              for backing up important data. We are not liable for any loss or
              corruption of data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">
              13. Third-Party Services
            </h2>
            <p className="text-muted-foreground mb-4">
              The Service integrates with third-party services, including
              Twilio. Your use of these services is governed by their respective
              terms and conditions. We are not responsible for third-party
              services, their availability, or their compliance with applicable
              laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">14. Modifications to Service</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify, suspend, or discontinue the
              Service or any features at any time with or without notice. We
              will make reasonable efforts to notify users of significant
              changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">
              15. Changes to Terms
            </h2>
            <p className="text-muted-foreground">
              We may update these Terms at any time. Your continued use of the
              Service after changes constitutes acceptance of the updated Terms.
              We will notify you of significant changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">16. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms are governed by and construed in accordance with the
              laws of the United States, without regard to its conflict of law
              principles. Any legal action or proceeding shall be brought
              exclusively in the courts located in the United States.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">17. Dispute Resolution</h2>
            <p className="text-muted-foreground mb-4">
              Any disputes arising from these Terms or the Service shall first
              be resolved through good-faith negotiation. If negotiation fails,
              disputes shall be resolved through binding arbitration in
              accordance with the rules of the American Arbitration Association.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">18. Severability</h2>
            <p className="text-muted-foreground">
              If any provision of these Terms is found to be unenforceable, such
              provision shall be modified to the minimum extent necessary to make
              it enforceable, and the remaining provisions shall continue in
              full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">19. Entire Agreement</h2>
            <p className="text-muted-foreground">
              These Terms, together with our Privacy Policy, constitute the
              entire agreement between you and conneclify regarding the Service
              and supersede all prior and contemporaneous agreements,
              understandings, and communications.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">20. Contact Information</h2>
            <p className="text-muted-foreground mb-4">
              If you have questions or concerns about these Terms, please
              contact us:
            </p>
            <div className="bg-card border border-border rounded-lg p-6 text-muted-foreground">
              <p className="font-semibold text-foreground mb-2">conneclify</p>
              <p>Email: contact@conneclify.com</p>
              <p>Website: https://conneclify.com</p>
            </div>
          </section>

          <div className="border-t border-border pt-8 mt-8">
            <p className="text-sm text-muted-foreground">
              &copy; 2026 conneclify. All rights reserved. | Hammad Soomro
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
