import { Shield, Lock, Eye, Database, Mail } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
              <p className="text-sm text-gray-500">Last Updated: January 18, 2025</p>
            </div>
          </div>
          <p className="text-gray-600">
            ShopSmart is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information.
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-8">
          
          {/* Section 1 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">1. Information We Collect</h2>
            </div>
            <div className="space-y-3 text-gray-700">
              <p><strong>Personal Information:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Business name and owner details</li>
                <li>Email address and phone number</li>
                <li>Business address and location</li>
                <li>Payment information (processed securely via PayFast)</li>
              </ul>
              
              <p className="mt-4"><strong>Usage Data:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Inventory and sales data entered by you</li>
                <li>Application usage patterns and analytics</li>
                <li>Device information and IP address</li>
                <li>Browser type and operating system</li>
              </ul>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">2. How We Use Your Information</h2>
            </div>
            <div className="space-y-3 text-gray-700">
              <p>We use your information to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide and maintain our SaaS application</li>
                <li>Process your subscription payments</li>
                <li>Send important updates and notifications</li>
                <li>Improve our services and user experience</li>
                <li>Provide customer support</li>
                <li>Detect and prevent fraud or security issues</li>
                <li>Comply with legal obligations</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">3. Data Security</h2>
            </div>
            <div className="space-y-3 text-gray-700">
              <p>We implement industry-standard security measures to protect your data:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>End-to-end encryption for sensitive data</li>
                <li>Secure HTTPS connections</li>
                <li>Regular security audits and updates</li>
                <li>Multi-tenant data isolation</li>
                <li>Secure payment processing through PayFast (PCI DSS compliant)</li>
                <li>Regular backups and disaster recovery procedures</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Data Sharing</h2>
            <div className="space-y-3 text-gray-700">
              <p>We <strong>DO NOT</strong> sell your personal information to third parties.</p>
              <p>We may share your data with:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Payment Processors:</strong> PayFast for processing subscription payments</li>
                <li><strong>Service Providers:</strong> Hosting and infrastructure providers</li>
                <li><strong>Legal Compliance:</strong> When required by law or to protect our rights</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Your Rights</h2>
            <div className="space-y-3 text-gray-700">
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
                <li><strong>Deletion:</strong> Request deletion of your data (subject to legal requirements)</li>
                <li><strong>Data Portability:</strong> Export your data in a standard format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Cookies and Tracking</h2>
            <div className="space-y-3 text-gray-700">
              <p>We use cookies and similar technologies to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Maintain your login session</li>
                <li>Remember your preferences</li>
                <li>Analyze usage patterns</li>
                <li>Improve application performance</li>
              </ul>
              <p className="mt-3">You can control cookies through your browser settings.</p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. Data Retention</h2>
            <div className="space-y-3 text-gray-700">
              <p>We retain your data:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>For the duration of your active subscription</li>
                <li>Up to 90 days after subscription cancellation (for account recovery)</li>
                <li>As required by law for tax and accounting purposes</li>
              </ul>
              <p className="mt-3">You can request immediate data deletion by contacting us.</p>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">8. Children's Privacy</h2>
            <div className="text-gray-700">
              <p>Our service is not intended for users under 18 years of age. We do not knowingly collect personal information from children.</p>
            </div>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">9. Changes to Privacy Policy</h2>
            <div className="text-gray-700">
              <p>We may update this Privacy Policy from time to time. We will notify you of any material changes via email or through the application.</p>
            </div>
          </section>

          {/* Contact Section */}
          <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">10. Contact Us</h2>
            </div>
            <div className="text-gray-700 space-y-2">
              <p>If you have any questions about this Privacy Policy, please contact us:</p>
              <div className="mt-4 space-y-1">
                <p><strong>Email:</strong> igntayyab@gmail.com</p>
                <p><strong>Phone:</strong> +92 340 4328229</p>
                <p><strong>Address:</strong> Lahore, Punjab, Pakistan</p>
              </div>
            </div>
          </section>

        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>© 2025 ShopSmart. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}