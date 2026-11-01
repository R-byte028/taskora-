"use client";
import {useEffect,useState} from "react";
import {ArrowLeft,CheckCircle2,Clock3,LockKeyhole,Sparkles} from "lucide-react";

type RequestData={client:string;title:string;amount:number;note:string;ref:string};
const money=(n:number)=>new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(n);
export default function PaymentRequestPage(){
 const [data,setData]=useState<RequestData|null>(null);
 useEffect(()=>{const q=new URLSearchParams(window.location.search);const amount=Number(q.get("amount"));if(q.get("client")&&q.get("title")&&Number.isFinite(amount)&&amount>0){setData({client:q.get("client")||"",title:q.get("title")||"",amount,note:q.get("note")||"Work completed as agreed.",ref:q.get("ref")||"TASKORA-REQUEST"});}},[]);
 if(!data)return <main className="client-page"><div className="client-card"><div className="client-brand"><span className="mark">t.</span> taskora</div><h1>Payment request unavailable</h1><p>This link is incomplete or invalid. Please ask the service provider to send a fresh request link.</p><a className="back-link" href="/"><ArrowLeft size={15}/> Back to Taskora</a></div></main>;
 return <main className="client-page"><div className="client-card"><div className="client-brand"><span className="mark">t.</span> taskora</div><div className="request-badge"><Clock3 size={14}/> PAYMENT REQUEST</div><p className="client-greeting">Hello {data.client},</p><h1>You have a payment request.</h1><p className="client-intro">Here are the details submitted by your service provider.</p><div className="request-amount"><span>AMOUNT REQUESTED</span><strong>{money(data.amount)}</strong><small>NGN · Nigerian naira</small></div><div className="request-details"><div><span>Service / job</span><strong>{data.title}</strong></div><div><span>Request reference</span><strong>{data.ref}</strong></div><div><span>Work summary</span><strong>{data.note}</strong></div></div><div className="client-notice"><LockKeyhole size={17}/><p><strong>Payment is not enabled yet.</strong><br/>This is a Taskora demonstration request. No payment can be made from this page, and no funds will be collected.</p></div><button className="client-disabled" disabled><CheckCircle2 size={16}/> Payment options coming soon</button><p className="client-footer"><Sparkles size={13}/> Prepared with Taskora · Work done. Payments moving.</p></div></main>;
}
