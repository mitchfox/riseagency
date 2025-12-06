import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, CreditCard, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface BankDetail {
  id: string;
  title: string;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  sort_code: string | null;
  iban: string | null;
  swift_bic: string | null;
  paypal_email: string | null;
  payment_type: 'bank_transfer' | 'paypal' | 'card' | 'other';
  notes: string | null;
  is_default: boolean;
}

export const PaymentOptions = () => {
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    const { data, error } = await supabase
      .from('bank_details')
      .select('*')
      .order('is_default', { ascending: false });

    if (!error) {
      setBankDetails((data || []) as BankDetail[]);
    }
    setLoading(false);
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyButton = ({ value, fieldName }: { value: string; fieldName: string }) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 ml-2"
      onClick={() => copyToClipboard(value, fieldName)}
    >
      {copiedField === fieldName ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );

  if (loading) {
    return <div className="text-center py-8">Loading payment options...</div>;
  }

  if (bankDetails.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Payment details not yet configured. Please contact us for payment information.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Payment Options</h3>
        <p className="text-sm text-muted-foreground">
          Choose your preferred payment method below. For international transfers, please use IBAN and SWIFT/BIC codes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {bankDetails.map((bank) => (
          <Card key={bank.id} className={bank.is_default ? 'border-primary border-2' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {bank.payment_type === 'bank_transfer' && <Building2 className="h-5 w-5 text-blue-500" />}
                {bank.payment_type === 'paypal' && <CreditCard className="h-5 w-5 text-yellow-600" />}
                {bank.payment_type === 'card' && <CreditCard className="h-5 w-5 text-purple-500" />}
                {bank.title}
                {bank.is_default && (
                  <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    Recommended
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {bank.payment_type === 'bank_transfer' && (
                <>
                  {bank.bank_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Bank</span>
                      <span className="font-medium">{bank.bank_name}</span>
                    </div>
                  )}
                  {bank.account_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Account Name</span>
                      <div className="flex items-center">
                        <span className="font-medium">{bank.account_name}</span>
                        <CopyButton value={bank.account_name} fieldName={`${bank.id}-account_name`} />
                      </div>
                    </div>
                  )}
                  
                  {/* UK Bank Details */}
                  {bank.account_number && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Account Number</span>
                      <div className="flex items-center">
                        <span className="font-mono font-medium">{bank.account_number}</span>
                        <CopyButton value={bank.account_number} fieldName={`${bank.id}-account_number`} />
                      </div>
                    </div>
                  )}
                  {bank.sort_code && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Sort Code</span>
                      <div className="flex items-center">
                        <span className="font-mono font-medium">{bank.sort_code}</span>
                        <CopyButton value={bank.sort_code} fieldName={`${bank.id}-sort_code`} />
                      </div>
                    </div>
                  )}

                  {/* International Bank Details */}
                  {bank.iban && (
                    <div className="pt-2 border-t">
                      <div className="text-xs text-muted-foreground mb-1">International Transfers</div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">IBAN</span>
                        <div className="flex items-center">
                          <span className="font-mono font-medium text-xs">{bank.iban}</span>
                          <CopyButton value={bank.iban} fieldName={`${bank.id}-iban`} />
                        </div>
                      </div>
                    </div>
                  )}
                  {bank.swift_bic && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">SWIFT/BIC</span>
                      <div className="flex items-center">
                        <span className="font-mono font-medium">{bank.swift_bic}</span>
                        <CopyButton value={bank.swift_bic} fieldName={`${bank.id}-swift`} />
                      </div>
                    </div>
                  )}
                </>
              )}

              {bank.payment_type === 'paypal' && bank.paypal_email && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">PayPal Email</span>
                    <div className="flex items-center">
                      <span className="font-medium">{bank.paypal_email}</span>
                      <CopyButton value={bank.paypal_email} fieldName={`${bank.id}-paypal`} />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(`https://paypal.me/${bank.paypal_email?.split('@')[0]}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Pay with PayPal
                  </Button>
                </div>
              )}

              {bank.notes && (
                <div className="pt-2 border-t text-xs text-muted-foreground italic">
                  {bank.notes}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center text-xs text-muted-foreground mt-4">
        <p>Please include your name and invoice number as the payment reference.</p>
        <p className="mt-1">Contact us if you need assistance with your payment.</p>
      </div>
    </div>
  );
};

export default PaymentOptions;
