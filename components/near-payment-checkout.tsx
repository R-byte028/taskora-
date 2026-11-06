"use client";

import { useState } from "react";
import { CheckCircle2, Clock3, Loader2, Wallet } from "lucide-react";
import { NearConnector } from "@hot-labs/near-connect";
import { createClient } from "@/lib/supabase/client";

type Props = {
  token: string;
  recipient: string;
  amountAtomic: string;
};

export default function NearPaymentCheckout({ token, recipient, amountAtomic }: Props) {
  const [payer, setPayer] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"ready" | "submitted" | "pending" | "paid">("ready");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const connectAndPay = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const connector = new NearConnector({
        network: "testnet",
        features: { testnet: true, signAndSendTransaction: true },
        autoConnect: false,
        footerBranding: null,
      });

      // connect() opens the wallet selector; the wallet instance is retrieved separately.
      await connector.connect();
      const wallet = await connector.wallet();
      const accounts = await wallet.getAccounts();
      const accountId = accounts[0]?.accountId;
      if (!accountId) throw new Error("The connected wallet did not return an account.");
      setPayer(accountId);

      const outcome = await wallet.signAndSendTransaction({
        receiverId: recipient,
        actions: [{ type: "Transfer", params: { deposit: amountAtomic } }],
      });
      const hash = (outcome as any)?.transaction?.hash;
      if (hash) {
        setTransactionHash(hash);
        setState("submitted");
        setMessage("Wallet returned a transaction reference. Verify it below to confirm payment.");
      } else {
        setState("submitted");
        setMessage("The wallet may have completed through a redirect. Enter the transaction hash shown by your wallet, then verify it.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Wallet connection or payment was cancelled.");
    } finally {
      setBusy(false);
    }
  };

  const verifyPayment = async () => {
    if (!payer || !transactionHash.trim()) {
      setError("Connect your wallet and enter the transaction hash first.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const supabase = createClient();
      const { data, error: invokeError } = await supabase.functions.invoke("verify-near-payment", {
        body: { token, transactionHash: transactionHash.trim(), signerAccountId: payer },
      });
      if (invokeError) throw new Error(invokeError.message);
      if (data?.status === "paid") {
        setState("paid");
        setMessage("Payment independently verified on NEAR testnet.");
      } else if (data?.status === "pending") {
        setState("pending");
        setMessage(data.message ?? "The transaction is still awaiting finality. Try again shortly.");
      } else {
        throw new Error(data?.error ?? "The transaction could not be verified.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Payment verification failed.");
    } finally {
      setBusy(false);
    }
  };

  if (state === "paid") {
    return (
      <div className="client-notice" role="status">
        <CheckCircle2 size={19}/>
        <p><strong>Payment verified</strong><br/>{message}<br/><small>Transaction: {transactionHash}</small></p>
      </div>
    );
  }

  return (
    <section style={{ marginTop: 22, padding: 18, border: "1px solid #e4e7ec", borderRadius: 14, background: "#fbfcfe" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
        <Wallet size={18}/>
        <strong>Pay with NEAR testnet</strong>
      </div>
      <p style={{ fontSize: 13, color: "#667085", lineHeight: 1.6, margin: "0 0 14px" }}>
        Connect a NEAR-compatible wallet and approve the exact transfer shown in your wallet. This is a testnet transaction, not a real-money payment.
      </p>
      <div style={{ fontSize: 12, color: "#667085", overflowWrap: "anywhere", marginBottom: 12 }}>
        Receiving account: <strong>{recipient}</strong>
      </div>
      {!payer ? (
        <button type="button" className="primary" onClick={() => void connectAndPay()} disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
          {busy ? <><Loader2 size={15}/> Connecting…</> : <><Wallet size={15}/> Connect wallet & approve test payment</>}
        </button>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "#18794e", marginBottom: 10 }}>Connected payer: {payer}</div>
          <label htmlFor="near-transaction-hash" style={{ display: "block", fontSize: 12, marginBottom: 6 }}>NEAR transaction hash</label>
          <input id="near-transaction-hash" value={transactionHash} onChange={(event) => setTransactionHash(event.target.value)} placeholder="Paste transaction hash" style={{ width: "100%", padding: 12, border: "1px solid #d0d5dd", borderRadius: 9, marginBottom: 10 }}/>
          <button type="button" className="primary" onClick={() => void verifyPayment()} disabled={busy || !transactionHash.trim()} style={{ width: "100%", justifyContent: "center" }}>
            {busy ? <><Loader2 size={15}/> Verifying…</> : "Verify payment on NEAR"}
          </button>
          {state === "pending" && <p style={{ fontSize: 12, color: "#667085", display: "flex", gap: 6, alignItems: "center" }}><Clock3 size={14}/> {message}</p>}
        </>
      )}
      {message && state !== "pending" && <p role="status" style={{ fontSize: 13, color: "#18794e" }}>{message}</p>}
      {error && <p role="alert" style={{ fontSize: 13, color: "#b42318" }}>{error}</p>}
    </section>
  );
}
