import { FileText, AlertCircle, Scale, CreditCard, Ban } from 'lucide-react';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Terms & Conditions</h1>
              <p className="text-sm text-gray-500">Last Updated: January 18, 2025</p>
            </div>
          </div>
          <p className="text-gray-600">
            Please read these Terms and Conditions carefully before using ShopSmart.
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-8">
          
          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <div className="text-gray-700 space-y-3">
              <p>By accessing and using ShopSmart ("the Service"), you accept and agree to be bound by these Terms and Conditions.</p>
              <p>If you do not agree to these terms, please do not use our Service.</p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Service Description</h2>
            <div className="text-gray-700 space-y-3">
              <p>ShopSmart provides a cloud-based cloth shop management system that includes:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Inventory management for cloth varieties</li>
                <li>Sales tracking and reporting</li>
                <li>Supplier management</li>
                <li>Customer loan tracking</li>
                <li>Business analytics and insights</li>
                <li>Multi-user access (based on subscription plan)</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">3. Subscription Plans & Payment</h2>
            </div>
            <div className="text-gray-700 space-y-3">
              <p><strong>3.1 Free Trial:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>All new accounts receive a 7-day free trial</li>
                <li>No credit card required for trial</li>
                <li>Full access to selected plan features during trial</li>
              </ul>

              <p className="mt-4"><strong>3.2 Paid Subscriptions:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Basic Plan:</strong> PKR 2,999/month or PKR 29,990/year</li>
                <li><strong>Premium Plan:</strong> PKR 4,999/month or PKR 49,990/year</li>
                <li>Prices are in Pakistani Rupees (PKR)</li>
                <li>All prices are exclusive of applicable taxes</li>
              </ul>

              <p className="mt-4"><strong>3.3 Billing:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Subscriptions are billed in advance</li>
                <li>Monthly subscriptions renew automatically every 30 days</li>
                <li>Yearly subscriptions renew automatically every 365 days</li>
                <li>Payment is processed through PayFast payment gateway</li>
                <li>You authorize us to charge your payment method automatically</li>
              </ul>

              <p className="mt-4"><strong>3.4 Payment Methods:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>EasyPaisa</li>
                <li>JazzCash</li>
                <li>Credit/Debit Cards (Visa, Mastercard)</li>
                <li>Bank Transfer</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Account Responsibilities</h2>
            <div className="text-gray-700 space-y-3">
              <p>You are responsible for:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Ensuring the accuracy of information you provide</li>
                <li>Notifying us immediately of any unauthorized access</li>
                <li>Complying with all applicable laws and regulations</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Ban className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">5. Cancellation & Refunds</h2>
            </div>
            <div className="text-gray-700 space-y-3">
              <p><strong>5.1 Cancellation:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You can cancel your subscription at any time</li>
                <li>Cancellation takes effect at the end of current billing period</li>
                <li>You will retain access until the end of paid period</li>
                <li>No partial refunds for unused time</li>
              </ul>

              <p className="mt-4"><strong>5.2 Refund Policy:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Refunds are provided within 7 days of initial purchase only</li>
                <li>No refunds after 7 days from purchase date</li>
                <li>Refund requests must be made via email</li>
                <li>Refunds are processed within 5-7 business days</li>
                <li>Payment gateway fees are non-refundable</li>
              </ul>

              <p className="mt-4"><strong>5.3 Failed Payments:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>If payment fails, we will attempt to notify you</li>
                <li>Access may be suspended after 3 days of failed payment</li>
                <li>Account will be downgraded to free trial if payment fails for 7 days</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Data Ownership & Usage</h2>
            <div className="text-gray-700 space-y-3">
              <p><strong>6.1 Your Data:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You retain all rights to your business data</li>
                <li>We do not claim ownership of your data</li>
                <li>You can export your data at any time</li>
              </ul>

              <p className="mt-4"><strong>6.2 Data Backup:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>We perform regular automated backups</li>
                <li>Data is retained for 90 days after cancellation</li>
                <li>You are responsible for maintaining your own backups</li>
              </ul>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. Service Availability</h2>
            <div className="text-gray-700 space-y-3">
              <p>We strive to maintain 99.9% uptime, but we do not guarantee uninterrupted service:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Scheduled maintenance will be announced in advance</li>
                <li>We are not liable for downtime caused by third-party services</li>
                <li>Force majeure events are outside our control</li>
              </ul>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">8. Prohibited Activities</h2>
            <div className="text-gray-700 space-y-3">
              <p>You may not:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Use the Service for illegal purposes</li>
                <li>Share your account credentials with others</li>
                <li>Attempt to reverse engineer or hack the Service</li>
                <li>Upload malicious code or viruses</li>
                <li>Resell or redistribute the Service</li>
                <li>Use automated scripts to abuse the Service</li>
              </ul>
            </div>
          </section>

          {/* Section 9 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">9. Limitation of Liability</h2>
            </div>
            <div className="text-gray-700 space-y-3">
              <p>To the maximum extent permitted by law:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>We are not liable for indirect, incidental, or consequential damages</li>
                <li>Our total liability is limited to the amount you paid in the last 12 months</li>
                <li>We are not responsible for business losses or data loss</li>
                <li>You use the Service at your own risk</li>
              </ul>
            </div>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">10. Intellectual Property</h2>
            <div className="text-gray-700 space-y-3">
              <p>All intellectual property rights in the Service belong to us, including:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Software code and architecture</li>
                <li>Design, graphics, and user interface</li>
                <li>Logos, trademarks, and branding</li>
                <li>Documentation and training materials</li>
              </ul>
            </div>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">11. Modifications to Service</h2>
            <div className="text-gray-700 space-y-3">
              <p>We reserve the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Modify or discontinue features</li>
                <li>Update pricing with 30 days notice</li>
                <li>Change these Terms with notice to users</li>
              </ul>
            </div>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">12. Governing Law</h2>
            <div className="text-gray-700">
              <p>These Terms are governed by the laws of Pakistan. Any disputes will be resolved in the courts of Lahore, Pakistan.</p>
            </div>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">13. Termination</h2>
            <div className="text-gray-700 space-y-3">
              <p>We may terminate or suspend your account if:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You violate these Terms</li>
                <li>Payment is not received</li>
                <li>We discontinue the Service</li>
              </ul>
            </div>
          </section>

          {/* Contact Section */}
          <section className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">14. Contact Information</h2>
            </div>
            <div className="text-gray-700 space-y-2">
              <p>For questions about these Terms and Conditions:</p>
              <div className="mt-4 space-y-1">
                <p><strong>Business Name:</strong> ShopSmart</p>
                <p><strong>Email:</strong> igntayyab@gmail.com</p>
                <p><strong>Phone:</strong> +92 340 4328229</p>
                <p><strong>Address:</strong> Lahore, Punjab, Pakistan</p>
              </div>
            </div>
          </section>

        </div>

        {/* Acceptance Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900 text-center">
            By using ShopSmart, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>© 2025 ShopSmart. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}