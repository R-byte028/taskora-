"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Copy, ExternalLink, Loader2, Wallet } from "lucide-react";
import { NearConnector } from "@hot-labs/near-connect";
import { createClient } from "@/lib/supabase/client";

export default function NearWalletPage() {
  const connectorRef = useRef<NearConnector | null>(null);
  const [accountId, setAccountId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const connector = new NearConnector({
      network: "testnet",
      features: { testnet: true },
      autoConnect: false,
      footerBranding: null,
    });
    connectorRef.current = connector;

    const handleSignIn = async (event: { accounts: Array<{ accountId: string }> }) => {
      const account = event.accounts?.[0]?.accountId;
      if (!account) return;
      setBusy(true);
      setError("");
      try {
        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error("Please sign in to your Taskora account first.");
        const db = supabase as any;
        const { error: saveError } = await db.from("profiles")
          .update({ near_account_id: account, near_network: "testnet" })
          .eq("id", auth.user.id);
        if (saveError) throw saveError;
        setAccountId(account);
        setMessage("Your public NEAR testnet account is connected to Taskora.");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Couldn't save the connected wallet.");
      } finally {
        setBusy(false);
      }
    };

    const handleSignOut = async () => {
      setAccountId("");
      try {
        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        if (auth.user) {
          const db = supabase as any;
          await db.from("profiles").update({ near_account_id: null, near_network: null }).eq("id", auth.user.id);
        }
      } catch {
        // The wallet is disconnected locally even if profile sync needs a retry.
      }
    };

    connector.on("wallet:signIn", handleSignIn);
    connector.on("wallet:signOut", handleSignOut);

    let mounted = true;
    void (async () => {
      try {
        await connector.whenManifestLoaded;
        if (!mounted) return;
        // The documented connector API exposes the active wallet through wallet().
        const wallet = await connector.wallet();
        const accounts = await wallet.getAccounts();
        if (mounted && accounts[0]?.accountId) {
          await handleSignIn({ accounts });
        }
      } catch {
        // No existing wallet session is a normal first-visit state.
      }
    })();

    return () => {
      mounted = false;
      connector.off("wallet:signIn", handleSignIn);
      connector.off("wallet:signOut", handleSignOut);
    };
  }, []);

  const connect = async () => {
    if (!connectorRef.current) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await connectorRef.current.connect();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Wallet connection was cancelled or failed.");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!connectorRef.current) return;
    setBusy(true);
    setError("");
    try {
      await connectorRef.current.disconnect();
      setAccountId("");
      setMessage("Wallet disconnected from Taskora.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't disconnect the wallet.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="client-page">
      <section className="client-card" style={{ maxWidth: 560 }}>
        <div className="client-brand"><span className="mark">t.</span> taskora</div>
        <Link href="/" className="back-link"><ArrowLeft size={15}/> Back to workspace</Link>
        <div className="request-badge"><Wallet size={14}/> NEAR WALLET</div>
        <h1>Connect your receiving wallet.</h1>
        <p className="client-intro">
          Connect an existing NEAR-compatible wallet on testnet. Taskora stores only your public account ID, never your recovery phrase or private keys.
        </p>
        <div className="request-details">
          <div><span>Network</span><strong>NEAR Testnet</strong></div>
          <div><span>Purpose</span><strong>Receive native NEAR test payments</strong></div>
          <div><span>Wallet status</span><strong>{accountId ? "Connected" : "Not connected"}</strong></div>
        </div>
        {accountId ? (
          <div className="client-notice">
            <CheckCircle2 size={18}/>
            <div style={{ minWidth: 0 }}>
              <strong>Wallet connected</strong>
              <p style={{ overflowWrap: "anywhere", margin: "6px 0 0" }}>{accountId}</p>
              <button type="button" className="back-link" onClick={() => void navigator.clipboard.writeText(accountId)}><Copy size={13}/> Copy account ID</button>
            </div>
          </div>
        ) : (
          <div className="client-notice">
            <Wallet size={18}/>
            <p><strong>Testnet only.</strong><br/>This connection does not move funds. Wallet approvals will always be requested separately for each payment.</p>
          </div>
        )}
        {error && <p role="alert" style={{ color: "#b42318", fontSize: 14 }}>{error}</p>}
        {message && <p role="status" style={{ color: "#18794e", fontSize: 14 }}>{message}</p>}
        <button
          type="button"
          onClick={() => void (accountId ? disconnect() : connect())}
          disabled={busy}
          className="primary"
          style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
        >
          {busy ? <><Loader2 size={16} className="animate-spin"/> Please wait…</> : accountId ? "Disconnect wallet" : <><Wallet size={16}/> Connect NEAR wallet</>}
        </button>
        <p className="client-footer"><ExternalLink size={13}/> Testnet integration · Mainnet and USDC checkout are disabled.</p>
      </section>
    </main>
  );
}
