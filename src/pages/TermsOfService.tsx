import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function TermsOfService() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-32 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12 space-y-3 animate-fade-in">
            <div className="inline-block">
              <span className="text-sm font-bebas uppercase tracking-widest text-primary border border-primary/30 px-6 py-2 rounded-full">
                Legal
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bebas uppercase tracking-wider text-foreground">
              Terms of <span className="text-primary">Service</span>
            </h1>
          </div>

          <div className="prose prose-lg max-w-none space-y-8 text-foreground">
            <section>
              <h2 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">Agreement to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using the RISE Football Agency website and services, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not access our services.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">Services</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                RISE Football Agency provides:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Professional football player representation</li>
                <li>Performance optimization and training programs</li>
                <li>Career development and management services</li>
                <li>Club and scout networking opportunities</li>
                <li>Coaching and tactical analysis resources</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-6">
                All services are conducted in accordance with the regulatory frameworks established by FIFA and UEFA. Our processes adhere to the standards required for player representation, ensuring compliance with governance requirements and maintaining the integrity of football operations.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">Eligibility</h2>
              <p className="text-muted-foreground leading-relaxed">
                You must be at least 16 years of age to use our services. By using our services, you represent and warrant that you meet this age requirement and have the legal capacity to enter into these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">User Accounts</h2>
              <p className="text-muted-foreground leading-relaxed">
                When you create an account with us, you must provide accurate, complete, and current information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">Representation Agreement</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our representation services are subject to a separate written agreement. These Terms of Service govern your use of our website and general services, while a formal representation contract will outline the specific terms of our agency relationship.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                All content on our website, including text, graphics, logos, images, and software, is the property of RISE Football Agency and protected by copyright and intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">User Conduct</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Use our services for any unlawful purpose</li>
                <li>Impersonate any person or entity</li>
                <li>Interfere with or disrupt our services</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Upload malicious code or engage in harmful activities</li>
                <li>Harass, abuse, or harm other users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">Content Submission</h2>
              <p className="text-muted-foreground leading-relaxed">
                By submitting content to our platform (including performance data, videos, or personal information), you grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, and distribute that content for the purpose of providing our services.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">Privacy and Data Protection</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your use of our services is also governed by our Privacy Policy. We are committed to protecting your personal data in accordance with applicable data protection laws, including GDPR.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">Fees and Payment</h2>
              <p className="text-muted-foreground leading-relaxed">
                Certain services may require payment. All fees are outlined in separate agreements. You agree to provide accurate billing information and authorize us to charge the specified fees.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate your access to our services at any time, with or without cause, with or without notice. Upon termination, your right to use our services will immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">Disclaimer of Warranties</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our services are provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that our services will be uninterrupted, secure, or error-free.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the maximum extent permitted by law, RISE Football Agency shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">Indemnification</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to indemnify and hold harmless RISE Football Agency from any claims, damages, losses, liabilities, and expenses arising from your use of our services or violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of England and Wales. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the updated Terms on our website. Your continued use of our services after such modifications constitutes your acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">Severability</h2>
              <p className="text-muted-foreground leading-relaxed">
                If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-bebas uppercase tracking-wider text-foreground mb-4">Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="mt-4 space-y-2 text-muted-foreground">
                <p>Email: <a href="mailto:jolon.levene@risefootballagency.com" className="text-primary hover:underline">jolon.levene@risefootballagency.com</a></p>
                <p>WhatsApp: <a href="http://wa.link/mabnsw" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Contact via WhatsApp</a></p>
              </div>
            </section>

            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Last Updated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
