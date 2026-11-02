import Link from "next/link";
import { ArrowLeft, Clock3, LockKeyhole, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

const money = (amount: number, currency: string) => {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: currency === "USDC" ? 2 : 0,
    maximumFractionDigits: currency === "USDC" ? 2 : 4,
  }).format(amount);
  if (currency === "USDC") return "$" + formatted + " USDC";
  if (currency === "NEAR") return formatted + " NEAR";
  return "Unsupported payment asset";
};

export default async function PublicPaymentRequestPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_payment_request", {
    p_token: token,
  });
  const request = !error ? data?.[0] : undefined;

  if (!request) {
    return (
      <main className="client-page">
        <div className="client-card">
          <div className="client-brand"><span className="mark">t.</span> taskora</div>
          <h1>Payment request unavailable</h1>
          <p>This link may be invalid, expired or revoked. Please ask the service provider for a new link.</p>
          <Link className="back-link" href="/login"><ArrowLeft size={15} /> Taskora workspace</Link>
        </div>
      </main>
    );
  }

  const expiry = new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(request.expires_at));

  return (
    <main className="client-page">
      <div className="client-card">
        <div className="client-brand"><span className="mark">t.</span> taskora</div>
        <div className="request-badge"><Clock3 size={14} /> PAYMENT REQUEST</div>
        <p className="client-greeting">Hello {request.client_name},</p>
        <h1>You have a payment request.</h1>
        <p className="client-intro">
          {request.provider_name} has shared the details of completed work with you.
        </p>
        <div className="request-amount">
          <span>AMOUNT REQUESTED</span>
          <strong>{money(Number(request.amount), request.currency)}</strong>
          <small>{request.currency} · Requested amount</small>
        </div>
        <div className="request-details">
          <div><span>Service / job</span><strong>{request.job_title}</strong></div>
          <div><span>Request reference</span><strong>{request.request_reference}</strong></div>
          <div><span>Work summary</span><strong>{request.work_summary}</strong></div>
        </div>
        <div className="client-notice">
          <LockKeyhole size={17} />
          <p>
            <strong>Secure request link.</strong><br />
            This link is private to whoever has it and expires on {expiry}. Wallet payment collection and on-chain verification are not enabled yet, so no funds can be sent through this page.
          </p>
        </div>
        <div className="client-disabled" aria-disabled="true">
          <Clock3 size={16} /> Crypto wallet payment options are coming next
        </div>
        <p className="client-footer"><Sparkles size={13} /> Prepared with Taskora · Work done. Payments moving.</p>
      </div>
    </main>
  );
}
