import { useState, useMemo, useEffect, useCallback, createContext, useContext } from "react";
import * as api from "./api";
import { generateReportPDF } from "./pdfGenerator";

/* ═══ BRAND ═══ */
const C = {
  /* Exact CHD brand palette */
  navy:"#06262d",navyMid:"#0b3540",navyLight:"#134450",
  gold:"#b97231",goldHover:"#9d601c",goldSoft:"rgba(185,114,49,0.10)",goldGlow:"rgba(185,114,49,0.20)",
  bronzeLight:"#c5a485",
  white:"#fff",offWhite:"#f7f8fa",
  g100:"#f2f4f6",g200:"#e3e7eb",g300:"#cdd1d8",g500:"#6b7280",g700:"#374151",g900:"#111827",
  red:"#b42318",green:"#1a7f37",
  violet:"#35506a",violetSoft:"rgba(53,80,106,0.10)",
};
const serif = "Calibri, Arial, sans-serif";
const sans  = "Calibri, Arial, sans-serif";

const STAFF_TIERS = new Set(["admin","director","analyst","intern"]);
const TIER_ORDER = { free: 0, registered: 1, premium: 2 };
const TIER_LABELS = {
  free: "Public Access",
  registered: "Member Access",
  premium: "Premium Access",
  admin: "Administrator",
  director: "Director",
  analyst: "Analyst",
  intern: "Intern",
};
const tierLabel = tier => TIER_LABELS[tier] || tier || "Public";
const CATEGORY_ACCESS_DEFAULTS = {
  macro: "free",
  daily: "free",
  equities: "registered",
  "company-updates": "premium",
  "sector-report": "premium",
  "fixed-income": "registered",
  outlook: "premium",
};
const DEFAULT_BANNER_MEDIA = [
  {mediaUrl:"https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",mediaPosition:"center center",layout:"right",duration:10},
  {mediaUrl:"https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",mediaPosition:"center center",layout:"left",duration:10},
  {mediaUrl:"https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",mediaPosition:"center center",layout:"right",duration:10},
  {mediaUrl:"https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",mediaPosition:"center center",layout:"left",duration:10},
];

/* ═══ DATA CONTEXT ═══ */
const DataCtx = createContext(null);
const useData = () => useContext(DataCtx);

/* ═══ LOCAL PHOTO HELPER ═══ */
/* Returns an object-URL for a File, or cleans up the old one */
function usePhotoPreview(file) {
  const [url,setUrl]=useState(null);
  useEffect(()=>{
    if(!file){setUrl(null);return;}
    const u=URL.createObjectURL(file);
    setUrl(u);
    return()=>URL.revokeObjectURL(u);
  },[file]);
  return url;
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

/* ═══ INITIAL DATA ═══ */
const INIT_ANALYSTS = [
  {id:1,role:"director",name:"Tajudeen Ibrahim",ini:"TI",title:"Director, Research",cov:"Macro Strategy, Banking, Financial Services",email:"tiibrahim@chapelhilldenham.com",supervisorId:null,photo:"/analysts/taj.jpg",bio:"Tajudeen leads the research team at Chapel Hill Denham, overseeing all equity, fixed income, and macroeconomic research output. With over 15 years of experience in Nigerian capital markets, he brings deep insight to macroeconomic analysis and strategic investment positioning."},
  {id:6,role:"analyst",name:"Nabila Mohammed",ini:"NM",title:"Research Analyst",cov:"Banking, Financial Services",email:"nmohammed@chapelhilldenham.com",supervisorId:null,photo:null,bio:"Nabila covers the Nigerian banking sector, providing research coverage on tier-1 and tier-2 banks with a focus on earnings quality, capital adequacy, and credit risk."},
  {id:4,role:"analyst",name:"Bolade Agboola",ini:"BA",title:"Research Analyst",cov:"Oil & Gas, Energy",email:"bagboola@chapelhilldenham.com",supervisorId:null,photo:"/analysts/bolade.jpg",bio:"Bolade covers the Nigerian oil & gas and energy sector across West Africa, tracking upstream production, refining margins, and downstream distribution dynamics."},
  {id:2,role:"analyst",name:"Boluwatife Ishola",ini:"BI",title:"Research Analyst",cov:"Consumer Goods, Industrials",email:"bishola@chapelhilldenham.com",supervisorId:null,photo:"/analysts/boluwatife.jpg",bio:"Boluwatife covers equity research with a focus on consumer goods and industrials, tracking volume trends, pricing power, and margin dynamics across the sector."},
  {id:3,role:"analyst",name:"Gideon Oshadumi",ini:"GO",title:"Research Analyst",cov:"Cement, Building Materials",email:"goshadumi@chapelhilldenham.com",supervisorId:null,photo:"/analysts/gideon.jpg",bio:"Gideon covers the cement and building materials sector, providing granular analysis of capacity utilisation, energy costs, and regional demand trends."},
  {id:5,role:"intern",name:"Oluwabukunmi Onasanya",ini:"OO",title:"Research Intern",cov:"Telecommunications, Technology",email:"oonasanya@chapelhilldenham.com",supervisorId:1,photo:null,bio:"Oluwabukunmi supports coverage of the telecommunications and technology sector."},
  /* Intern — demo only, not shown on public analyst page */
  {id:7,role:"intern",name:"Research Intern",ini:"RI",title:"Research Intern",cov:"Research Support",email:"intern@chapelhilldenham.com",supervisorId:1,photo:null,bio:"Research intern supporting the team with data analysis, report drafting, and market monitoring."},
  {id:8,role:"analyst",name:"Research Desk",ini:"RD",title:"Central Research Desk",cov:"Desk support, intern review, market synthesis, and report coordination",email:"researchdesk@chapelhilldenham.com",supervisorId:null,photo:null,bio:"The central research desk supports intern review, synthesis, and publishing coordination across the portal."},
];
const CATS = [
  {id:"macro",name:"Macroeconomic Updates",icon:"📊",p:null},
  {id:"equities",name:"Equities",icon:"📈",p:null},
  {id:"company-updates",name:"Company Updates",icon:"📈",p:"equities"},
  {id:"sector-report",name:"Sector Report",icon:"📈",p:"equities"},
  {id:"fixed-income",name:"Fixed Income",icon:"🏛️",p:null},
  {id:"outlook",name:"Outlook Report",icon:"🔭",p:null},
  {id:"daily",name:"Daily Report",icon:"📋",p:null},
];
const INIT_REPORTS = [
  {id:1,status:"published",title:"Dangote Cement — Q1 2026 Earnings Preview",ex:"We preview Dangote Cement's Q1 results, expecting revenue growth of 18% YoY driven by robust demand across West Africa and improved pricing power. EBITDA margins set to expand 200bps to 42%. BUY, TP ₦485.",cat:"company-updates",aid:3,date:"2026-03-28",access:"premium",body:"Revenue is expected to reach ₦1.2 trillion in Q1 2026, up from ₦1.02 trillion in Q1 2025. The key driver is volume growth across Nigerian and Pan-African operations, with the Obajana and Ibese plants operating at near-full capacity.\n\nCement prices have remained firm at ₦7,500-8,000 per bag in most markets, providing strong pricing support. We note that the company has successfully passed through cost increases to consumers without material demand destruction.\n\nOperating costs have benefited from the switch to CNG at the Obajana plant, reducing energy costs by approximately 35% compared to AGO. This structural cost advantage is not yet fully reflected in market expectations.\n\nWe forecast net profit of ₦180 billion for Q1 2026, representing 22% YoY growth. At the current price, the stock trades at 8.2x forward P/E, a discount to the 5-year average of 10.5x."},
  {id:2,status:"published",title:"Nigeria Inflation — March 2026 Review",ex:"Headline inflation moderated to 29.8% in March from 31.2%, driven by base effects and improved FX supply. We review the implications for monetary policy and fixed income positioning.",cat:"macro",aid:1,date:"2026-03-26",access:"free",body:"The National Bureau of Statistics reported that headline inflation declined to 29.8% in March 2026, the fourth consecutive month of moderation from the cycle peak of 34.8% in June 2025.\n\nFood inflation, the dominant driver, fell to 31.2% from 33.1% as improved FX allocation eased import costs. Core inflation at 24.1% remains elevated, reflecting sticky services prices.\n\nWe expect the CBN to hold rates at its next MPC meeting given the still-elevated inflation trajectory, though the tone may shift toward easing by H2 2026."},
  {id:3,status:"published",title:"Daily Market Wrap — 25 March 2026",ex:"The NGX ASI gained 0.67% to close at 108,432 points. Banking stocks led gains with GTCO up 2.1%. Market breadth positive at 28 advances to 14 declines.",cat:"daily",aid:null,date:"2026-03-25",access:"free"},
  {id:4,status:"published",title:"NGX Model Portfolio Update — Q2 2026",ex:"We rebalance our model portfolio ahead of Q2, increasing exposure to banking and consumer goods while trimming energy. Net changes reflect our updated macro outlook.",cat:"sector-report",aid:1,date:"2026-03-22",access:"premium",body:"Our Q2 2026 model portfolio rebalancing reflects our view that the macro inflection is now underway. We increase banking to 28% (from 22%) and consumer goods to 18% (from 14%)."},
  {id:5,status:"published",title:"FGN Bond Auction Review — March 2026",ex:"The DMO offered ₦450bn across three tenors. Stop rates declined across the curve, signalling improving investor appetite for duration amid moderating inflation.",cat:"fixed-income",aid:1,date:"2026-03-20",access:"registered"},
  {id:6,status:"published",title:"Nigerian Banking Sector — 2026 Outlook",ex:"We update our banking sector coverage with revised earnings estimates post-recapitalisation. Our top picks remain GTCO and Zenith on valuation and capital strength.",cat:"sector-report",aid:6,date:"2026-03-18",access:"premium",body:"The recapitalisation exercise has fundamentally reshaped the Nigerian banking landscape. We estimate total new capital raised at ₦2.1 trillion across the sector, with tier-1 banks comfortably exceeding minimum thresholds.\n\nWe revise our sector earnings estimates upward by 12% on average, reflecting higher capital bases, improved NIMs, and reduced provision charges as legacy NPLs are resolved."},
  {id:7,status:"published",title:"Nigeria 2026 Full-Year Outlook",ex:"Our comprehensive 2026 outlook covers the macroeconomic landscape, equity market strategy, and fixed income positioning across all asset classes.",cat:"outlook",aid:1,date:"2026-01-10",access:"registered"},
  {id:8,status:"published",title:"Research Desk — Macro to Market Dashboard",ex:"The research desk synthesises macro inputs, analyst colour, and client feedback into a short dashboard view of what changed this week.",cat:"macro",aid:8,date:"2026-04-14",access:"inherit",body:"This desk entry is maintained by the central research desk as an internal synthesis layer. It combines analyst drafts, intern submissions, and market context into a single customer-facing summary.\n\nUse this page when you need a quick desk view rather than a full analyst report."},
  {id:9,status:"published",title:"Consumer Goods — Price Pass-Through Tracker",ex:"We track pricing power across major consumer names, highlighting where cost inflation is being pushed into shelf prices.",cat:"sector-report",aid:8,date:"2026-04-12",access:"inherit",body:"The desk tracker shows that selected consumer names have begun to recover margin through incremental price increases. Volume resilience remains uneven, but premium brands are holding up better than mass-market lines."},
  {id:10,status:"published",title:"Market Opening Summary — April 2026",ex:"A compact morning brief assembled by the desk, combining overnight headlines, FX moves, and the most important analyst asks.",cat:"daily",aid:8,date:"2026-04-11",access:"inherit",body:"The morning brief is intentionally short and operational. It is designed for customers who want a quick read before opening their dashboards or checking their library."},
  {id:11,status:"published",title:"Equity Strategy — Portfolio Entry Points",ex:"A client-friendly equity note explaining when to add exposure, what to watch, and which names the desk prefers under current conditions.",cat:"equities",aid:8,date:"2026-04-08",access:"inherit",body:"This report is framed for client discussions and account manager follow-up. It is not a deep-dive valuation note, but a practical guide to entry points and positioning."},
  {id:12,status:"published",title:"Fixed Income Laddering Guide — Q2 2026",ex:"A desk guide for customers who want a simpler way to think about duration, reinvestment, and monthly cash flow.",cat:"fixed-income",aid:8,date:"2026-04-05",access:"inherit",body:"The guide explains laddering across short, medium, and long tenors and how different client profiles can use the structure to match liquidity needs."},
  {id:14,status:"published",title:"Banking Sector Pulse - Deposit Costs and NIMs",ex:"We review funding cost pressure across tier-1 banks and highlight where net interest margins remain best protected in Q2 2026.",cat:"sector-report",aid:6,date:"2026-04-22",access:"premium",body:"Deposit repricing remains the main watch item for bank earnings. Tier-1 banks with stronger CASA franchises should protect margins better than peers, while smaller banks may see faster pressure from wholesale deposits."},
  {id:15,status:"published",title:"Oil and Gas Monitor - Downstream Margins",ex:"A short review of downstream pricing, inventory replacement cost, and working-capital pressure across covered energy names.",cat:"sector-report",aid:4,date:"2026-04-21",access:"registered",body:"Downstream operators continue to balance margin recovery with volume retention. The key swing factors are FX availability, landing cost movement, and the ability to reprice inventory without slowing demand."},
  {id:16,status:"published",title:"Consumer Goods Tracker - Volume Recovery Watch",ex:"We assess early signs of volume recovery across staples, beverages, and household products after a difficult inflation cycle.",cat:"company-updates",aid:2,date:"2026-04-19",access:"premium",body:"Consumer names are showing mixed volume trends. Premium categories remain resilient, while mass-market products are still exposed to weak disposable income and tighter retail inventory cycles."},
  {id:17,status:"published",title:"Cement Dispatches - Regional Demand Checks",ex:"Field checks point to firmer demand in Lagos, Abuja, and select northern markets as construction activity improves.",cat:"company-updates",aid:3,date:"2026-04-18",access:"registered",body:"Our channel checks suggest regional demand has improved from Q1 levels. We continue to monitor energy cost, logistics availability, and the timing of further price adjustments."},
  {id:18,status:"published",title:"Treasury Bills Strategy - Reinvestment Notes",ex:"We outline reinvestment options for clients facing near-term maturities and compare bill yields with short bond alternatives.",cat:"fixed-income",aid:1,date:"2026-04-17",access:"registered",body:"Clients with near-term maturities should compare rollover yields against selected short bonds. The decision depends on liquidity needs, duration comfort, and expectations for policy-rate stability."},
  {id:19,status:"published",title:"Daily Market Wrap - 24 April 2026",ex:"The NGX closed modestly higher as banking and industrial names offset weakness in selected consumer counters.",cat:"daily",aid:8,date:"2026-04-24",access:"free",body:"Market breadth was mixed, but turnover improved across large-cap banking names. Fixed income trading remained selective as investors waited for clearer rate direction."},
  {id:20,status:"published",title:"Macro Note - FX Liquidity and Import Cover",ex:"We discuss recent FX liquidity signals and what they imply for inflation expectations, imports, and investor sentiment.",cat:"macro",aid:1,date:"2026-04-23",access:"free",body:"Improved FX liquidity is important for inflation expectations and business confidence. We remain cautious on the pace of disinflation, but recent market signals suggest pressure may ease further if supply remains consistent."},
  /* Demo: intern-submitted report awaiting approval */
  {id:13,status:"pending",title:"Cement Sector Flash — Price Hikes Q2 2026",ex:"Cement prices across major markets have increased 12-15% in April, driven by supply tightness ahead of the construction season. We examine the implications for sector margins.",cat:"company-updates",aid:7,date:"2026-04-10",access:"registered",supervisorId:1,body:"Preliminary field checks indicate cement prices have risen to ₦8,800-9,200 per bag across Lagos and Abuja markets, representing a 12-15% increase month-on-month."},
];
const PRICES = [
  {id:1,title:"Daily Equity Price List — 17 April 2026",date:"2026-04-17",type:"excel",filePath:"/prices/ngx-equity-prices-2026-04-17.csv"},
  {id:2,title:"Daily Equity Price List — 16 April 2026",date:"2026-04-16",type:"excel",filePath:"/prices/ngx-equity-prices-2026-04-16.csv"},
  {id:3,title:"Weekly Fixed Income Price List — W/E 11 Apr",date:"2026-04-11",type:"pdf",filePath:"/prices/fgn-bond-prices-we-2026-04-11.csv"},
];

/* ═══ RESEARCH LIBRARY — SEED DATA ═══ */
const INIT_LIBRARY = [
  {id:101,title:"NGX Sector Performance Dashboard — Q1 2026",description:"Interactive summary of NGX sector returns for Q1 2026. Covers Banking, Consumer Goods, Oil & Gas, Cement, and Telecoms. Useful for client presentations and morning briefs.",docType:"data",visibility:"team",category:"equities",pubDate:"2026-04-02",filePath:"/library/ngx-sector-dashboard-q1-2026.xlsx",createdAt:"2026-04-02T08:00:00Z",uploaderName:"Tajudeen Ibrahim",uploadedBy:1},
  {id:102,title:"Nigeria 2026 Macroeconomic Outlook — Presentation Deck",description:"Full-length slide deck covering the macro outlook: FX, inflation, monetary policy, fiscal position, and growth projections for 2026. Prepared for the annual investor briefing.",docType:"presentation",visibility:"team",category:"macro",pubDate:"2026-01-15",filePath:"/library/macro-outlook-2026.pdf",createdAt:"2026-01-15T09:00:00Z",uploaderName:"Tajudeen Ibrahim",uploadedBy:1},
  {id:103,title:"Banking Sector — Post-Recapitalisation Deep Dive",description:"Internal research note reviewing each tier-1 bank's capital raise, residual funding gaps, and revised earnings power post-recapitalisation. Includes earnings model assumptions.",docType:"report",visibility:"team",category:"banking",pubDate:"2026-03-10",filePath:"/library/banking-sector-recap-2026.pdf",createdAt:"2026-03-10T11:00:00Z",uploaderName:"Nabila Mohammed",uploadedBy:6},
  {id:104,title:"FX Rate & Liquidity Monitor — Weekly Tracker (Mar 2026)",description:"Weekly spreadsheet tracking NAFEM rates, CBN interventions, parallel market premium, and FX forwards. Updated every Friday for team distribution.",docType:"data",visibility:"team",category:"fx",pubDate:"2026-03-28",filePath:"/library/fx-liquidity-monitor-mar2026.xlsx",createdAt:"2026-03-28T16:30:00Z",uploaderName:"Bolade Agboola",uploadedBy:4},
  {id:105,title:"Q1 2026 Earnings Calendar — Nigerian Equities",description:"Full calendar of Q1 2026 results expected from NGX-listed companies, with analyst coverage assignment and expected release dates. Use for scheduling coverage notes.",docType:"data",visibility:"team",category:"equities",pubDate:"2026-03-20",filePath:"/library/q1-2026-earnings-calendar.xlsx",createdAt:"2026-03-20T08:00:00Z",uploaderName:"Boluwatife Ishola",uploadedBy:2},
  {id:106,title:"CHD Research Style Guide & Report Templates",description:"Internal style guide covering report format, tone, disclaimer language, and branded Word/PowerPoint templates. Mandatory reading for new analysts and interns.",docType:"other",visibility:"team",category:"internal",pubDate:"2026-01-01",filePath:"/library/research-style-guide.pdf",createdAt:"2026-01-01T08:00:00Z",uploaderName:"Portal Admin",uploadedBy:0},
  {id:107,title:"Cement Sector — Cost Structure Analysis (Working File)",description:"Detailed cost breakdown for Dangote, BUA, and Lafarge including energy cost per tonne, logistics, and COGS bridge. For internal use — not for external distribution.",docType:"data",visibility:"private",category:"cement",pubDate:"2026-03-15",filePath:null,createdAt:"2026-03-15T14:00:00Z",uploaderName:"Gideon Oshadumi",uploadedBy:3},
];

/* ═══ FUNDS DATA ═══ */
const PERIODS = ["1M","3M","6M","YTD","1Y","3Y","ALL"];
const FUNDS = [
  {
    id:"mmf", name:"CHD Money Market Fund", abbr:"CHDMMF",
    type:"Money Market", risk:"Low", riskColor:"#16a34a", riskBg:"#dcfce7",
    inception:"Mar 2012", aum:"₦47.3B", nav:"₦100.00",
    description:"Invests in short-term money market instruments — T-Bills, Commercial Papers, and Bankers' Acceptances — to preserve capital while delivering competitive yields.",
    perf:{"1M":1.74,"3M":5.22,"6M":10.12,"YTD":14.8,"1Y":21.3,"3Y":58.4,"ALL":312.5},
    spark:{
      "1M":[0,.28,.52,.79,1.08,1.38,1.74],
      "3M":[0,.6,1.3,2.1,3.0,4.0,5.22],
      "6M":[0,.9,1.9,3.2,5.0,7.1,8.9,10.12],
      "YTD":[0,1.2,2.8,4.9,7.2,9.8,12.1,14.8],
      "1Y":[0,1.8,3.5,6.1,9.4,13.2,17.1,19.8,21.3],
      "3Y":[0,8,16,24,33,42,50,58.4],
      "ALL":[0,22,48,80,115,152,190,230,268,295,312.5],
    },
  },
  {
    id:"fif", name:"CHD Fixed Income Fund", abbr:"CHDFIF",
    type:"Fixed Income", risk:"Low–Med", riskColor:"#0891b2", riskBg:"#cffafe",
    inception:"Sep 2013", aum:"₦28.6B", nav:"₦248.50",
    description:"Invests in FGN Bonds, State Government Bonds, and high-grade corporate bonds to deliver superior income returns over the medium to long term.",
    perf:{"1M":1.91,"3M":6.4,"6M":11.8,"YTD":17.2,"1Y":23.9,"3Y":68.1,"ALL":248.5},
    spark:{
      "1M":[0,.3,.72,1.0,1.4,1.65,1.91],
      "3M":[0,.8,1.8,3.0,4.4,5.4,6.4],
      "6M":[0,1.1,2.4,4.2,6.5,8.8,10.6,11.8],
      "YTD":[0,1.5,3.4,6.0,9.1,12.5,15.2,17.2],
      "1Y":[0,2.1,4.8,8.3,12.1,16.4,19.8,22.1,23.9],
      "3Y":[0,10,21,32,44,54,62,68.1],
      "ALL":[0,18,38,62,90,120,158,192,220,238,248.5],
    },
  },
  {
    id:"ef", name:"CHD Paramount Fund", abbr:"CHDPEF",
    type:"Equity", risk:"High", riskColor:"#d97706", riskBg:"#fef3c7",
    inception:"Jun 2011", aum:"₦12.1B", nav:"₦486.20",
    description:"Actively managed diversified equity fund investing primarily in NGX-listed equities, seeking long-term capital appreciation through rigorous bottom-up stock selection.",
    perf:{"1M":3.2,"3M":12.4,"6M":19.8,"YTD":34.1,"1Y":41.7,"3Y":112.3,"ALL":386.2},
    spark:{
      "1M":[0,1.1,.8,1.9,1.7,2.6,3.2],
      "3M":[0,1.8,3.2,5.8,7.4,10.1,12.4],
      "6M":[0,2.4,4.1,7.8,11.2,14.9,17.8,19.8],
      "YTD":[0,3.8,6.2,10.5,15.8,22.1,28.4,34.1],
      "1Y":[0,4.2,8.1,12.3,18.4,24.1,30.2,36.8,41.7],
      "3Y":[0,18,32,52,72,88,100,112.3],
      "ALL":[0,30,65,95,118,140,195,258,318,362,386.2],
    },
  },
  {
    id:"nidf", name:"Nigeria Infrastructure Debt Fund", abbr:"NIDIF",
    type:"Infrastructure", risk:"Medium", riskColor:"#7c3aed", riskBg:"#ede9fe",
    inception:"Nov 2015", aum:"₦154.8B", nav:"₦193.40",
    description:"Long-term debt fund financing critical Nigerian infrastructure — roads, power, telecoms, and social housing. Eligible for pension fund allocation under PenCom guidelines.",
    perf:{"1M":1.55,"3M":4.8,"6M":9.4,"YTD":13.9,"1Y":19.2,"3Y":52.8,"ALL":93.4},
    spark:{
      "1M":[0,.22,.52,.82,1.1,1.35,1.55],
      "3M":[0,.6,1.4,2.3,3.3,4.1,4.8],
      "6M":[0,.9,1.9,3.4,5.4,7.4,8.7,9.4],
      "YTD":[0,1.1,2.7,4.6,7.0,9.6,11.9,13.9],
      "1Y":[0,1.6,3.8,7.1,10.4,13.8,16.2,18.1,19.2],
      "3Y":[0,9,18,28,38,46,50,52.8],
      "ALL":[0,8,17,28,40,52,62,72,82,90,93.4],
    },
  },
];

const DEMO_ACCOUNTS = [
  {email:"admin@chapelhilldenham.com",      password:"password", name:"Portal Admin",           tier:"admin"},
  {email:"tiibrahim@chapelhilldenham.com",  password:"password", name:"Tajudeen Ibrahim",       tier:"director", analystId:1, title:"Director, Research"},
  {email:"nmohammed@chapelhilldenham.com",  password:"password", name:"Nabila Mohammed",        tier:"analyst", analystId:6, title:"Research Analyst"},
  {email:"bagboola@chapelhilldenham.com",   password:"password", name:"Bolade Agboola",         tier:"analyst", analystId:4, title:"Research Analyst"},
  {email:"bishola@chapelhilldenham.com",    password:"password", name:"Boluwatife Ishola",      tier:"analyst", analystId:2, title:"Research Analyst"},
  {email:"goshadumi@chapelhilldenham.com",  password:"password", name:"Gideon Oshadumi",        tier:"analyst", analystId:3, title:"Research Analyst"},
  {email:"intern@chapelhilldenham.com",     password:"password", name:"Research Intern",        tier:"intern",  analystId:7, title:"Research Intern"},
  {email:"viewer@chapelhilldenham.com",     password:"password", name:"Customer Viewer",        tier:"free"},
  {email:"client@chapelhilldenham.com",     password:"password", name:"Customer Client",        tier:"registered"},
  {email:"premiumclient@chapelhilldenham.com", password:"password", name:"Premium Client",      tier:"premium"},
  /* PAYMENT MODULE DISABLED — see primary app for premium subscriber demo account */
];

/* ═══ HELPERS ═══ */
const ga       = (id,analysts) => (analysts||INIT_ANALYSTS).find(a=>a.id===id);
const gc       = id => CATS.find(c=>c.id===id);
const gpc      = cid => { const c=gc(cid); return c?.p?gc(c.p):c; };
const fd       = d => new Date(d+"T00:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
const pCats    = () => CATS.filter(c=>c.p===null);
const childCats= pid => CATS.filter(c=>c.p===pid);
const nextId   = arr => arr.reduce((m,x)=>x.id>m?x.id:m,0)+1;
const tierRank = tier => STAFF_TIERS.has(tier) ? 3 : (TIER_ORDER[tier] ?? 0);
const isStaffUser = user => STAFF_TIERS.has(user?.tier);
const effectiveAccess = (report, categoryRules=CATEGORY_ACCESS_DEFAULTS) => report?.access || categoryRules[gpc(report?.cat)?.id || report?.cat] || "free";
const canAccess = (required, user) => {
  if (isStaffUser(user)) return true;
  return tierRank(user?.tier) >= tierRank(required);
};
const autoInitials = name => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return "";
  if(parts.length===1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0]+parts[parts.length-1][0]).toUpperCase();
};
const sparkPath= (pts,w=180,h=44,fill=false)=>{
  if(!pts||pts.length<2) return "";
  const mn=Math.min(...pts),mx=Math.max(...pts),rng=(mx-mn)||1;
  const pad=4;
  const xs=pts.map((_,i)=>pad+((i/(pts.length-1))*(w-pad*2)));
  const ys=pts.map(v=>(h-pad)-((v-mn)/rng)*(h-pad*2));
  const line=xs.map((x,i)=>`${i===0?"M":"L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  if(!fill) return line;
  return `${line} L${(w-pad).toFixed(1)},${h} L${pad},${h} Z`;
};
/* ═══ ANALYST AVATAR ═══ */
function AnalystAvatar({analyst,size=80,fontSize="1.4rem"}) {
  const [err,setErr]=useState(false);
  const showPhoto=analyst?.photo&&!err;
  const bg=`linear-gradient(135deg,${C.navy},${C.navyLight})`;
  const style={width:size,height:size,borderRadius:"50%",flexShrink:0,overflow:"hidden",background:bg,display:"flex",alignItems:"center",justifyContent:"center"};
  if(showPhoto) return (
    <div style={style}>
      <img src={analyst.photo} alt={analyst.name} onError={()=>setErr(true)} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top"}}/>
    </div>
  );
  return (
    <div style={{...style,color:C.gold,fontFamily:serif,fontSize,fontWeight:600}}>
      {analyst?.ini||"?"}
    </div>
  );
}

/* ═══ HOVER HELPER ═══ */
const s = (base,hover) => ({
  onMouseEnter:e=>Object.assign(e.currentTarget.style,hover),
  onMouseLeave:e=>Object.assign(e.currentTarget.style,base),
});

/* ═══ SHARED FORM INPUT ═══ */
function Inp({label,value,onChange,type="text",placeholder,as,rows=4,required,options}) {
  const base={width:"100%",padding:"10px 14px",border:`1px solid ${C.g200}`,borderRadius:8,fontSize:".86rem",fontFamily:sans,background:C.white,color:C.navy,transition:"border-color .15s"};
  return (
    <div style={{marginBottom:14}}>
      {label&&<label style={{display:"block",fontSize:".75rem",fontWeight:600,color:C.navy,marginBottom:5,textTransform:"uppercase",letterSpacing:.4}}>{label}{required&&<span style={{color:C.red}}> *</span>}</label>}
      {as==="textarea"
        ?<textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={{...base,resize:"vertical"}}/>
        :as==="select"
          ?<select value={value} onChange={onChange} style={base}>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>
          :<input type={type} value={value} onChange={onChange} placeholder={placeholder} style={base}/>}
    </div>
  );
}

/* ═══ HEADER ═══ */
function Header({page,nav,goBack,canGoBack,user,onLogout}) {
  const isAdmin   = user?.tier==="admin";
  const isDirector= user?.tier==="director";
  const isAnalyst = user?.tier==="analyst";
  const isIntern  = user?.tier==="intern";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(()=>{setMobileMenuOpen(false);},[page]);
  const items = [
    {k:"home",l:"Home"},
    {k:"reports",l:"Reports"},
    {k:"analysts",l:"Analysts"},
    {k:"pricelists",l:"Price Lists"},
    {k:"contact",l:"Contact Us"},
    ...(user?.tier==="premium"?[{k:"library",l:"My Library"}]:[]),
    ...(user&&["director","analyst","intern"].includes(user.tier)?[{k:"docbank",l:"Research Library"}]:[]),
    /* PAYMENT MODULE DISABLED: subscribe nav item removed */
    ...(isAdmin                   ?[{k:"manage",  l:"Administrator"}]:[]),
    ...(isDirector||isAnalyst||isIntern       ?[{k:"myportal",l:"My Portal"}]:[]),
  ];
  const isAct = k => page===k||(k==="reports"&&page==="report")||(k==="analysts"&&(page==="analyst"));

  return (<>
    <header style={{background:"linear-gradient(180deg,rgba(4,22,28,0.98) 0%,rgba(6,38,45,0.96) 100%)",position:"sticky",top:0,zIndex:100,borderBottom:"1px solid rgba(255,255,255,0.06)",backdropFilter:"blur(12px)"}}>
      <div style={{maxWidth:1320,margin:"0 auto",padding:"0 40px",display:"grid",gridTemplateColumns:"auto 1fr auto",alignItems:"center",gap:20,height:78}}>
        <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
          {canGoBack&&page!=="home"&&(
            <button onClick={goBack} title="Go back" style={{background:"rgba(255,255,255,0.04)",border:`1px solid rgba(255,255,255,0.08)`,color:"rgba(255,255,255,0.55)",cursor:"pointer",padding:"8px 10px",borderRadius:10,lineHeight:1,transition:"all .15s",display:"flex",alignItems:"center",...s({color:"rgba(255,255,255,0.55)",background:"rgba(255,255,255,0.04)",borderColor:"rgba(255,255,255,0.08)"},{color:"#fff",background:"rgba(255,255,255,0.08)",borderColor:"rgba(255,255,255,0.16)"})}}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="10,3 5,8 10,13"/></svg>
            </button>
          )}
          <button onClick={()=>nav("home")} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
            <img src="/chd-logo.png" alt="CHD" style={{height:38,width:"auto",display:"block",filter:"brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(5deg)"}}
              onError={e=>{e.currentTarget.style.display="none";}}/>
            <div style={{borderLeft:"1px solid rgba(255,255,255,0.1)",paddingLeft:12}}>
              <div style={{fontFamily:sans,color:C.white,fontSize:".72rem",fontWeight:700,letterSpacing:2.8,textTransform:"uppercase",lineHeight:1.2}}>Chapel Hill Denham</div>
              <div style={{fontSize:".55rem",textTransform:"uppercase",letterSpacing:4.5,color:C.gold,fontWeight:600,marginTop:3,opacity:.9}}>Research Portal</div>
            </div>
          </button>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
          <nav style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
            {items.map(n=>(
              <button key={n.k} onClick={()=>nav(n.k)} style={{background:isAct(n.k)?"rgba(185,114,49,0.14)":"rgba(255,255,255,0.03)",border:`1px solid ${isAct(n.k)?"rgba(185,114,49,0.28)":"rgba(255,255,255,0.06)"}`,borderRadius:999,color:isAct(n.k)?"#fff":n.k==="manage"||n.k==="myportal"?"rgba(255,223,175,0.92)":"rgba(255,255,255,0.72)",padding:"9px 14px",fontSize:".76rem",fontWeight:isAct(n.k)?700:500,cursor:"pointer",letterSpacing:.25,fontFamily:sans,transition:"all .15s",boxShadow:isAct(n.k)?"0 6px 18px rgba(185,114,49,0.12)":"none"}}>{n.l}</button>
            ))}
          </nav>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:10}}>
          <button id="chd-hamburger" onClick={()=>setMobileMenuOpen(o=>!o)} style={{display:"none",background:"none",border:"none",cursor:"pointer",padding:"6px 8px",color:"rgba(255,255,255,0.75)",lineHeight:1,marginRight:4}} aria-label={mobileMenuOpen?"Close menu":"Open menu"}>
            {mobileMenuOpen
              ?<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="3" x2="17" y2="17"/><line x1="17" y1="3" x2="3" y2="17"/></svg>
              :<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="2" y1="5" x2="18" y2="5"/><line x1="2" y1="10" x2="18" y2="10"/><line x1="2" y1="15" x2="18" y2="15"/></svg>
            }
          </button>
          {user&&(
            <div style={{display:"flex",alignItems:"center",gap:10,marginLeft:6,paddingLeft:14,borderLeft:"1px solid rgba(255,255,255,0.1)"}}>
              <div style={{textAlign:"right",display:"flex",flexDirection:"column",gap:2}}>
                <div style={{fontSize:".73rem",fontWeight:700,color:"#fff",lineHeight:1.2}}>{user.name}</div>
                <div style={{fontSize:".62rem",color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:.35}}>{tierLabel(user.tier)}</div>
              </div>
              <button onClick={onLogout} style={{padding:"8px 14px",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.14)",borderRadius:999,fontSize:".74rem",fontWeight:600,color:"#fff",cursor:"pointer",fontFamily:sans,transition:"all .15s",...s({background:"rgba(255,255,255,0.08)",borderColor:"rgba(255,255,255,0.14)"},{background:"rgba(255,255,255,0.14)",borderColor:"rgba(255,255,255,0.24)"})}}>Log Out</button>
            </div>
          )}
          {!user&&(
            <button onClick={()=>nav("login")} style={{padding:"8px 14px",background:C.gold,color:"#fff",border:"none",borderRadius:999,fontSize:".74rem",fontWeight:700,cursor:"pointer",fontFamily:sans,boxShadow:"0 10px 20px rgba(185,114,49,0.18)"}}>Sign In</button>
          )}
        </div>
      </div>
    </header>
    {mobileMenuOpen&&(
      <>
        <div onClick={()=>setMobileMenuOpen(false)} style={{position:"fixed",inset:0,top:78,background:"rgba(0,0,0,0.45)",zIndex:98}}/>
        <nav style={{position:"fixed",top:78,left:0,right:0,background:"linear-gradient(180deg,rgba(4,22,28,0.98),rgba(6,38,45,0.98))",zIndex:99,boxShadow:"0 16px 40px rgba(0,0,0,0.4)",borderBottom:"1px solid rgba(255,255,255,0.08)",padding:"6px 0"}}>
          {items.map(n=>(
            <button key={n.k} onClick={()=>{nav(n.k);setMobileMenuOpen(false);}} style={{display:"block",width:"100%",textAlign:"left",background:isAct(n.k)?C.navyLight:"none",border:"none",borderLeft:`3px solid ${isAct(n.k)?C.gold:"transparent"}`,color:isAct(n.k)?"#fff":"rgba(255,255,255,0.6)",padding:"15px 24px",fontSize:".9rem",fontWeight:isAct(n.k)?600:400,cursor:"pointer",fontFamily:sans,letterSpacing:.3,transition:"color .15s"}}>
              {n.l}
            </button>
          ))}
          {user&&(
            <>
              <div style={{borderTop:"1px solid rgba(255,255,255,0.1)",padding:"12px 24px",marginTop:6}}>
                <div style={{fontSize:".75rem",fontWeight:600,color:"#fff",marginBottom:2}}>{user.name}</div>
                <div style={{fontSize:".65rem",color:"rgba(255,255,255,0.5)",textTransform:"uppercase",marginBottom:10,letterSpacing:.3}}>{tierLabel(user.tier)}</div>
                <button onClick={()=>{onLogout();setMobileMenuOpen(false);}} style={{width:"100%",padding:"8px 12px",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:6,fontSize:".75rem",fontWeight:500,color:"#fff",cursor:"pointer",fontFamily:sans}}>Log Out</button>
              </div>
            </>
          )}
        </nav>
      </>
    )}
  </>);
}

function Footer({nav}) {
  const {mailingList,setMailingList} = useData();
  const [mailingEmail, setMailingEmail] = useState("");
  const [mailingStatus, setMailingStatus] = useState(null);
  const lnk={background:"none",border:"none",color:"rgba(255,255,255,0.54)",cursor:"pointer",padding:0,fontFamily:sans,fontSize:".82rem",textAlign:"left",display:"block",marginBottom:9,transition:"color .15s"};
  const lnkH={color:"rgba(255,255,255,0.92)"};
  const researchLinks=[
    ...pCats().map(c=>({l:c.name,a:()=>nav("reports",{cat:c.id})})),
    {l:"Our Analysts",a:()=>nav("analysts")},
    {l:"Price Lists",  a:()=>nav("pricelists")},
  ];
  const companyLinks=[
    {l:"Chapel Hill Denham",a:()=>window.open("https://www.chapelhilldenham.com","_blank")},
    {l:"Our Funds",          a:()=>nav("funds")},
    {l:"Contact Us",         a:()=>nav("contact")},
  ];
  const submitMailingList = async () => {
    if (!mailingEmail.trim()) return;
    try {
      /* Save to mailing list (localStorage persisted) */
      const email = mailingEmail.trim().toLowerCase();
      if (!mailingList.includes(email)) {
        setMailingList([...mailingList, email]);
      }
      setMailingStatus("subscribed");
      setMailingEmail("");
      setTimeout(() => setMailingStatus(null), 3000);
    } catch (e) {
      setMailingStatus("error");
    }
  };
  return (
    <footer style={{background:"linear-gradient(180deg,#04151b 0%,#031116 100%)",color:"rgba(255,255,255,0.54)",paddingTop:52}}>
      <div style={{maxWidth:1320,margin:"0 auto",padding:"0 40px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:28,alignItems:"start",paddingBottom:34,borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={{maxWidth:360}}>
            <div style={{fontFamily:sans,color:C.white,fontSize:".72rem",fontWeight:800,letterSpacing:3,textTransform:"uppercase",marginBottom:8}}>Chapel Hill Denham</div>
            <div style={{fontSize:".54rem",textTransform:"uppercase",letterSpacing:4,color:C.gold,fontWeight:700,marginBottom:18,opacity:.92}}>Research workspace</div>
            <p style={{fontSize:".84rem",lineHeight:1.85,marginBottom:18,color:"rgba(255,255,255,0.6)"}}>A research portal for analysts, investors, and internal teams. The layout is built to move from headline insight to report, profile, or dataset without losing context.</p>
            <button onClick={()=>nav("contact")} style={{padding:0,background:"none",border:"none",color:C.gold,textDecoration:"none",fontWeight:600,fontSize:".8rem",cursor:"pointer",fontFamily:sans}}>Contact page</button>
          </div>
          <div>
            <h4 style={{color:C.white,fontSize:".68rem",fontWeight:800,textTransform:"uppercase",letterSpacing:2.4,marginBottom:18}}>Research</h4>
            {researchLinks.map(t=>(
              <button key={t.l} onClick={t.a} style={lnk} {...s(lnk,{...lnk,...lnkH})}>{t.l}</button>
            ))}
          </div>
          <div>
            <h4 style={{color:C.white,fontSize:".68rem",fontWeight:800,textTransform:"uppercase",letterSpacing:2.4,marginBottom:18}}>Company</h4>
            {companyLinks.map(t=>(
              <button key={t.l} onClick={t.a} style={lnk} {...s(lnk,{...lnk,...lnkH})}>{t.l}</button>
            ))}
          </div>
          <div>
            <h4 style={{color:C.white,fontSize:".68rem",fontWeight:800,textTransform:"uppercase",letterSpacing:2.4,marginBottom:18}}>Get Updates</h4>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <input type="email" placeholder="Your email" value={mailingEmail} onChange={e=>setMailingEmail(e.target.value)} onKeyPress={e=>e.key==="Enter"&&submitMailingList()} style={{flex:1,padding:"10px 12px",fontSize:".8rem",border:`1px solid rgba(255,255,255,0.12)`,borderRadius:10,background:"rgba(255,255,255,0.05)",color:"#fff",fontFamily:sans}} />
              <button onClick={submitMailingList} style={{padding:"10px 14px",background:C.gold,color:"#fff",border:"none",borderRadius:10,fontSize:".74rem",fontWeight:700,cursor:"pointer",fontFamily:sans,whiteSpace:"nowrap",transition:"opacity .15s",...s({opacity:1},{opacity:.85})}}>{mailingStatus==="subscribed"?"✓":"Join"}</button>
            </div>
            {mailingStatus==="subscribed"&&<p style={{fontSize:".66rem",color:C.gold,lineHeight:1.4,marginBottom:8}}>Thanks for subscribing.</p>}
            <p style={{fontSize:".66rem",color:"rgba(255,255,255,0.34)",lineHeight:1.55}}>Weekly research updates, price lists, and market briefs.</p>
            <button onClick={()=>nav("login")} style={{...lnk,marginTop:14,display:"block",fontSize:".78rem"}} {...s(lnk,{...lnk,...lnkH})}>Sign in for analysts</button>
          </div>
        </div>
        <div style={{padding:"20px 0 26px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,fontSize:".71rem",color:"rgba(255,255,255,0.24)"}}>
          <span>© 2026 Chapel Hill Denham Group. Regulated by the Securities and Exchange Commission, Nigeria.</span>
          <span>Past performance is not indicative of future results.</span>
        </div>
      </div>
    </footer>
  );
}

function ContactPage({nav}) {
  return (
    <>
      <section className="contact-hero" style={{background:`linear-gradient(160deg,${C.navy} 0%,${C.navyMid} 100%)`,padding:"40px 0 28px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,opacity:.08,backgroundImage:"linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",backgroundSize:"84px 84px"}}/>
        <div style={{maxWidth:1180,margin:"0 auto",padding:"0 40px",position:"relative",zIndex:1}}>
          <p style={{color:C.gold,fontSize:".72rem",textTransform:"uppercase",letterSpacing:1.8,fontWeight:700,marginBottom:8}}>Contact Us</p>
          <h1 style={{fontFamily:serif,fontSize:"2.15rem",color:C.white,fontWeight:500,marginBottom:6}}>Reach the team</h1>
          <p style={{color:"rgba(255,255,255,0.55)",fontSize:".9rem",lineHeight:1.7,maxWidth:680}}>Office locations, research desk inquiries, and investor-relations routing.</p>
        </div>
      </section>
      <section style={{padding:"40px 0 46px"}}>
        <div style={{maxWidth:1180,margin:"0 auto",padding:"0 40px"}}>
        <div className="contact-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:0,border:`1px solid ${C.g200}`,overflow:"hidden",borderRadius:16,background:C.white}}>
            <div className="contact-left" style={{padding:"28px 26px",background:C.offWhite,display:"flex",flexDirection:"column",gap:16}}>
              <div className="contact-detail-grid" style={{display:"grid",gridTemplateColumns:"repeat(2, minmax(0, 1fr))",gap:12}}>
                <div style={{padding:"14px 14px 12px",background:C.white,border:`1px solid ${C.g200}`,borderLeft:`3px solid ${C.gold}`,borderRadius:12}}>
                  <div style={{fontSize:".68rem",textTransform:"uppercase",letterSpacing:1.8,color:C.gold,fontWeight:800,marginBottom:8}}>Lagos head office</div>
                  <div style={{color:C.g700,fontSize:".88rem",lineHeight:1.65}}>
                    10 Bankole Oki Street<br/>
                    Ikoyi, Lagos, Nigeria<br/>
                    <a href="tel:07002427354455" style={{color:C.navy,textDecoration:"none",fontWeight:700}}>0700 CHAPEL HILL</a>
                  </div>
                </div>
                <div style={{padding:"14px 14px 12px",background:C.white,border:`1px solid ${C.g200}`,borderLeft:`3px solid ${C.gold}`,borderRadius:12}}>
                  <div style={{fontSize:".68rem",textTransform:"uppercase",letterSpacing:1.8,color:C.gold,fontWeight:800,marginBottom:8}}>Research mailbox</div>
                  <div style={{color:C.g700,fontSize:".88rem",lineHeight:1.65}}>
                    <a href="mailto:research@chapelhilldenham.com" style={{color:C.navy,textDecoration:"none",fontWeight:700}}>research@chapelhilldenham.com</a><br/>
                    Analyst profiles and report routing
                  </div>
                </div>
                <div style={{padding:"14px 14px 12px",background:C.white,border:`1px solid ${C.g200}`,borderLeft:`3px solid ${C.gold}`,borderRadius:12}}>
                  <div style={{fontSize:".68rem",textTransform:"uppercase",letterSpacing:1.8,color:C.gold,fontWeight:800,marginBottom:8}}>Abuja office</div>
                  <div style={{color:C.g700,fontSize:".88rem",lineHeight:1.65}}>
                    Mabon Place,<br/>
                    46, Gana Street,<br/>
                    Maitama, Abuja
                  </div>
                </div>
                <div style={{padding:"14px 14px 12px",background:C.white,border:`1px solid ${C.g200}`,borderLeft:`3px solid ${C.gold}`,borderRadius:12}}>
                  <div style={{fontSize:".68rem",textTransform:"uppercase",letterSpacing:1.8,color:C.gold,fontWeight:800,marginBottom:8}}>Accra office</div>
                  <div style={{color:C.g700,fontSize:".88rem",lineHeight:1.65}}>
                    Suite 2, The Labone Office Park,<br/>
                    Sithole Street, Labone,<br/>
                    Accra, Ghana<br/>
                    <a href="tel:+233302766865" style={{color:C.navy,textDecoration:"none",fontWeight:700}}>+233 30 2 766 865</a>
                  </div>
                </div>
              </div>
              <div style={{padding:"16px",border:`1px solid ${C.g200}`,borderRadius:12,background:C.white}}>
                <div style={{fontSize:".68rem",textTransform:"uppercase",letterSpacing:1.8,color:C.navy,fontWeight:800,marginBottom:8}}>Sales / Client Relations</div>
                <p style={{color:C.g700,fontSize:".86rem",lineHeight:1.7,marginBottom:10}}>For onboarding, product questions, and account support, contact the sales team directly.</p>
                <a href="mailto:sales@chapelhilldenham.com" style={{display:"inline-flex",padding:"9px 14px",background:C.navy,color:"#fff",borderRadius:999,fontSize:".78rem",fontWeight:700,textDecoration:"none",fontFamily:sans}}>sales@chapelhilldenham.com</a>
              </div>
              <div style={{padding:"16px",border:`1px solid ${C.g200}`,borderRadius:12,background:"linear-gradient(180deg,#fff 0%,#f8fafc 100%)"}}>
                <div style={{fontSize:".68rem",textTransform:"uppercase",letterSpacing:1.8,color:C.gold,fontWeight:800,marginBottom:8}}>InvestNaija</div>
                <p style={{color:C.g700,fontSize:".86rem",lineHeight:1.7,marginBottom:10}}>InvestNaija is Chapel Hill Denham’s savings and investment journey brand.</p>
                <a href="https://chapelhilldenham.com/overview/" target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",padding:"9px 14px",background:C.gold,color:"#fff",borderRadius:999,fontSize:".78rem",fontWeight:700,textDecoration:"none",fontFamily:sans}}>Open InvestNaija</a>
              </div>
            </div>
            <div className="contact-map" style={{background:C.white,display:"flex",flexDirection:"column"}}>
              <div className="contact-map-head" style={{padding:"24px 24px 18px",borderBottom:`1px solid ${C.g200}`}}>
                <div style={{width:42,height:2.5,background:`linear-gradient(90deg,${C.gold},rgba(185,114,49,0.18))`,borderRadius:2,marginBottom:10}}/>
                <div style={{fontSize:".72rem",textTransform:"uppercase",letterSpacing:2,color:C.gold,fontWeight:800,marginBottom:8}}>Map</div>
                <h2 style={{fontFamily:serif,fontSize:"1.3rem",color:C.navy,fontWeight:600,marginBottom:8}}>Lagos head office</h2>
                <p style={{fontSize:".86rem",color:C.g700,lineHeight:1.7,margin:0}}>10 Bankole Oki Street, Ikoyi, Lagos, Nigeria</p>
              </div>
              <div style={{minHeight:380,flex:1}}>
                <iframe
                  title="Chapel Hill Denham Lagos office map"
                  src="https://www.google.com/maps?q=10%20Bankole%20Oki%20Street%20Ikoyi%20Lagos%20Nigeria&output=embed"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  style={{width:"100%",height:"100%",minHeight:380,border:"none",display:"block"}}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function SH({title,sub,link,onLink}) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:18,marginBottom:30,flexWrap:"wrap"}}>
      <div>
        <p style={{fontSize:".62rem",fontWeight:800,letterSpacing:3,textTransform:"uppercase",color:C.gold,marginBottom:8}}>Research desk</p>
        <h2 style={{fontFamily:serif,fontSize:"2rem",color:C.navy,fontWeight:500,margin:0,lineHeight:1.08}}>{title}</h2>
        {sub&&<p style={{color:C.g500,fontSize:".84rem",marginTop:6,lineHeight:1.6,maxWidth:660}}>{sub}</p>}
        <div style={{width:42,height:2.5,background:`linear-gradient(90deg,${C.gold},rgba(185,114,49,0.18))`,borderRadius:2,marginTop:12}}/>
      </div>
      {link&&<button onClick={onLink} style={{background:"rgba(185,114,49,0.08)",border:`1px solid rgba(185,114,49,0.18)`,fontSize:".79rem",fontWeight:700,color:C.gold,cursor:"pointer",fontFamily:sans,letterSpacing:.3,display:"flex",alignItems:"center",gap:5,transition:"all .15s",padding:"10px 14px",borderRadius:999,boxShadow:"0 8px 18px rgba(185,114,49,0.08)",...s({background:"rgba(185,114,49,0.08)",borderColor:"rgba(185,114,49,0.18)"},{background:"rgba(185,114,49,0.12)",borderColor:"rgba(185,114,49,0.24)"})}}>{link} →</button>}
    </div>
  );
}

function Pill({active,children,onClick}) {
  return <button onClick={onClick} style={{padding:"9px 18px",borderRadius:999,fontSize:".78rem",fontWeight:active?700:500,background:active?`linear-gradient(180deg,${C.navy} 0%,${C.navyMid} 100%)`:"rgba(255,255,255,0.86)",color:active?C.white:C.g700,border:`1px solid ${active?"rgba(6,38,45,0.92)":C.g200}`,cursor:"pointer",fontFamily:sans,letterSpacing:active?.15:0,transition:"all .15s",boxShadow:active?"0 10px 24px rgba(6,38,45,0.10)":"none"}}>{children}</button>;
}

/* ═══ ACCESS BADGE — PUBLIC SITE (ALL FREE) ═══ */
function AccessBadge({access}) {
  const map = {
    free:       {label:"Free", bg:"#edf4ef", color:"#3b6b4f"},
    registered: {label:"Members", bg:"#eef2f7", color:"#35506a"},
    premium:    {label:"Premium", bg:"#f7eedf", color:"#9d601c"},
    inherit:    {label:"Category", bg:C.g100, color:C.g700},
  };
  const a = map[access] || map.inherit;
  return <span style={{background:a.bg,color:a.color,fontSize:".6rem",fontWeight:700,padding:"2px 8px",borderRadius:999,textTransform:"uppercase",letterSpacing:.5}}>{a.label}</span>;
}

/* ═══ GATED OVERLAY — NOT USED (PUBLIC SITE) ═══ */
function GatedOverlay({access,user,nav}) {
  const tierText = access==="premium" ? "premium" : "member";
  return (
    <div style={{marginTop:26,background:`linear-gradient(135deg,rgba(6,38,45,0.98) 0%,rgba(11,53,64,0.98) 100%)`,borderRadius:16,padding:"26px 24px",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center",gap:18,flexWrap:"wrap",boxShadow:"0 20px 44px rgba(6,38,45,0.14)"}}>
      <div style={{maxWidth:540}}>
        <p style={{fontSize:".62rem",textTransform:"uppercase",letterSpacing:2.4,color:C.gold,fontWeight:800,marginBottom:10}}>Access locked</p>
        <h3 style={{fontFamily:serif,fontSize:"1.25rem",fontWeight:600,marginBottom:8,color:C.white}}>This is a {tierText} report.</h3>
        <p style={{fontSize:".84rem",lineHeight:1.7,color:"rgba(255,255,255,0.68)"}}>
          Contact your account manager or office representative to confirm access. Once your access code is issued, sign in or register to unlock the relevant reports and your library.
        </p>
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <button onClick={()=>nav("register")} style={{padding:"11px 16px",background:C.gold,color:"#fff",border:"none",borderRadius:999,fontSize:".8rem",fontWeight:700,cursor:"pointer",fontFamily:sans}}>Request access</button>
        <button onClick={()=>nav("login")} style={{padding:"11px 16px",background:"transparent",color:"rgba(255,255,255,0.82)",border:"1px solid rgba(255,255,255,0.16)",borderRadius:999,fontSize:".8rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>Sign in</button>
      </div>
    </div>
  );
}

/* ═══ REPORT CARD ═══ */
function RC({r,nav,user}) {
  const {analysts,categoryRules,trackRecentView}=useData();
  const cat=gc(r.cat),pc=gpc(r.cat),a=r.aid?ga(r.aid,analysts):null;
  const dc=cat?.p?`${pc?.name} · ${cat.name}`:cat?.name;
  const access=effectiveAccess(r,categoryRules);
  const locked=!canAccess(access,user);
  const tierCta=access==="premium"?"Premium access":"Member access";
  const isPending=r.status==="pending";
  const isRejected=r.status==="rejected";
  const borderCol=isPending?"#fde047":isRejected?"#fca5a5":C.g200;
  const base={background:`linear-gradient(180deg,rgba(255,255,255,0.98) 0%,rgba(250,250,248,0.98) 100%)`,borderRadius:16,border:`1px solid ${borderCol}`,padding:"24px 22px 22px",display:"flex",flexDirection:"column",cursor:"pointer",transition:"transform .22s, box-shadow .22s, border-color .22s",transform:"translateY(0)",boxShadow:"0 1px 4px rgba(6,38,45,0.05)",position:"relative",overflow:"hidden"};
  const hover={transform:"translateY(-4px)",boxShadow:"0 14px 36px rgba(6,38,45,0.11)",borderColor:borderCol};
  const openReport=()=>{
    trackRecentView?.({type:"report",id:r.id,title:r.title,category:r.cat});
    nav("report",{id:r.id});
  };
  return (
    <div onClick={openReport} style={base} {...s(base,hover)}>
      <div style={{height:3,background:`linear-gradient(90deg,${C.gold},rgba(185,114,49,0.18))`,margin:"-24px -22px 18px"}}/>
      {isPending&&<div style={{background:"#fef9c3",borderBottom:"1px solid #fde047",margin:"-26px -24px 16px",padding:"6px 14px",fontSize:".7rem",fontWeight:700,color:"#854d0e",display:"flex",alignItems:"center",gap:6}}>⏳ Pending Supervisor Approval</div>}
      {isRejected&&<div style={{background:"#fef2f2",borderBottom:"1px solid #fca5a5",margin:"-26px -24px 16px",padding:"6px 14px",fontSize:".7rem",fontWeight:700,color:C.red,display:"flex",alignItems:"center",gap:6}}>✕ Rejected{r.rejectedReason?` — ${r.rejectedReason}`:""}</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
        <span style={{background:C.goldSoft,color:C.gold,fontSize:".62rem",fontWeight:800,textTransform:"uppercase",letterSpacing:.9,padding:"5px 10px",borderRadius:999}}>{dc}</span>
      </div>
      <h3 style={{fontFamily:serif,fontSize:"1.18rem",color:C.navy,fontWeight:600,lineHeight:1.32,marginBottom:10,flexShrink:0}}>{r.title}</h3>
      {locked?(
        <div style={{position:"relative",flexGrow:1,marginBottom:18,minHeight:148}}>
          <p style={{color:C.g500,fontSize:".83rem",lineHeight:1.65,filter:"blur(5px)",userSelect:"none",pointerEvents:"none",maxHeight:110,overflow:"hidden"}}>{r.ex}</p>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(248,249,251,0.82)",backdropFilter:"blur(4px)",borderRadius:8,padding:"16px 10px",textAlign:"center"}}>
            <div style={{width:46,height:46,borderRadius:"50%",background:C.navy,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10,boxShadow:"0 4px 16px rgba(17,37,48,0.2)"}}>
              <span style={{fontSize:"1.2rem"}}>🔒</span>
            </div>
            <p style={{fontSize:".8rem",fontWeight:700,color:C.navy,marginBottom:4}}>{tierCta}</p>
            <p style={{fontSize:".72rem",color:C.g500,lineHeight:1.5,maxWidth:190}}>{user?`Upgrade to access`:"Sign in or register to access"}</p>
          </div>
        </div>
      ):(
        <p style={{color:C.g500,fontSize:".83rem",lineHeight:1.65,flexGrow:1,marginBottom:18}}>{r.ex}</p>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:14,borderTop:`1px solid ${C.g100}`,fontSize:".76rem"}}>
        <div>
          <span style={{fontWeight:600,color:C.navy,cursor: a?"pointer":"default"}}>{a?.name||"Research Desk"}</span>
          <br/><span style={{color:C.g500}}>{fd(r.date)}</span>
        </div>
        <span style={{background:`linear-gradient(180deg,${C.navy} 0%,${C.navyMid} 100%)`,color:C.white,padding:"7px 12px",borderRadius:999,fontSize:".7rem",fontWeight:700,boxShadow:"0 8px 18px rgba(6,38,45,0.12)"}}>Open report</span>
      </div>
    </div>
  );
}

/* ═══ DEMO WIDGET (floating corner) ═══ */
function DemoWidget({page,nav}) {
  const {setDemoFill}=useData();
  const [open,setOpen]=useState(false);
  const tiers=[
    {tier:"admin",      color:"#a78bfa",bg:"#ede9fe",     d:DEMO_ACCOUNTS[0]},
    {tier:"director",   color:"#f87171",bg:"#fee2e2",     d:DEMO_ACCOUNTS[1]},
    {tier:"analyst",    color:"#86efac",bg:"#dcfce7",     d:DEMO_ACCOUNTS[2]},
    {tier:"analyst",    color:"#86efac",bg:"#dcfce7",     d:DEMO_ACCOUNTS[3]},
    {tier:"analyst",    color:"#86efac",bg:"#dcfce7",     d:DEMO_ACCOUNTS[4]},
    {tier:"analyst",    color:"#86efac",bg:"#dcfce7",     d:DEMO_ACCOUNTS[5]},
    {tier:"intern",     color:"#67e8f9",bg:"#cffafe",     d:DEMO_ACCOUNTS[6]},
    {tier:"viewer",     color:"#60a5fa",bg:"#dbeafe",     d:DEMO_ACCOUNTS[7]},
    {tier:"client",     color:"#f59e0b",bg:"#fef3c7",     d:DEMO_ACCOUNTS[8]},
    {tier:"premium",    color:"#ec4899",bg:"#fce7f3",     d:DEMO_ACCOUNTS[9]},
  ];
  const fill=acc=>{
    setDemoFill({email:acc.email,password:acc.password});
    if(page!=="login") nav("login");
    setOpen(false);
  };
  return (
    <div style={{position:"fixed",bottom:24,right:24,zIndex:300}}>
      {open&&(
        <div style={{background:C.white,border:`1px solid ${C.g200}`,borderRadius:12,padding:"14px 16px",marginBottom:10,boxShadow:"0 20px 50px rgba(17,37,48,0.15)",minWidth:300}}>
          <div style={{fontSize:".7rem",fontWeight:700,color:C.g500,textTransform:"uppercase",letterSpacing:.6,marginBottom:10}}>Demo Accounts — click to auto-fill</div>
          {tiers.map(t=>(
            <div key={t.d.email} onClick={()=>fill(t.d)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,cursor:"pointer",marginBottom:4,transition:"background .12s",...s({background:"transparent"},{background:C.g100})}}>
              <span style={{background:t.bg,color:t.color,fontSize:".6rem",fontWeight:700,padding:"2px 7px",borderRadius:3,textTransform:"uppercase",letterSpacing:.5,flexShrink:0,minWidth:60,textAlign:"center"}}>{t.tier}</span>
              <span style={{fontSize:".78rem",color:C.navy,fontWeight:500,flex:1}}>{t.d.email}</span>
              <span style={{fontSize:".7rem",color:C.g500,fontFamily:"monospace"}}>{t.d.password}</span>
            </div>
          ))}
        </div>
      )}
      <button onClick={()=>setOpen(o=>!o)} style={{background:open?C.navy:C.white,color:open?C.white:C.navy,border:`1px solid ${C.g200}`,borderRadius:20,padding:"8px 16px",fontSize:".76rem",fontWeight:600,cursor:"pointer",fontFamily:sans,boxShadow:"0 4px 20px rgba(17,37,48,0.12)",display:"flex",alignItems:"center",gap:6,transition:"all .15s"}}>
        <span style={{fontSize:".9rem"}}>👤</span> Demo Logins {open?"↓":"↑"}
      </button>
    </div>
  );
}

/* ═══ LOGIN / REGISTER ═══ */
function AuthPage({mode,nav,onLogin}) {
  const {demoFill,setDemoFill,accessRequests,setAccessRequests}=useData();
  const [isRequest,setIsRequest]=useState(mode==="register");
  const [form,setForm]=useState({name:"",email:"",company:"",phone:"",requestedTier:"registered",contact:"",message:"",password:""});
  const [error,setError]=useState("");
  const [sent,setSent]=useState(false);
  const [submitting,setSubmitting]=useState(false);

  useEffect(()=>{
    setIsRequest(mode==="register");
    setError("");
    setSent(false);
  },[mode]);

  useEffect(()=>{
    if(demoFill){setForm(f=>({...f,email:demoFill.email,password:demoFill.password}));setIsRequest(false);setDemoFill(null);}
  },[demoFill,setDemoFill]);

  const handleSubmit=async()=>{
    if(isRequest){
      if(!form.name.trim()||!form.email.trim()){setError("Please enter your name and email address.");return;}
      setSubmitting(true);
      setError("");
      try{
        const request={id:Date.now(),name:form.name.trim(),email:form.email.trim(),company:form.company.trim(),phone:form.phone.trim(),requestedTier:form.requestedTier,contact:form.contact.trim(),message:form.message.trim(),status:"pending",createdAt:new Date().toISOString()};
        const next=[request,...(accessRequests||[])];
        setAccessRequests(next);
        lsSet(LS.accessRequests,next);
        setSent(true);
      }catch(e){
        setError(e.message||"Something went wrong. Please try again.");
      }finally{
        setSubmitting(false);
      }
      return;
    }

    if(!form.email||!form.password){setError("Please fill in all required fields.");return;}
    setSubmitting(true);setError("");
    try{
      let u;
      try{
        u=await api.auth.login(form.email,form.password);
      } catch(apiErr){
        const saved=lsGet(LS.demoUsers)||[];
        const lsUser=saved.find(d=>d.email===form.email&&d.password===form.password);
        if(lsUser){onLogin({name:lsUser.name,email:lsUser.email,tier:lsUser.tier,analystId:lsUser.analystId||null,title:lsUser.title||null,id:lsUser.id,mustChange:lsUser.mustChange||false});nav("home");return;}
        const lsOverridden=saved.some(d=>d.email===form.email);
        const demo=!lsOverridden&&DEMO_ACCOUNTS.find(d=>d.email===form.email&&d.password===form.password);
        if(demo){onLogin({name:demo.name,email:demo.email,tier:demo.tier,analystId:demo.analystId||null,title:demo.title||null});nav("home");return;}
        setError("Invalid email or password.");setSubmitting(false);return;
      }
      onLogin(u);
      nav("home");
    }catch(e){
      setError(e.message||"Something went wrong. Please try again.");
    }finally{
      setSubmitting(false);
    }
  };

  return (
    <div style={{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(160deg,${C.navy} 0%,${C.navyMid} 100%)`,padding:"60px 20px"}}>
      <div style={{background:C.white,borderRadius:16,padding:"42px 34px",maxWidth:440,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <img src="/chd-logo.png" alt="Chapel Hill Denham" style={{height:52,width:"auto",margin:"0 auto 14px",display:"block"}} onError={e=>{e.currentTarget.style.display="none";}}/>
          <div style={{fontFamily:sans,fontSize:".58rem",fontWeight:700,letterSpacing:3.5,textTransform:"uppercase",color:C.gold,marginBottom:10,opacity:.9}}>Chapel Hill Denham · Research</div>
          <h2 style={{fontFamily:serif,fontSize:"1.5rem",color:C.navy,marginBottom:3}}>{isRequest?"Request Access":"Welcome Back"}</h2>
          <p style={{color:C.g500,fontSize:".85rem"}}>{isRequest?"Fill in the form and we’ll email the next steps once your request is reviewed":"Sign in to your research portal"}</p>
        </div>
        {sent&&isRequest?(
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",color:"#166534",padding:"14px 16px",borderRadius:10,marginBottom:16,fontSize:".84rem",lineHeight:1.65}}>
            Thanks. Your request has been received. We’ll review it and send the next steps to your email.
          </div>
        ):error&&<div style={{background:"#fef2f2",color:C.red,padding:"9px 13px",borderRadius:7,fontSize:".81rem",marginBottom:14}}>{error}</div>}
        {isRequest?(
          <>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Full Name *" style={{width:"100%",padding:"11px 14px",border:`1px solid ${C.g200}`,borderRadius:8,marginBottom:10,fontSize:".86rem",fontFamily:sans}}/>
            <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email Address *" type="email" style={{width:"100%",padding:"11px 14px",border:`1px solid ${C.g200}`,borderRadius:8,marginBottom:10,fontSize:".86rem",fontFamily:sans}}/>
            <input value={form.company} onChange={e=>setForm({...form,company:e.target.value})} placeholder="Company Name" style={{width:"100%",padding:"11px 14px",border:`1px solid ${C.g200}`,borderRadius:8,marginBottom:10,fontSize:".86rem",fontFamily:sans}}/>
            <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Phone Number" style={{width:"100%",padding:"11px 14px",border:`1px solid ${C.g200}`,borderRadius:8,marginBottom:10,fontSize:".86rem",fontFamily:sans}}/>
            <input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} placeholder="Account Manager / Office Contact" style={{width:"100%",padding:"11px 14px",border:`1px solid ${C.g200}`,borderRadius:8,marginBottom:10,fontSize:".86rem",fontFamily:sans}}/>
            <select value={form.requestedTier} onChange={e=>setForm({...form,requestedTier:e.target.value})} style={{width:"100%",padding:"11px 14px",border:`1px solid ${C.g200}`,borderRadius:8,marginBottom:10,fontSize:".86rem",fontFamily:sans,background:C.white}}>
              <option value="registered">Member access</option>
              <option value="premium">Premium access</option>
            </select>
            <textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Tell us a little about how you’d like to use the portal" rows={4} style={{width:"100%",padding:"11px 14px",border:`1px solid ${C.g200}`,borderRadius:8,marginBottom:10,fontSize:".86rem",fontFamily:sans,resize:"vertical"}}/>
            <div style={{background:"#f8fafc",border:`1px solid ${C.g200}`,borderRadius:10,padding:"11px 12px",marginBottom:10,fontSize:".76rem",color:C.g700,lineHeight:1.6}}>
              Submit the form and we’ll email the steps needed to complete access.
            </div>
            <button onClick={handleSubmit} disabled={submitting} style={{width:"100%",padding:"13px",background:submitting?C.goldHover:C.gold,color:"#fff",border:"none",borderRadius:8,fontSize:".9rem",fontWeight:600,cursor:submitting?"default":"pointer",fontFamily:sans,marginBottom:14,transition:"background .15s"}}>{submitting?"Submitting…":"Send Request"}</button>
            <p style={{textAlign:"center",fontSize:".82rem",color:C.g500}}>
              Already have access? <button onClick={()=>{setIsRequest(false);setError("");setSent(false);}} style={{background:"none",border:"none",color:C.gold,fontWeight:600,cursor:"pointer",fontFamily:sans}}>Sign In</button>
            </p>
          </>
        ):(
          <>
            <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email Address *" type="email" style={{width:"100%",padding:"11px 14px",border:`1px solid ${C.g200}`,borderRadius:8,marginBottom:10,fontSize:".86rem",fontFamily:sans}}/>
            <input value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Password *" type="password" style={{width:"100%",padding:"11px 14px",border:`1px solid ${C.g200}`,borderRadius:8,marginBottom:18,fontSize:".86rem",fontFamily:sans}}/>
            <button onClick={handleSubmit} disabled={submitting} style={{width:"100%",padding:"13px",background:submitting?C.goldHover:C.gold,color:"#fff",border:"none",borderRadius:8,fontSize:".9rem",fontWeight:600,cursor:submitting?"default":"pointer",fontFamily:sans,marginBottom:14,transition:"background .15s"}}>{submitting?"Signing in…":"Sign In"}</button>
            <p style={{textAlign:"center",fontSize:".82rem",color:C.g500}}>
              Need access? <button onClick={()=>{setIsRequest(true);setError("");setSent(false);}} style={{background:"none",border:"none",color:C.gold,fontWeight:600,cursor:"pointer",fontFamily:sans}}>Request access</button>
            </p>
            <p style={{textAlign:"center",fontSize:".74rem",color:C.g500,marginTop:10,opacity:.6}}>Use the "Demo Logins" button (bottom-right) to test customer, staff, and administrator flows</p>
            <p style={{textAlign:"center",fontSize:".8rem",color:C.g500,marginTop:14}}>
              <button onClick={()=>nav("forgot")} style={{background:"none",border:"none",color:C.gold,fontWeight:600,cursor:"pointer",fontFamily:sans,fontSize:".8rem"}}>Forgot password?</button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══ FORGOT PASSWORD ═══ */
function ForgotPasswordPage({nav}) {
  const [step,setStep]=useState("email");   /* email → otp → newpw → done */
  const [email,setEmail]=useState("");
  const [otp,setOtp]=useState("");
  const [pw,setPw]=useState("");
  const [pw2,setPw2]=useState("");
  const [err,setErr]=useState("");
  const [info,setInfo]=useState("");
  const [busy,setBusy]=useState(false);
  const [debugOtp,setDebugOtp]=useState(""); /* shown when SMTP not configured */

  const requestOtp=async()=>{
    if(!email.trim()){setErr("Please enter your email address.");return;}
    setBusy(true);setErr("");setInfo("");
    try{
      const res=await import("./api").then(m=>m.forgotPassword.request(email.trim().toLowerCase()));
      setDebugOtp(res?.debug_otp||"");
      setInfo("A 6-digit code has been sent to your email. Check your inbox (and spam folder).");
      setStep("otp");
    }catch(e){
      /* API offline — demo fallback */
      const emailLow=email.trim().toLowerCase();
      const allEmails=[
        ...DEMO_ACCOUNTS.map(d=>d.email),
        ...(lsGet(LS.demoUsers)||[]).map(u=>u.email),
      ];
      if(!allEmails.includes(emailLow)){
        setErr("No account found with that email address.");setBusy(false);return;
      }
      const fake=String(Math.floor(100000+Math.random()*900000));
      setDebugOtp(fake);
      setInfo("(Demo mode — no mail server connected. Your code is shown below.)");
      setStep("otp");
    }finally{setBusy(false);}
  };

  const verifyOtp=async()=>{
    if(otp.trim().length!==6){setErr("Please enter the 6-digit code.");return;}
    if(debugOtp&&otp.trim()===debugOtp){setStep("newpw");setErr("");return;}
    setBusy(true);setErr("");
    try{
      await import("./api").then(m=>m.forgotPassword.verify(email,otp.trim()));
      setStep("newpw");
    }catch(e){setErr(e.message||"Invalid or expired code.");}
    finally{setBusy(false);}
  };

  const resetPw=async()=>{
    if(pw.length<8){setErr("Password must be at least 8 characters.");return;}
    if(pw!==pw2){setErr("Passwords do not match.");return;}
    setBusy(true);setErr("");
    try{
      await import("./api").then(m=>m.forgotPassword.reset(email,otp.trim(),pw));
    }catch{
      /* API offline — save new password locally */
    }
    /* Always update localStorage so demo logins work with the new password */
    const emailLow=email.trim().toLowerCase();
    const existing=lsGet(LS.demoUsers)||[];
    const idx=existing.findIndex(u=>u.email===emailLow);
    if(idx>=0){
      existing[idx]={...existing[idx],password:pw};
      lsSet(LS.demoUsers,existing);
    }else{
      /* Built-in DEMO_ACCOUNTS user — add an override entry */
      const base=DEMO_ACCOUNTS.find(d=>d.email===emailLow);
      if(base) lsSet(LS.demoUsers,[...existing,{...base,id:Date.now(),password:pw}]);
    }
    setStep("done");
    setBusy(false);
  };

  const inp={width:"100%",padding:"11px 14px",border:`1px solid ${C.g200}`,borderRadius:8,marginBottom:12,fontSize:".86rem",fontFamily:sans,boxSizing:"border-box"};
  const btn={width:"100%",padding:"13px",background:C.gold,color:"#fff",border:"none",borderRadius:8,fontSize:".9rem",fontWeight:600,cursor:"pointer",fontFamily:sans,marginBottom:10,transition:"background .15s"};

  return (
    <div style={{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(160deg,${C.navy} 0%,${C.navyMid} 100%)`,padding:"60px 20px"}}>
      <div style={{background:C.white,borderRadius:16,padding:"44px 36px",maxWidth:400,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        {/* Logo mark */}
        <svg width="36" height="40" viewBox="0 0 34 38" fill="none" style={{display:"block",margin:"0 auto 16px"}}>
          <path d="M17 1L32 9.2V28.8L17 37L2 28.8V9.2Z" fill={C.gold}/>
          <path d="M20.5 13.8C19.3 12.8 17.8 12.2 16 12.2C12.7 12.2 10 14.8 10 18.8C10 22.8 12.7 25.4 16 25.4C17.8 25.4 19.3 24.8 20.5 23.8" stroke="white" strokeWidth="2.1" strokeLinecap="round" fill="none"/>
          <line x1="22.5" y1="13" x2="22.5" y2="24.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <line x1="26.2" y1="13" x2="26.2" y2="24.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <line x1="22.5" y1="18.8" x2="26.2" y2="18.8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <div style={{fontSize:".58rem",fontWeight:700,letterSpacing:3.5,textTransform:"uppercase",color:C.gold,textAlign:"center",marginBottom:10}}>Chapel Hill Denham · Research</div>

        {step==="email"&&(<>
          <h2 style={{fontFamily:serif,fontSize:"1.4rem",color:C.navy,textAlign:"center",marginBottom:4}}>Forgot Password</h2>
          <p style={{color:C.g500,fontSize:".85rem",textAlign:"center",marginBottom:22}}>Enter your registered email and we'll send you a reset code.</p>
          {err&&<div style={{background:"#fef2f2",color:C.red,padding:"9px 13px",borderRadius:7,fontSize:".81rem",marginBottom:12}}>{err}</div>}
          <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&requestOtp()} placeholder="Email Address" type="email" style={inp}/>
          <button onClick={requestOtp} disabled={busy} style={btn}>{busy?"Sending…":"Send Reset Code"}</button>
          <p style={{textAlign:"center",fontSize:".82rem",color:C.g500}}>
            <button onClick={()=>nav("login")} style={{background:"none",border:"none",color:C.gold,fontWeight:600,cursor:"pointer",fontFamily:sans}}>← Back to Sign In</button>
          </p>
        </>)}

        {step==="otp"&&(<>
          <h2 style={{fontFamily:serif,fontSize:"1.4rem",color:C.navy,textAlign:"center",marginBottom:4}}>Enter Reset Code</h2>
          <p style={{color:C.g500,fontSize:".85rem",textAlign:"center",marginBottom:10}}>Check your inbox for a 6-digit code sent to <strong style={{color:C.navy}}>{email}</strong>.</p>
          {info&&<div style={{background:"#f0f9ff",color:"#0369a1",padding:"9px 13px",borderRadius:7,fontSize:".81rem",marginBottom:10,lineHeight:1.5}}>{info}</div>}
          {debugOtp&&<div style={{background:"#fef9c3",border:"1px solid #fde047",padding:"10px 14px",borderRadius:8,marginBottom:12,textAlign:"center"}}>
            <p style={{fontSize:".72rem",color:"#854d0e",fontWeight:600,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Demo — your code</p>
            <p style={{fontFamily:"monospace",fontSize:"1.6rem",fontWeight:700,color:C.navy,letterSpacing:6}}>{debugOtp}</p>
          </div>}
          {err&&<div style={{background:"#fef2f2",color:C.red,padding:"9px 13px",borderRadius:7,fontSize:".81rem",marginBottom:12}}>{err}</div>}
          <input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} onKeyDown={e=>e.key==="Enter"&&verifyOtp()}
            placeholder="000000" maxLength={6}
            style={{...inp,textAlign:"center",fontSize:"1.4rem",fontFamily:"monospace",letterSpacing:6}}/>
          <button onClick={verifyOtp} disabled={busy} style={btn}>{busy?"Verifying…":"Verify Code"}</button>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:".81rem"}}>
            <button onClick={()=>{setStep("email");setErr("");setInfo("");setOtp("");}} style={{background:"none",border:"none",color:C.g500,cursor:"pointer",fontFamily:sans}}>← Change email</button>
            <button onClick={requestOtp} disabled={busy} style={{background:"none",border:"none",color:C.gold,fontWeight:600,cursor:"pointer",fontFamily:sans}}>Resend code</button>
          </div>
        </>)}

        {step==="newpw"&&(<>
          <h2 style={{fontFamily:serif,fontSize:"1.4rem",color:C.navy,textAlign:"center",marginBottom:4}}>Set New Password</h2>
          <p style={{color:C.g500,fontSize:".85rem",textAlign:"center",marginBottom:22}}>Choose a new password for <strong style={{color:C.navy}}>{email}</strong>.</p>
          {err&&<div style={{background:"#fef2f2",color:C.red,padding:"9px 13px",borderRadius:7,fontSize:".81rem",marginBottom:12}}>{err}</div>}
          <input value={pw} onChange={e=>setPw(e.target.value)} placeholder="New Password (min 8 chars)" type="password" style={inp}/>
          <input value={pw2} onChange={e=>setPw2(e.target.value)} onKeyDown={e=>e.key==="Enter"&&resetPw()} placeholder="Confirm New Password" type="password" style={inp}/>
          <button onClick={resetPw} disabled={busy} style={btn}>{busy?"Saving…":"Set Password"}</button>
        </>)}

        {step==="done"&&(<>
          <div style={{width:64,height:64,borderRadius:"50%",background:"#dcfce7",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#16a34a"/><polyline points="9,16 13,21 23,11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
          </div>
          <h2 style={{fontFamily:serif,fontSize:"1.4rem",color:C.navy,textAlign:"center",marginBottom:8}}>Password Updated</h2>
          <p style={{color:C.g500,fontSize:".86rem",textAlign:"center",marginBottom:22,lineHeight:1.6}}>Your password has been changed. You can now sign in with your new credentials.</p>
          <button onClick={()=>nav("login")} style={btn}>Go to Sign In</button>
        </>)}
      </div>
    </div>
  );
}

function mergeBannerMedia(slides, media = []) {
  return slides.map((slide, i) => ({...slide, ...(media[i] || DEFAULT_BANNER_MEDIA[i] || {})}));
}

/* ═══ HOME ═══ */
function HeroCarousel({slides, nav}) {
  const [active,setActive]=useState(0);
  useEffect(()=>{
    if(!slides.length) return;
    const current=slides[active]||slides[0];
    const delay=Math.max(3, Number(current?.duration)||10)*1000;
    const t=setTimeout(()=>setActive(v=>(v+1)%slides.length),delay);
    return()=>clearTimeout(t);
  },[slides,active]);
  const current=slides[active]||slides[0];
  if(!current) return null;
  return (
    <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,overflow:"hidden",boxShadow:"0 18px 44px rgba(0,0,0,0.16)"}}>
      <div style={{position:"relative",height:360,overflow:"hidden",background:`linear-gradient(160deg, ${current.bgA} 0%, ${current.bgB} 44%, ${current.bgC} 100%)`}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 18% 20%, rgba(255,255,255,0.12) 0%, transparent 18%), radial-gradient(circle at 82% 18%, rgba(185,114,49,0.16) 0%, transparent 20%), radial-gradient(circle at 78% 82%, rgba(255,255,255,0.08) 0%, transparent 22%)"}}/>
        <div style={{position:"absolute",inset:0,opacity:.18,backgroundImage:"linear-gradient(rgba(255,255,255,0.28) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.28) 1px, transparent 1px)",backgroundSize:"68px 68px"}}/>
        <div style={{position:"relative",zIndex:1,padding:"20px",height:"100%",display:"grid",gridTemplateColumns:"minmax(280px, 1fr) minmax(320px, 1.02fr)",gap:16,alignItems:"stretch",overflow:"hidden"}}>
          <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",minHeight:0,padding:"10px 0 8px 8px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <span style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.14)",color:"#fff",padding:"6px 10px",borderRadius:999,fontSize:".64rem",fontWeight:800,textTransform:"uppercase",letterSpacing:.9}}>{current.tag}</span>
              <span style={{color:"rgba(255,255,255,0.74)",fontSize:".7rem",letterSpacing:1.4,textTransform:"uppercase"}}>{String(active+1).padStart(2,"0")} / {String(slides.length).padStart(2,"0")}</span>
            </div>
            <div>
              <h3 style={{fontFamily:serif,fontSize:"2rem",color:C.white,fontWeight:500,lineHeight:1.08,marginBottom:12,maxWidth:420}}>{current.title}</h3>
              <p style={{fontSize:".95rem",color:"rgba(255,255,255,0.78)",lineHeight:1.78,maxWidth:430,marginBottom:20}}>{current.excerpt}</p>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <button onClick={()=>current.ctaRoute ? nav(current.ctaRoute) : nav("reports")} style={{padding:"10px 18px",background:C.gold,color:"#fff",border:"none",borderRadius:8,fontSize:".8rem",fontWeight:700,cursor:"pointer",fontFamily:sans}}>{current.ctaLabel||"View report"}</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,maxWidth:220,marginTop:8}}>
              {slides.map((slide,i)=>(
                <button key={slide.title} onClick={()=>setActive(i)} style={{height:9,borderRadius:999,border:"none",cursor:"pointer",background:i===active?C.gold:"rgba(255,255,255,0.24)"}} aria-label={`Slide ${i+1}`}/>
              ))}
            </div>
          </div>
          <div style={{minHeight:0,position:"relative"}}>
            <div key={current.mediaUrl || active} style={{
              position:"absolute",
              inset:0,
              borderRadius:18,
              overflow:"hidden",
              border:"1px solid rgba(255,255,255,0.12)",
              backgroundImage:current.mediaUrl
                ? `linear-gradient(180deg, rgba(6,38,45,0.16), rgba(6,38,45,0.44)), url(${current.mediaUrl})`
                : `linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(185,114,49,0.22) 100%)`,
              backgroundPosition:current.mediaPosition || "center center",
              backgroundSize:"cover",
              animation:"heroFade 1.2s ease",
              boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.04)"
            }}>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(145deg, rgba(6,38,45,0.28) 0%, rgba(6,38,45,0.04) 44%, rgba(6,38,45,0.35) 100%)"}}/>
              <div style={{position:"absolute",left:16,right:16,bottom:16,display:"grid",gridTemplateColumns:"1fr auto",alignItems:"end",gap:12}}>
                <div style={{maxWidth:250}}>
                  <div style={{fontSize:".62rem",fontWeight:800,textTransform:"uppercase",letterSpacing:1.8,color:"rgba(255,255,255,0.72)",marginBottom:6}}>{current.streamTitle || "Research spotlight"}</div>
                  <div style={{fontSize:"1.02rem",fontWeight:700,color:"#fff",lineHeight:1.25}}>{current.title}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Home({nav,user}) {
  const {reports,analysts,funds,bannerMedia}=useData();
  const published = useMemo(()=>reports.filter(r=>r.status==="published").sort((a,b)=>new Date(b.date)-new Date(a.date)),[reports]);
  const deskReports = useMemo(()=>published.filter(r=>ga(r.aid,analysts)?.role==="analyst" || ga(r.aid,analysts)?.name==="Research Desk"),[published,analysts]);
  const carouselSlides = useMemo(()=>[
    {
      title:"2026 Yearly Digest",
      tag:"Annual report",
      bgA:"rgba(6,38,45,0.98)",
      bgB:"rgba(11,53,64,0.96)",
      bgC:"rgba(8,18,21,0.94)",
      streamTitle:"Featured reading",
      excerpt:"A concise annual digest with the most important market themes, portfolio ideas, and macro calls in one place.",
      ctaLabel:"Read digest",
      ctaRoute:"reports",
      duration:10,
      metrics:[{l:"Reports",v:published.length},{l:"Desk",v:deskReports.length},{l:"Tier",v:tierLabel(user?.tier)}],
      cards:[
        {badge:"Digest", title:published[0]?.title||"Latest report", text:published[0]?.ex||"Latest summary from the research desk.", tag:published[0]?.access||"free", color:C.gold},
        {badge:"Macro", title:"What moved markets", text:"A short read on rates, FX, inflation, and sector leadership.", tag:"free", color:"#22c55e"},
        {badge:"Desk", title:"Research desk support", text:"Central coordination for interns and submissions.", tag:"desk", color:"#60a5fa"},
      ],
    },
    {
      title:"Gain access to full insights",
      tag:"Client access",
      bgA:"rgba(8,26,34,0.98)",
      bgB:"rgba(13,44,52,0.96)",
      bgC:"rgba(10,16,19,0.94)",
      streamTitle:"Access workflow",
      excerpt:"Request access through your account contact, then sign in to unlock the right report tier and your library.",
      ctaLabel:"Request access",
      ctaRoute:"register",
      duration:10,
      metrics:[{l:"Published",v:published.length},{l:"Analysts",v:analysts.filter(a=>a.role!=="intern").length},{l:"Funds",v:funds.length}],
      cards:[
        {badge:"Member", title:"Contact your office", text:"Your account manager issues the access code.", tag:"registered", color:"#60a5fa"},
        {badge:"Portal", title:"Unlock the library", text:"Sign in to see your tailored reading list and archive.", tag:"portal", color:C.gold},
        {badge:"Tier", title:"Choose the right level", text:"Access is grouped by customer tier and category.", tag:"control", color:"#22c55e"},
      ],
    },
    {
      title:"Sector coverage and market briefings",
      tag:"Coverage",
      bgA:"rgba(10,28,37,0.98)",
      bgB:"rgba(17,48,60,0.96)",
      bgC:"rgba(12,17,20,0.94)",
      streamTitle:"Live coverage",
      excerpt:"From macro to sector and single-name views, the portal keeps the latest briefing close to the client journey.",
      ctaLabel:"Meet the team",
      ctaRoute:"analysts",
      duration:10,
      metrics:[{l:"Free",v:"1 layer"},{l:"Registered",v:"2 layer"},{l:"Premium",v:"3 layer"}],
      cards:[
        {badge:"Macro", title:"Rates and FX", text:"Simple market notes and morning colour for customers.", tag:"free", color:"#22c55e"},
        {badge:"Equity", title:"Named coverage", text:"Single-stock reports and portfolio ideas by sector.", tag:"member", color:"#60a5fa"},
        {badge:"Desk", title:"Support layer", text:"A central desk keeps the coverage flow organised.", tag:"desk", color:C.gold},
      ],
    },
    {
      title:"A live research desk library",
      tag:"Library",
      bgA:"rgba(7,31,39,0.98)",
      bgB:"rgba(11,48,59,0.96)",
      bgC:"rgba(8,14,18,0.94)",
      streamTitle:"Archive access",
      excerpt:"The library and archive should feel like a working desk, not a static brochure.",
      ctaLabel:"Open library",
      ctaRoute:"docbank",
      duration:10,
      metrics:[{l:"Support",v:"desk"},{l:"Interns",v:"approved"},{l:"Library",v:"live"}],
      cards:[
        {badge:"Library", title:"Recent reads", text:"Customers can continue from where they stopped.", tag:"read", color:"#22c55e"},
        {badge:"Intern", title:"Supervisor flow", text:"Interns keep their own submission and approval path.", tag:"review", color:"#60a5fa"},
        {badge:"Desk", title:"Shared authorship", text:"Desk support can carry the support identity for synthesis pieces.", tag:"author", color:C.gold},
      ],
    },
  ],[published, deskReports, analysts, funds, user]);
  const slides = useMemo(()=>mergeBannerMedia(carouselSlides,bannerMedia),[carouselSlides,bannerMedia]);
  return (<>
    <section style={{background:`radial-gradient(circle at 14% 18%, rgba(185,114,49,0.18) 0%, transparent 25%), linear-gradient(145deg,#04161f 0%,${C.navy} 45%,${C.navyMid} 100%)`,padding:"54px 0 28px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,opacity:.05,backgroundImage:"linear-gradient(rgba(255,255,255,0.65) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.65) 1px, transparent 1px)",backgroundSize:"84px 84px",pointerEvents:"none"}}/>
      <div style={{maxWidth:1320,margin:"0 auto",padding:"0 40px",position:"relative",zIndex:1}}>
        <div className="home-hero-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:28,alignItems:"start"}}>
          <div style={{paddingTop:14}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(185,114,49,0.12)",border:"1px solid rgba(185,114,49,0.24)",color:C.gold,fontSize:".62rem",fontWeight:800,textTransform:"uppercase",letterSpacing:2.6,padding:"6px 14px",borderRadius:999,marginBottom:20}}>
              <span style={{width:5,height:5,borderRadius:"50%",background:C.gold}}/>
              Independent research since 2005
            </div>
            <h1 style={{fontFamily:serif,fontSize:"2.9rem",color:C.white,fontWeight:500,lineHeight:1.08,marginBottom:14,maxWidth:640}}>
              <span style={{display:"block"}}>Insights that move</span>
              <span style={{display:"block",fontStyle:"italic",color:C.gold,marginTop:2}}>markets forward</span>
            </h1>
            <p style={{fontSize:".95rem",color:"rgba(255,255,255,0.68)",lineHeight:1.8,maxWidth:520,marginBottom:20}}>In-depth equity, fixed income, and macroeconomic research across Nigerian and African capital markets.</p>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:18}}>
              <button onClick={()=>nav("reports")} style={{padding:"12px 18px",background:C.gold,color:"#fff",border:"none",borderRadius:8,fontSize:".84rem",fontWeight:700,cursor:"pointer",fontFamily:sans}}>Browse reports</button>
              <button onClick={()=>nav("analysts")} style={{padding:"12px 18px",background:"rgba(255,255,255,0.04)",color:"#fff",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,fontSize:".84rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>Meet the team</button>
            </div>
          </div>
          <HeroCarousel slides={slides} nav={nav}/>
        </div>
      </div>
    </section>

    <section style={{padding:"24px 0 58px"}}>
      <div style={{maxWidth:1320,margin:"0 auto",padding:"0 40px"}}>
        <SH title="Latest reports" sub="Current reports and desk-led items in one view." link="View archive" onLink={()=>nav("reports")}/>
        <div className="report-grid-mobile" style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:22}}>
          {published.slice(0,6).map(r=><RC key={r.id} r={r} nav={nav} user={user}/>)}
        </div>
      </div>
    </section>

    <section style={{padding:"10px 0 66px",background:C.offWhite}}>
      <div style={{maxWidth:1320,margin:"0 auto",padding:"0 40px"}}>
        <div className="analyst-grid-mobile" style={{display:"grid",gridTemplateColumns:"1fr .9fr",gap:28,alignItems:"start"}}>
          <div>
            <SH title="Analysts" sub="The desk sits alongside the live analysts and supports intern publication." link="Analyst directory" onLink={()=>nav("analysts")}/>
            <div className="analyst-grid-mobile" style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:18}}>
              {analysts.filter(a=>a.role!=="intern").slice(0,4).map(a=>(
                <div key={a.id} onClick={()=>nav("analyst",{id:a.id})} style={{background:C.white,border:`1px solid ${C.g200}`,borderRadius:16,padding:"22px 20px",cursor:"pointer",boxShadow:"0 1px 4px rgba(6,38,45,0.04)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                    <AnalystAvatar analyst={a} size={50} fontSize="1rem"/>
                    <div>
                      <div style={{fontFamily:serif,fontSize:"1rem",color:C.navy,fontWeight:600,marginBottom:2}}>{a.name}</div>
                      <div style={{fontSize:".68rem",color:C.gold,fontWeight:800,textTransform:"uppercase",letterSpacing:.8}}>{a.title}</div>
                    </div>
                  </div>
                  <p style={{fontSize:".78rem",color:C.g700,lineHeight:1.65,margin:0,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{a.cov}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SH title="Funds" sub="Calibri now applies here too, with a lighter card treatment." link="View funds" onLink={()=>nav("funds")}/>
            <div className="analyst-grid-mobile" style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
              {funds.map(f=>{
                const ret=(f.perf&&f.perf["YTD"])||0;
                const pos=ret>=0;
                return (
                  <div key={f.id} style={{background:C.white,borderRadius:16,border:`1px solid ${C.g200}`,padding:"18px"}}>
                    <div style={{fontSize:".6rem",color:C.g500,textTransform:"uppercase",letterSpacing:1.8,marginBottom:6,fontWeight:800}}>{f.type}</div>
                    <div style={{fontFamily:serif,fontSize:"1.02rem",color:C.navy,fontWeight:600,lineHeight:1.25,marginBottom:10}}>{f.abbr}</div>
                    <div style={{fontFamily:serif,fontSize:"1.45rem",color:pos?"#16a34a":"#dc2626",fontWeight:600,lineHeight:1}}>{pos?"+":""}{ret.toFixed(1)}%</div>
                    <div style={{fontSize:".62rem",color:C.g500,marginTop:4,textTransform:"uppercase",letterSpacing:1.4}}>YTD return</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  </>);
}

/* ═══ SINGLE REPORT ═══ */
function ReportSingle({id,nav,user}) {
  const {reports,analysts,categoryRules}=useData();
  const r=reports.find(x=>x.id===id);
  if(!r) return <div style={{padding:80,textAlign:"center",color:C.g500}}>Report not found.</div>;
  const cat=gc(r.cat),pc=gpc(r.cat),a=r.aid?ga(r.aid,analysts):null;
  const dc=cat?.p?`${pc?.name} · ${cat.name}`:cat?.name;
  const has=canAccess(effectiveAccess(r,categoryRules),user);
  return (<>
    <section style={{background:`linear-gradient(160deg,${C.navy} 0%,${C.navyMid} 100%)`,padding:"48px 0",position:"relative"}}>
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${C.goldGlow},transparent)`}}/>
      <div style={{maxWidth:1260,margin:"0 auto",padding:"0 40px"}}>
        <p style={{color:C.gold,fontSize:".78rem",marginBottom:7,letterSpacing:.4,fontWeight:500}}>{dc}</p>
        <h1 style={{fontFamily:serif,fontSize:"2rem",color:C.white,fontWeight:500,marginBottom:6}}>{r.title}</h1>
      </div>
    </section>
    <div style={{maxWidth:760,margin:"0 auto",padding:"44px 24px"}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:28,marginBottom:28,paddingBottom:22,borderBottom:`1px solid ${C.g200}`}}>
        {[{l:"Published",v:fd(r.date)},a&&{l:"Analyst",v:a.name},{l:"Category",v:dc},{l:"Access",v:effectiveAccess(r,categoryRules)==="premium"?"Research Team":effectiveAccess(r,categoryRules)==="registered"?"Members":"Free"}].filter(Boolean).map((m,i)=>(
          <div key={i}><span style={{color:C.g500,display:"block",fontSize:".7rem",textTransform:"uppercase",letterSpacing:.4,marginBottom:2,fontWeight:500}}>{m.l}</span><span style={{color:C.navy,fontWeight:600,fontSize:".86rem"}}>{m.v}</span></div>
        ))}
      </div>
      <div style={{fontSize:"1rem",lineHeight:1.8,color:C.g700}}>
        <p>{r.ex}</p>
        {has&&r.body&&r.body.split("\n\n").map((p,i)=><p key={i} style={{marginTop:16,maxWidth:720}}>{p}</p>)}
        {has&&<><h3 style={{fontFamily:serif,color:C.navy,fontSize:"1.2rem",marginTop:28,marginBottom:10,fontWeight:600}}>Key Highlights</h3><ul style={{paddingLeft:20,lineHeight:2,maxWidth:720}}><li>Revenue growth driven by robust demand</li><li>Improved margins reflecting operational efficiencies</li><li>Favourable policy environment supporting sector</li></ul></>}
        {!has&&<p style={{marginTop:16,color:C.g500}}>The full analysis covers earnings drivers, margin expansion, competitive positioning, and valuation methodology…</p>}
      </div>
      {!has&&<GatedOverlay access={effectiveAccess(r,categoryRules)} user={user} nav={nav}/>}
      {has&&<div style={{background:C.g100,border:`1px solid ${C.g200}`,borderRadius:10,padding:22,display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap",marginTop:36}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:40,height:40,background:C.navy,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",color:C.white,fontSize:".68rem",fontWeight:800}}>PDF</div>
          <div><strong style={{fontSize:".88rem",color:C.navy}}>{r.title}</strong><br/><span style={{fontSize:".75rem",color:C.g500}}>Download full report</span></div>
        </div>
        <button onClick={async()=>{await generateReportPDF(r);}} style={{padding:"9px 22px",background:C.gold,color:"#fff",border:"none",borderRadius:7,fontSize:".8rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>↓ Download PDF</button>
      </div>}
      {a&&<div style={{marginTop:36,padding:"22px",background:C.offWhite,borderRadius:10,border:`1px solid ${C.g200}`,display:"flex",alignItems:"center",gap:16,cursor:"pointer",...s({opacity:1},{opacity:.85})}} onClick={()=>nav("analyst",{id:a.id})}>
        <AnalystAvatar analyst={a} size={48} fontSize="1.1rem"/>
        <div><p style={{fontSize:".72rem",color:C.g500,textTransform:"uppercase",letterSpacing:.4,marginBottom:2}}>Analyst</p><p style={{fontWeight:700,color:C.navy,fontSize:".9rem"}}>{a.name}</p><p style={{color:C.g500,fontSize:".78rem"}}>{a.cov}</p></div>
        <span style={{marginLeft:"auto",color:C.gold,fontSize:".8rem",fontWeight:600}}>View Profile →</span>
      </div>}
    </div>
  </>);
}

/* ═══ REPORTS ARCHIVE ═══ */
const SORT_OPTIONS=[
  {v:"date_desc",l:"Newest first"},
  {v:"date_asc",l:"Oldest first"},
  {v:"title_asc",l:"Title A–Z"},
  {v:"access",l:"Free first"},
];
function ReportsPage({nav,user,initCat}) {
  const {reports,analysts,categoryRules}=useData();
  const [f,sf]=useState(initCat||"all");
  const [q,setQ]=useState("");
  const [sort,setSort]=useState("date_desc");
  const isStaff=user&&["admin","analyst","intern"].includes(user.tier);
  const visible=reports.filter(r=>r.status==="published"||(isStaff&&r.status==="pending"));
  const filtered=useMemo(()=>{
    let base=visible.filter(r=>r.status==="published");
    if(f!=="all"){const ch=childCats(f);base=ch.length>0?base.filter(r=>r.cat===f||ch.some(c=>c.id===r.cat)):base.filter(r=>r.cat===f);}
    const ql=q.trim().toLowerCase();
    if(ql){
      base=base.filter(r=>{
        const a=r.aid?ga(r.aid,analysts):null;
        return r.title.toLowerCase().includes(ql)||r.ex?.toLowerCase().includes(ql)||(a?.name.toLowerCase().includes(ql));
      });
    }
    base=[...base];
    if(sort==="date_desc") base.sort((a,b)=>new Date(b.date)-new Date(a.date));
    else if(sort==="date_asc") base.sort((a,b)=>new Date(a.date)-new Date(b.date));
    else if(sort==="title_asc") base.sort((a,b)=>a.title.localeCompare(b.title));
    else if(sort==="access") base.sort((a,b)=>["free","registered","premium"].indexOf(effectiveAccess(a,categoryRules))-["free","registered","premium"].indexOf(effectiveAccess(b,categoryRules)));
    return base;
  },[f,visible,q,sort,analysts,categoryRules]);
  const hasFilter=f!=="all"||q.trim();
  return (<>
    <section style={{background:`linear-gradient(160deg,${C.navy} 0%,${C.navyMid} 100%)`,padding:"52px 0"}}>
      <div style={{maxWidth:1260,margin:"0 auto",padding:"0 40px"}}>
        <h1 style={{fontFamily:serif,fontSize:"2.2rem",color:C.white,fontWeight:500,marginBottom:8}}>Research Reports</h1>
        <p style={{color:"rgba(255,255,255,0.48)",fontSize:".88rem"}}>Browse our latest research publications and market analysis</p>
      </div>
    </section>
    <section style={{padding:"48px 0"}}><div style={{maxWidth:1260,margin:"0 auto",padding:"0 40px"}}>
      {/* Filter + search row */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,marginBottom:18}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          <Pill active={f==="all"} onClick={()=>sf("all")}>All</Pill>
          {pCats().map(c=><Pill key={c.id} active={f===c.id} onClick={()=>sf(c.id)}>{c.name}</Pill>)}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {hasFilter&&<button onClick={()=>{sf("all");setQ("");}} style={{padding:"6px 12px",background:C.g100,color:C.g500,border:`1px solid ${C.g200}`,borderRadius:16,fontSize:".74rem",cursor:"pointer",fontFamily:sans}}>Clear ✕</button>}
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search title, excerpt, analyst…" style={{padding:"8px 14px",border:`1px solid ${C.g200}`,borderRadius:20,fontSize:".82rem",fontFamily:sans,color:C.navy,width:240,background:C.white,outline:"none"}}/>
          <select value={sort} onChange={e=>setSort(e.target.value)} style={{padding:"8px 12px",border:`1px solid ${C.g200}`,borderRadius:8,fontSize:".8rem",fontFamily:sans,color:C.navy,background:C.white,cursor:"pointer",outline:"none"}}>
            {SORT_OPTIONS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
      </div>
      <p style={{fontSize:".76rem",color:C.g500,marginBottom:22}}>{filtered.length} report{filtered.length!==1?"s":""}{hasFilter?" matching filters":""}</p>
      <div className="report-grid-mobile" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:24}}>
        {filtered.length>0
          ?filtered.map(r=><RC key={r.id} r={r} nav={nav} user={user}/>)
          :<div style={{gridColumn:"1/-1",padding:60,textAlign:"center",color:C.g500,background:C.white,borderRadius:12,border:`1px solid ${C.g200}`}}>No reports match your filters. <button onClick={()=>{sf("all");setQ("");}} style={{background:"none",border:"none",color:C.gold,cursor:"pointer",fontFamily:sans,fontSize:"inherit"}}>Clear filters</button></div>}
      </div>
    </div></section>
  </>); 
}

/* ═══ PERSONAL LIBRARY ═══ */
function LibraryPage({nav,user}) {
  const {reports,analysts,categoryRules,recentViews}=useData();
  const accessible = useMemo(()=>reports.filter(r=>r.status==="published"&&canAccess(effectiveAccess(r,categoryRules),user)).sort((a,b)=>new Date(b.date)-new Date(a.date)),[reports,categoryRules,user]);
  const recentReports = useMemo(()=>{
    const ids = recentViews.filter(v=>v.type==="report").map(v=>String(v.id));
    return ids.map(id=>reports.find(r=>String(r.id)===id)).filter(Boolean);
  },[recentViews,reports]);
  const recentDocs = useMemo(()=>recentViews.filter(v=>v.type==="doc").slice(0,4),[recentViews]);
  const savedCount = accessible.length;
  const newThisMonth = accessible.filter(r=>new Date(r.date) >= new Date("2026-04-01T00:00:00")).length;
  return (<>
    <section style={{background:`linear-gradient(160deg,${C.navy} 0%,${C.navyMid} 100%)`,padding:"52px 0"}}>
      <div style={{maxWidth:1260,margin:"0 auto",padding:"0 40px"}}>
        <p style={{color:C.gold,fontSize:".6rem",textTransform:"uppercase",letterSpacing:3,fontWeight:700,marginBottom:10,opacity:.9}}>Subscriber Library</p>
        <h1 style={{fontFamily:serif,fontSize:"2.2rem",color:C.white,fontWeight:500,marginBottom:8}}>My Library</h1>
        <p style={{color:"rgba(255,255,255,0.48)",fontSize:".88rem",maxWidth:720}}>Pick up where you left off and return to the reports, desk notes, and client-ready views that matter most.</p>
      </div>
    </section>

    <section style={{padding:"40px 0"}}>
      <div style={{maxWidth:1260,margin:"0 auto",padding:"0 40px"}}>
        <div className="library-stats" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>
          {[
            {l:"Accessible Reports",v:savedCount,sub:"Current library size"},
            {l:"Recent Reads",v:recentReports.length,sub:"Recently opened"},
            {l:"New This Month",v:newThisMonth,sub:"April publications"},
            {l:"Research Desk",v:analysts.find(a=>a.name==="Research Desk")?.name?1:0,sub:"Desk support"},
          ].map((s,i)=>(
            <div key={i} style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"20px 18px"}}>
              <div style={{fontSize:".66rem",textTransform:"uppercase",letterSpacing:1.6,color:C.gold,fontWeight:800,marginBottom:8}}>{s.l}</div>
              <div style={{fontFamily:serif,fontSize:"1.6rem",fontWeight:600,color:C.navy,marginBottom:4}}>{s.v}</div>
              <div style={{fontSize:".77rem",color:C.g500}}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="library-main-grid" style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:24,alignItems:"start"}}>
          <div>
            <SH title="Recently Viewed" sub="Continue reading from the last reports you opened." link="View reports" onLink={()=>nav("reports")}/>
            {recentReports.length===0
              ?<div style={{padding:"38px",background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,color:C.g500,fontSize:".84rem"}}>No recent report activity yet. Open a report and it will appear here.</div>
              :<div className="library-recent-grid" style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:18}}>{recentReports.slice(0,4).map(r=><RC key={r.id} r={r} nav={nav} user={user}/>)}</div>
            }
          </div>
          <div className="library-actions">
            <SH title="Quick Actions" sub="Straight paths to the main sections of the portal."/>
            <div style={{display:"grid",gap:12,marginBottom:24}}>
              {[
                {l:"Browse reports",d:"Open the latest published reports and filter by category.",a:()=>nav("reports")},
                {l:"Meet the analysts",d:"Review coverage, bios, and the desk structure.",a:()=>nav("analysts")},
                {l:"Contact the team",d:"Route a query to the research mailbox or office contact.",a:()=>nav("contact")},
              ].map((x,i)=>(
                <button key={i} onClick={x.a} style={{textAlign:"left",background:C.white,border:`1px solid ${C.g200}`,borderRadius:12,padding:"16px 18px",cursor:"pointer",fontFamily:sans}}>
                  <div style={{fontSize:".9rem",fontWeight:700,color:C.navy,marginBottom:4}}>{x.l}</div>
                  <div style={{fontSize:".78rem",color:C.g500,lineHeight:1.6}}>{x.d}</div>
                </button>
              ))}
            </div>
            <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"20px 18px"}}>
              <div style={{fontSize:".68rem",fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:C.gold,marginBottom:8}}>Reading list</div>
              <p style={{fontSize:".84rem",color:C.g700,lineHeight:1.7,marginBottom:14}}>Your most relevant published research is grouped here for quick scanning and follow-up.</p>
              <div style={{display:"grid",gap:10}}>
                {accessible.slice(0,4).map(r=>(
                  <button key={r.id} onClick={()=>nav("report",{id:r.id})} style={{padding:"12px 14px",textAlign:"left",background:C.g100,border:"none",borderRadius:10,cursor:"pointer",fontFamily:sans}}>
                    <div style={{fontSize:".82rem",fontWeight:700,color:C.navy,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</div>
                    <div style={{fontSize:".72rem",color:C.g500,display:"flex",justifyContent:"space-between",gap:8}}>
                      <span>{gc(r.cat)?.name||"Research"}</span>
                      <span>{fd(r.date)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {recentDocs.length>0&&(
              <div style={{marginTop:18,background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"20px 18px"}}>
                <div style={{fontSize:".68rem",fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:C.gold,marginBottom:8}}>Recent files</div>
                <div style={{display:"grid",gap:10}}>
                  {recentDocs.map(d=>(
                    <div key={`${d.type}-${d.id}`} style={{padding:"11px 12px",background:C.offWhite,border:`1px solid ${C.g200}`,borderRadius:10}}>
                      <div style={{fontSize:".8rem",fontWeight:700,color:C.navy,marginBottom:3}}>{d.title}</div>
                      <div style={{fontSize:".72rem",color:C.g500}}>Opened in the Research Library</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  </>);
}

/* ═══ ANALYSTS LIST PAGE ═══ */
function ReaderActivityTab({nav,title="Reader Activity",sub="Track what is being read right now from the current portal session."}) {
  const {recentViews,reports,library}=useData();
  const items = recentViews.slice(0,8).map(view=>{
    if(view.type==="report"){
      const report = reports.find(r=>String(r.id)===String(view.id));
      return {
        key:`report-${view.id}`,
        title:view.title || report?.title || "Report",
        meta:gc(view.category || report?.cat)?.name || "Research report",
        when:view.viewedAt,
        action:()=>nav("report",{id:Number(view.id)}),
        cta:"Open report",
      };
    }
    const doc = library.find(d=>String(d.id)===String(view.id));
    return {
      key:`doc-${view.id}`,
      title:view.title || doc?.title || "Library document",
      meta:"Research Library file",
      when:view.viewedAt,
      action:()=>nav("docbank"),
      cta:"Open library",
    };
  });
  const categorySummary = items.reduce((acc,item)=>{
    acc[item.meta]=(acc[item.meta]||0)+1;
    return acc;
  },{});
  const topCategories = Object.entries(categorySummary).sort((a,b)=>b[1]-a[1]).slice(0,3);

  return (
    <div>
      <SH title={title} sub={sub}/>
      {items.length===0 ? (
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"44px 36px",color:C.g500}}>
          No reading activity has been captured yet. Open reports or library files and the latest activity will appear here.
        </div>
      ) : (
        <div className="reader-activity-grid" style={{display:"grid",gridTemplateColumns:"1.2fr .8fr",gap:20}}>
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,overflow:"hidden"}}>
            <div style={{padding:"18px 20px",borderBottom:`1px solid ${C.g100}`}}>
              <div style={{fontSize:".68rem",fontWeight:800,letterSpacing:1.8,textTransform:"uppercase",color:C.gold,marginBottom:6}}>Current Reading</div>
              <p style={{fontSize:".82rem",color:C.g500,lineHeight:1.6}}>Use this view to see what has been opened most recently and jump back into the exact report or library area.</p>
            </div>
            <div style={{display:"grid"}}>
              {items.map(item=>(
                <button key={item.key} onClick={item.action} style={{padding:"15px 18px",textAlign:"left",background:C.white,border:"none",borderBottom:`1px solid ${C.g100}`,cursor:"pointer",fontFamily:sans}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:".84rem",fontWeight:700,color:C.navy,marginBottom:5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title}</div>
                      <div style={{fontSize:".74rem",color:C.g500}}>{item.meta}</div>
                    </div>
                    <div style={{flexShrink:0,textAlign:"right"}}>
                      <div style={{fontSize:".7rem",color:C.g500,marginBottom:6}}>{new Date(item.when).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
                      <div style={{fontSize:".72rem",fontWeight:700,color:C.gold}}>{item.cta}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gap:16,alignContent:"start"}}>
            <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"20px 18px"}}>
              <div style={{fontSize:".68rem",fontWeight:800,letterSpacing:1.8,textTransform:"uppercase",color:C.gold,marginBottom:8}}>Reading Summary</div>
              <div style={{display:"grid",gap:8}}>
                {topCategories.map(([label,count])=>(
                  <div key={label} style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:".8rem",color:C.g700}}>
                    <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</span>
                    <strong style={{color:C.navy}}>{count}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"20px 18px"}}>
              <div style={{fontSize:".68rem",fontWeight:800,letterSpacing:1.8,textTransform:"uppercase",color:C.gold,marginBottom:8}}>What This Is</div>
              <p style={{fontSize:".82rem",lineHeight:1.7,color:C.g700}}>This is not a subscriber library. It is the staff view for quickly tracking what is currently being read and reopening it without switching between sections.</p>
            </div>
            <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"20px 18px"}}>
              <div style={{fontSize:".68rem",fontWeight:800,letterSpacing:1.8,textTransform:"uppercase",color:C.gold,marginBottom:8}}>Best Use</div>
              <p style={{fontSize:".82rem",lineHeight:1.7,color:C.g700}}>Keep this open during demos, client follow-up, or editorial review so the team can return to the exact item being discussed.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function AnalystsPage({nav}) {
  const {analysts}=useData();
  const publicAnalysts=analysts.filter(a=>a.role!=="intern");
  return (<>
    <section style={{background:`linear-gradient(160deg,${C.navy} 0%,${C.navyMid} 100%)`,padding:"52px 0"}}><div style={{maxWidth:1260,margin:"0 auto",padding:"0 40px"}}><h1 style={{fontFamily:serif,fontSize:"2.2rem",color:C.white,fontWeight:500}}>Our Analysts</h1><p style={{color:"rgba(255,255,255,0.48)",fontSize:".88rem",marginTop:8}}>Meet the team behind Chapel Hill Denham Research</p></div></section>
    <section style={{padding:"72px 0"}}><div style={{maxWidth:1260,margin:"0 auto",padding:"0 40px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:28}}>
        {publicAnalysts.map(a=>(
          <div key={a.id} onClick={()=>nav("analyst",{id:a.id})} style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"32px 26px",display:"flex",flexDirection:"column",minHeight:380,cursor:"pointer",transition:"transform .22s,box-shadow .22s,border-color .22s",transform:"translateY(0)",boxShadow:"0 1px 4px rgba(6,38,45,0.05)",position:"relative",overflow:"hidden",...s({transform:"translateY(0)",boxShadow:"0 1px 4px rgba(6,38,45,0.05)",borderColor:C.g200},{transform:"translateY(-3px)",boxShadow:"0 12px 40px rgba(6,38,45,0.10)",borderColor:C.g300})}}>
            <div style={{margin:"0 auto 18px",width:88,height:88}}><AnalystAvatar analyst={a} size={88}/></div>
            <h3 style={{fontFamily:serif,fontSize:"1.15rem",color:C.navy,fontWeight:600,marginBottom:8,flexShrink:0,textAlign:"center"}}>{a.name}</h3>
            <p style={{color:C.gold,fontSize:".72rem",fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:.8,textAlign:"center"}}>{a.title}</p>
            <p style={{color:C.g500,fontSize:".84rem",lineHeight:1.7,marginBottom:18,flexGrow:1,textAlign:"center"}}>{a.cov}</p>
            <div style={{paddingTop:16,borderTop:`1px solid ${C.g100}`,textAlign:"center"}}>
              <span style={{fontSize:".75rem",color:C.gold,fontWeight:600,letterSpacing:.2}}>View Profile →</span>
            </div>
          </div>
        ))}
      </div>
    </div></section>
  </>);
}

/* ═══ PUBLIC ANALYST PROFILE ═══ */
function AnalystProfilePage({id,nav,user}) {
  const {reports,analysts}=useData();
  const a=analysts.find(x=>x.id===id);
  if(!a) return <div style={{padding:80,textAlign:"center",color:C.g500}}>Analyst not found.</div>;
  const myReports=reports.filter(r=>r.aid===id);
  const desk=analysts.find(x=>x.name==="Research Desk");
  return (<>
    <section style={{background:`linear-gradient(160deg,${C.navy} 0%,${C.navyMid} 100%)`,padding:"56px 0"}}>
      <div style={{maxWidth:1260,margin:"0 auto",padding:"0 40px",display:"flex",alignItems:"flex-start",gap:24}}>
        <AnalystAvatar analyst={a} size={82} fontSize="1.8rem"/>
        <div style={{flex:1}}>
          <p style={{color:C.gold,fontSize:".72rem",textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:6}}>Research Analyst</p>
          <h1 style={{fontFamily:serif,fontSize:"2rem",color:C.white,fontWeight:500,marginBottom:4}}>{a.name}</h1>
          <p style={{color:"rgba(255,255,255,0.5)",fontSize:".88rem"}}>{a.title} · {a.cov}</p>
        </div>
        <div style={{marginLeft:"auto",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:10}}>
          <button onClick={()=>nav("contact")} style={{padding:"10px 16px",background:C.gold,color:"#fff",border:"none",borderRadius:999,fontSize:".76rem",fontWeight:700,cursor:"pointer",fontFamily:sans}}>Contact Us</button>
          <div style={{textAlign:"right"}}>
            <p style={{color:"rgba(255,255,255,0.35)",fontSize:".74rem",marginBottom:4}}>Reports Published</p>
            <p style={{color:C.white,fontSize:"1.2rem",fontWeight:700,fontFamily:serif}}>{myReports.length}</p>
          </div>
        </div>
      </div>
    </section>
    <div style={{maxWidth:1260,margin:"0 auto",padding:"44px 40px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:36}}>
        <div>
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"24px"}}>
            <h3 style={{fontFamily:serif,fontSize:"1rem",color:C.navy,fontWeight:600,marginBottom:14}}>About</h3>
            <p style={{fontSize:".85rem",color:C.g700,lineHeight:1.75,display:"-webkit-box",WebkitLineClamp:5,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{a.bio}</p>
            <div style={{marginTop:20,paddingTop:16,borderTop:`1px solid ${C.g100}`}}>
              <p style={{fontSize:".72rem",color:C.g500,textTransform:"uppercase",letterSpacing:.4,marginBottom:6}}>Coverage</p>
              <p style={{fontSize:".84rem",color:C.navy,fontWeight:500}}>{a.cov}</p>
            </div>
            <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.g100}`}}>
              <p style={{fontSize:".72rem",color:C.g500,textTransform:"uppercase",letterSpacing:.4,marginBottom:10}}>Contact</p>
              <button onClick={()=>nav("contact")} style={{padding:"10px 14px",background:"rgba(6,38,45,0.04)",color:C.navy,border:`1px solid rgba(6,38,45,0.08)`,borderRadius:999,fontSize:".8rem",fontWeight:700,cursor:"pointer",fontFamily:sans}}>Contact Us</button>
            </div>
            {desk&&a.id!==desk.id&&(
              <div style={{marginTop:18,paddingTop:18,borderTop:`1px solid ${C.g100}`}}>
                <p style={{fontSize:".72rem",color:C.g500,textTransform:"uppercase",letterSpacing:.4,marginBottom:8}}>Research Desk</p>
                <div style={{background:C.offWhite,border:`1px solid ${C.g200}`,borderRadius:12,padding:"14px"}}>
                  <p style={{fontSize:".9rem",fontWeight:700,color:C.navy,marginBottom:4}}>{desk.name}</p>
                  <p style={{fontSize:".8rem",color:C.g700,lineHeight:1.65,marginBottom:12,display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{desk.bio}</p>
                  <button onClick={()=>nav("analyst",{id:desk.id})} style={{padding:"9px 14px",background:C.gold,color:"#fff",border:"none",borderRadius:999,fontSize:".76rem",fontWeight:700,cursor:"pointer",fontFamily:sans,marginRight:8}}>Desk profile</button>
                  <button onClick={()=>nav("contact")} style={{padding:"9px 14px",background:"rgba(6,38,45,0.04)",color:C.navy,border:`1px solid rgba(6,38,45,0.08)`,borderRadius:999,fontSize:".76rem",fontWeight:700,cursor:"pointer",fontFamily:sans}}>Contact Desk</button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div>
          <SH title={`Reports by ${a.name.split(" ")[0]}`} sub={`${myReports.length} publication${myReports.length!==1?"s":""}`}/>
          {myReports.length===0
            ?<div style={{padding:"40px",textAlign:"center",color:C.g500,background:C.white,borderRadius:12,border:`1px solid ${C.g200}`}}>No reports attributed to this analyst yet.</div>
            :<div style={{display:"grid",gap:18}}>{myReports.map(r=><RC key={r.id} r={r} nav={nav} user={user}/>)}</div>
          }
        </div>
      </div>
    </div>
  </>);
}

/* ═══ PRICE LISTS ═══ */
function PriceListsPage({user,nav}) {
  const [prices,setPrices]=useState(()=>lsGet(LS.prices)||PRICES);
  useEffect(()=>{
    api.priceLists.list().then(rows=>{ if(rows?.length) setPrices(rows); }).catch(()=>{});
  },[]);
  return (<>
    <section style={{background:`linear-gradient(160deg,${C.navy} 0%,${C.navyMid} 100%)`,padding:"52px 0"}}><div style={{maxWidth:1260,margin:"0 auto",padding:"0 40px"}}><h1 style={{fontFamily:serif,fontSize:"2.2rem",color:C.white,fontWeight:500}}>Price Lists</h1><p style={{color:"rgba(255,255,255,0.48)",fontSize:".88rem",marginTop:8}}>Daily equity and weekly fixed income price lists</p></div></section>
    <section style={{padding:"52px 0"}}><div style={{maxWidth:760,margin:"0 auto",padding:"0 40px"}}>
      <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,overflow:"hidden"}}>
      {prices.map((p,i)=>(
        <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 22px",borderBottom:i<prices.length-1?`1px solid ${C.g100}`:"none",transition:"background .12s",...s({background:"transparent"},{background:C.offWhite})}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:40,height:40,borderRadius:8,background:p.type==="excel"?"#16a34a":"#dc2626",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:".6rem",fontWeight:800,letterSpacing:.5,flexShrink:0}}>{p.type==="excel"?"XLS":"PDF"}</div>
            <div><strong style={{fontSize:".88rem",color:C.navy,display:"block"}}>{p.title}</strong><span style={{fontSize:".76rem",color:C.g500}}>{fd(p.date)}</span></div>
          </div>
          {p.filePath
            ? <a href={p.filePath} download style={{padding:"8px 18px",background:C.navy,color:"#fff",border:"none",borderRadius:6,fontSize:".76rem",fontWeight:600,cursor:"pointer",fontFamily:sans,textDecoration:"none"}}>↓ Download</a>
            : <button disabled style={{padding:"8px 18px",background:C.g100,color:C.g500,border:"none",borderRadius:6,fontSize:".76rem",fontWeight:600,cursor:"default",fontFamily:sans}}>No file yet</button>}
        </div>
      ))}
      </div>
    </div></section>
  </>);
}

/* ═══ ANALYST PROFILE TAB (inside own portal) ═══ */
function AnalystProfileTab({analyst,user,nav,showToast}) {
  const {bioEdits,setBioEdits,setAnalysts}=useData();
  const [editingBio,setEditingBio]=useState(false);
  const [newBio,setNewBio]=useState(analyst.bio||"");
  const [photoFile,setPhotoFile]=useState(null);
  const preview=usePhotoPreview(photoFile);

  /* Check if there's already a pending bio edit for this analyst */
  const pendingEdit=bioEdits.find(e=>e.analystId===analyst.id&&e.status==="pending");

  const submitBio=async()=>{
    if(!newBio.trim()){return;}
    if(newBio.trim()===analyst.bio){setEditingBio(false);return;}
    const bio=newBio.trim();
    setBioEdits(prev=>[...prev.filter(e=>!(e.analystId===analyst.id&&e.status==="pending")),
      {id:nextId(prev),analystId:analyst.id,newBio:bio,status:"pending",submittedAt:new Date().toISOString()}]);
    showToast("Bio update submitted for administrator review.");
    setEditingBio(false);
    api.bioEdits.submit(analyst.id,bio).catch(()=>{});
  };

  const savePhoto=async()=>{
    if(!preview&&!photoFile) return;
    let photoUrl=preview;
    if(photoFile){
      try{ const r=await api.upload.photo(photoFile); photoUrl=r.url; }
      catch{ /* keep preview */ }
    }
    setAnalysts(prev=>prev.map(a=>a.id===analyst.id?{...a,photo:photoUrl}:a));
    showToast("Profile photo updated.");
    api.analysts.update(analyst.id,{photo:photoUrl}).catch(()=>{});
    setPhotoFile(null);
  };

  return (
    <div style={{maxWidth:640}}>
      <SH title="My Profile"/>
      <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"28px",marginBottom:20}}>
        {/* Photo section */}
        <div style={{display:"flex",alignItems:"center",gap:18,marginBottom:22,paddingBottom:18,borderBottom:`1px solid ${C.g100}`}}>
          <AnalystAvatar analyst={photoFile?{...analyst,photo:preview}:analyst} size={72} fontSize="1.5rem"/>
          <div>
            <p style={{fontSize:".8rem",fontWeight:600,color:C.navy,marginBottom:6}}>Profile Photo</p>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <label style={{display:"inline-block",padding:"7px 14px",background:C.g100,border:`1px solid ${C.g200}`,borderRadius:7,fontSize:".78rem",fontWeight:600,color:C.navy,cursor:"pointer",fontFamily:sans}}>
                Change Photo
                <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>setPhotoFile(e.target.files[0]||null)}/>
              </label>
              {photoFile&&<>
                <button onClick={savePhoto} style={{padding:"7px 14px",background:C.gold,color:"#fff",border:"none",borderRadius:7,fontSize:".78rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>Save</button>
                <button onClick={()=>setPhotoFile(null)} style={{background:"none",border:"none",color:C.g500,fontSize:".78rem",cursor:"pointer",fontFamily:sans}}>Cancel</button>
              </>}
            </div>
            <p style={{fontSize:".7rem",color:C.g500,marginTop:4}}>JPG or PNG. Changes apply immediately.</p>
          </div>
        </div>
        {/* Fields */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18}}>
          <div style={{padding:"14px",background:C.offWhite,borderRadius:8}}>
            <p style={{fontSize:".7rem",color:C.g500,textTransform:"uppercase",letterSpacing:.4,marginBottom:4}}>Full Name</p>
            <p style={{fontSize:".88rem",color:C.navy,fontWeight:500}}>{analyst.name}</p>
          </div>
          <div style={{padding:"14px",background:C.offWhite,borderRadius:8}}>
            <p style={{fontSize:".7rem",color:C.g500,textTransform:"uppercase",letterSpacing:.4,marginBottom:4}}>Title</p>
            <p style={{fontSize:".88rem",color:C.navy,fontWeight:500}}>{analyst.title}</p>
          </div>
          <div style={{padding:"14px",background:C.offWhite,borderRadius:8}}>
            <p style={{fontSize:".7rem",color:C.g500,textTransform:"uppercase",letterSpacing:.4,marginBottom:4}}>Coverage</p>
            <p style={{fontSize:".88rem",color:C.navy,fontWeight:500}}>{analyst.cov}</p>
          </div>
          <div style={{padding:"14px",background:C.offWhite,borderRadius:8}}>
            <p style={{fontSize:".7rem",color:C.g500,textTransform:"uppercase",letterSpacing:.4,marginBottom:10}}>Contact</p>
            <button onClick={()=>nav("contact")} style={{padding:"8px 14px",background:C.gold,color:"#fff",border:"none",borderRadius:999,fontSize:".76rem",fontWeight:700,cursor:"pointer",fontFamily:sans}}>Contact Us</button>
          </div>
        </div>
        {/* Bio section */}
        <div style={{padding:"14px",background:C.offWhite,borderRadius:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <p style={{fontSize:".7rem",color:C.g500,textTransform:"uppercase",letterSpacing:.4}}>Bio</p>
            {!editingBio&&!pendingEdit&&<button onClick={()=>{setNewBio(analyst.bio||"");setEditingBio(true);}} style={{background:"none",border:"none",color:C.gold,fontSize:".75rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>Edit →</button>}
          </div>
          {pendingEdit?(
            <div>
              <p style={{fontSize:".82rem",color:C.g700,lineHeight:1.7,marginBottom:10}}>{analyst.bio}</p>
              <div style={{background:"#fef9c3",border:"1px solid #fde047",borderRadius:6,padding:"10px 12px"}}>
                <p style={{fontSize:".72rem",fontWeight:700,color:"#854d0e",marginBottom:4}}>⏳ Bio update pending administrator review</p>
                <p style={{fontSize:".8rem",color:"#92400e",lineHeight:1.65}}>{pendingEdit.newBio}</p>
                <button onClick={()=>setBioEdits(p=>p.filter(e=>e.id!==pendingEdit.id))} style={{marginTop:8,background:"none",border:"none",color:"#92400e",fontSize:".72rem",cursor:"pointer",fontFamily:sans,textDecoration:"underline"}}>Withdraw</button>
              </div>
            </div>
          ):editingBio?(
            <div>
              <textarea value={newBio} onChange={e=>setNewBio(e.target.value)} rows={5} style={{width:"100%",padding:"10px 12px",border:`1px solid ${C.g200}`,borderRadius:7,fontSize:".86rem",fontFamily:sans,resize:"vertical",marginBottom:10}}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={submitBio} style={{padding:"8px 18px",background:C.gold,color:"#fff",border:"none",borderRadius:7,fontSize:".8rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>Submit for Approval</button>
                <button onClick={()=>setEditingBio(false)} style={{padding:"8px 14px",background:C.g100,color:C.g700,border:"none",borderRadius:7,fontSize:".8rem",cursor:"pointer",fontFamily:sans}}>Cancel</button>
              </div>
              <p style={{fontSize:".7rem",color:C.g500,marginTop:8}}>Your updated bio will go live once approved by the administrator.</p>
            </div>
          ):(
            <p style={{fontSize:".86rem",color:C.g700,lineHeight:1.7}}>{analyst.bio||<em style={{color:C.g500}}>No bio yet. Click Edit to add one.</em>}</p>
          )}
        </div>
        <button onClick={()=>nav("analyst",{id:analyst.id})} style={{marginTop:16,padding:"9px 20px",background:"none",border:`1px solid ${C.g200}`,borderRadius:7,fontSize:".8rem",color:C.navy,fontWeight:600,cursor:"pointer",fontFamily:sans}}>View Public Profile →</button>
      </div>
    </div>
  );
}

/* ═══ PRICE LIST UPLOAD ═══ */
function PriceUploadTab({isIntern,showToast}) {
  const [file,setFile]=useState(null);
  const [title,setTitle]=useState("");
  const [error,setError]=useState("");
  const [submitting,setSubmitting]=useState(false);

  const submit=async()=>{
    if(!title.trim()){setError("Please enter a title for this price list.");return;}
    if(!file){setError("Please select a CSV file to upload.");return;}
    if(!file.name.endsWith(".csv")){setError("Please select a CSV file (.csv only).");return;}

    setSubmitting(true);
    setError("");

    try{
      /* Demo mode: add new price list to the top */
      const today=new Date().toISOString().split("T")[0];
      const newFileName=`price-list-${today}.csv`;
      const newPath=`/prices/${newFileName}`;
      const newEntry={id:Date.now(),title:title.trim(),date:today,type:"excel",filePath:newPath};

      /* Get current price lists and prepend new one (newest first) */
      const prevPrices=lsGet(LS.prices)||PRICES;

      /* Update prices with new list on top */
      lsSet(LS.prices,[newEntry,...prevPrices]);

      setTitle("");
      setFile(null);
      showToast(`Price list uploaded: ${title}`);
    }catch(e){
      setError("Upload failed. Please try again.");
    }finally{
      setSubmitting(false);
    }
  };

  return (
    <div style={{maxWidth:720}}>
      <SH title="Upload Price List" sub="Add a new equity or fixed income price list"/>
      {error&&<div style={{background:"#fef2f2",color:C.red,padding:"10px 14px",borderRadius:7,fontSize:".83rem",marginBottom:14}}>{error}</div>}
      <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"28px"}}>
        <Inp label="List Title" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Daily Equity Price List — 17 April 2026" required/>
        <div style={{marginBottom:20}}>
          <label style={{display:"block",fontSize:".75rem",fontWeight:600,color:C.navy,marginBottom:8,textTransform:"uppercase",letterSpacing:.4}}>CSV File</label>
          <label style={{display:"inline-block",padding:"12px 18px",background:C.navy,color:"#fff",border:`2px dashed ${C.navy}`,borderRadius:7,fontSize:".85rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>
            {file?`✓ ${file.name.slice(0,40)}`:"Choose CSV file"}
            <input type="file" accept=".csv" style={{display:"none"}} onChange={e=>setFile(e.target.files?.[0]||null)}/>
          </label>
          {file&&<button onClick={()=>setFile(null)} style={{marginLeft:8,background:"none",border:"none",color:C.g500,fontSize:".78rem",cursor:"pointer",fontFamily:sans}}>Remove</button>}
          <p style={{fontSize:".72rem",color:C.g500,marginTop:6}}>CSV files are preferred. Previously active lists will be moved to Research Library.</p>
        </div>
        <div style={{background:C.offWhite,borderRadius:8,padding:"14px 16px",marginBottom:20,fontSize:".82rem",color:C.g700,lineHeight:1.6}}>
          <p><strong>What happens:</strong></p>
          <ul style={{margin:"8px 0 0 16px",paddingLeft:0}}>
            <li>✓ Your new price list appears at the top of the Price Lists page</li>
            <li>✓ Previous lists stay below as historical records</li>
            <li>✓ Team can view and download all price list versions anytime</li>
          </ul>
        </div>
        <button onClick={submit} disabled={!title.trim()||!file||submitting} style={{padding:"11px 28px",background:title.trim()&&file&&!submitting?C.navy:C.g200,color:"#fff",border:"none",borderRadius:7,fontSize:".85rem",fontWeight:600,cursor:title.trim()&&file&&!submitting?"pointer":"default",fontFamily:sans}}>
          {submitting?"Uploading…":"Upload Price List"}
        </button>
      </div>
    </div>
  );
}

/* ═══ ANALYST PORTAL (own dashboard) ═══ */
function AnalystPortalPage({user,nav}) {
  const {reports,analysts,setReports}=useData();
  const analyst=analysts.find(a=>a.id===user.analystId);
  const myReports=reports.filter(r=>r.aid===user.analystId);
  const [tab,setTab]=useState("profile");
  const [toast,setToast]=useState("");
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(""),3000);};

  if(!analyst) return <div style={{padding:80,textAlign:"center",color:C.g500}}>Analyst profile not linked. Contact the administrator.</div>;

  const myInterns=analysts.filter(a=>a.role==="intern"&&a.supervisorId===user.analystId);
  const pendingReports=reports.filter(r=>r.status==="pending"&&myInterns.some(i=>i.id===r.aid));
  const pendingCount=pendingReports.length;
  const tabs=[
    {k:"profile",  l:"My Profile",        i:"ME"},
    {k:"reports",  l:"My Reports",        i:"RP"},
    {k:"activity", l:"Reader Activity",   i:"RA"},
    {k:"approvals",l:`Approvals`,         i:"OK", badge:pendingCount},
    {k:"pricelist",l:"Price Lists",       i:"PL"},
  ];  return (
    <div style={{minHeight:"80vh",background:C.offWhite}}>
      <section style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.navyLight} 100%)`,padding:"44px 0"}}>
        <div style={{maxWidth:1260,margin:"0 auto",padding:"0 40px",display:"flex",alignItems:"center",gap:20}}>
          <AnalystAvatar analyst={analyst} size={64} fontSize="1.5rem"/>
          <div>
            <p style={{color:C.gold,fontSize:".68rem",textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:4}}>My Research Portal</p>
            <h1 style={{fontFamily:serif,fontSize:"1.8rem",color:C.white,fontWeight:500,marginBottom:2}}>{analyst.name}</h1>
            <p style={{color:"rgba(255,255,255,0.5)",fontSize:".84rem"}}>{analyst.title} · {analyst.cov}</p>
          </div>
          <div style={{marginLeft:"auto",textAlign:"right"}}>
            <p style={{color:"rgba(255,255,255,0.35)",fontSize:".72rem",marginBottom:3}}>Reports Published</p>
            <p style={{color:C.white,fontFamily:serif,fontSize:"2rem",fontWeight:500}}>{myReports.length}</p>
          </div>
        </div>
      </section>
      <div style={{background:C.white,borderBottom:`1px solid ${C.g200}`,position:"sticky",top:68,zIndex:50}}>
        <div style={{maxWidth:1260,margin:"0 auto",padding:"0 40px",display:"flex",gap:0}}>
          {tabs.map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:"15px 18px",background:"none",border:"none",borderBottom:`2px solid ${tab===t.k?C.gold:"transparent"}`,color:tab===t.k?C.navy:C.g500,fontSize:".8rem",fontWeight:tab===t.k?600:400,cursor:"pointer",fontFamily:sans,display:"flex",alignItems:"center",gap:6,transition:"color .15s",position:"relative"}}>
              {t.i} {t.l}
              {t.badge>0&&<span style={{background:C.red,color:"#fff",borderRadius:10,fontSize:".6rem",fontWeight:700,padding:"1px 6px",minWidth:18,textAlign:"center"}}>{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>
      <div style={{maxWidth:1260,margin:"0 auto",padding:"36px 40px"}}>
        {tab==="profile"&&(
          <AnalystProfileTab analyst={analyst} user={user} nav={nav} showToast={showToast}/>
        )}
        {tab==="reports"&&(
          <div>
            <AnalystUploadTab analystId={user.analystId} isIntern={false} reports={reports} setReports={setReports} showToast={showToast} onDone={()=>{}}/>
            <div style={{marginTop:40}}>
              <SH title="My Reports" sub={`${myReports.length} report${myReports.length!==1?"s":""} published`}/>
              {myReports.length===0
                ?<div style={{padding:"48px",textAlign:"center",color:C.g500,background:C.white,borderRadius:12,border:`1px solid ${C.g200}`}}>You haven't published any reports yet. Use the form above to submit your first report.</div>
                :<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>{myReports.map(r=><RC key={r.id} r={r} nav={nav} user={user}/>)}</div>
              }
            </div>
          </div>
        )}
        {tab==="activity"&&<ReaderActivityTab nav={nav} sub="Track what users are opening now and jump straight back into those reports or library files."/>}
        {tab==="approvals"&&<ApprovalsTab pendingReports={pendingReports} analysts={analysts} setReports={setReports} showToast={showToast}/>}
        {tab==="pricelist"&&<PriceUploadTab isIntern={false} showToast={showToast}/>}
      </div>
      {toast&&<div style={{position:"fixed",right:24,bottom:24,background:C.navy,color:"#fff",padding:"13px 18px",borderRadius:10,boxShadow:"0 16px 40px rgba(17,37,48,0.2)",fontSize:".83rem",zIndex:300,display:"flex",alignItems:"center",gap:8}}><span style={{color:C.gold}}>✓</span>{toast}</div>}
    </div>
  );
}

/* ── Expandable report body for approvals review ── */
function ReportBodyPreview({body,ex}) {
  const [open,setOpen]=useState(false);
  if(!body) return null;
  const paragraphs=body.split("\n\n").filter(Boolean);
  return (
    <div style={{marginBottom:14}}>
      <button onClick={()=>setOpen(o=>!o)} style={{background:"none",border:`1px solid ${C.g200}`,borderRadius:6,padding:"6px 14px",fontSize:".75rem",fontWeight:600,color:C.navy,cursor:"pointer",fontFamily:sans,display:"flex",alignItems:"center",gap:6,marginBottom:open?10:0,transition:"all .15s",...s({background:"none",borderColor:C.g200},{background:C.offWhite,borderColor:C.g300})}}>
        <span>{open?"▲":"▼"}</span> {open?"Hide full report":"Read full report"} ({paragraphs.length} paragraph{paragraphs.length!==1?"s":""})
      </button>
      {open&&(
        <div style={{background:C.offWhite,borderRadius:8,padding:"16px 18px",border:`1px solid ${C.g200}`}}>
          <p style={{fontSize:".83rem",color:C.g500,fontStyle:"italic",marginBottom:12,paddingBottom:10,borderBottom:`1px solid ${C.g200}`}}>{ex}</p>
          {paragraphs.map((p,i)=>(
            <p key={i} style={{fontSize:".84rem",color:C.g700,lineHeight:1.8,marginBottom:i<paragraphs.length-1?12:0}}>{p}</p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Approvals Tab (analyst sees intern pending reports) ── */
function ApprovalsTab({pendingReports,analysts,setReports,showToast}) {
  const [rejectId,setRejectId]=useState(null);
  const [reason,setReason]=useState("");
  const approve=id=>{
    setReports(p=>p.map(r=>r.id===id?{...r,status:"published",approved_at:new Date().toISOString(),approved_by:1,rejectedReason:""}:r));
    showToast("Report approved and published.");
    api.reports.approve(id).catch(()=>{});
  };
  const reject=id=>{
    if(!reason.trim()){return;}
    setReports(p=>p.map(r=>r.id===id?{...r,status:"rejected",rejectedReason:reason}:r));
    showToast("Report returned to intern.");
    api.reports.reject(id,reason).catch(()=>{});
    setRejectId(null);setReason("");
  };
  if(pendingReports.length===0) return (
    <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"48px",textAlign:"center",color:C.g500}}>
      <div style={{fontSize:"2rem",marginBottom:12}}>✅</div>
      <p style={{fontWeight:600,color:C.navy,marginBottom:6}}>All clear — no pending submissions</p>
      <p style={{fontSize:".84rem"}}>Intern report submissions will appear here for your review.</p>
    </div>
  );
  return (
    <div>
      <SH title="Pending Approvals" sub={`${pendingReports.length} submission${pendingReports.length!==1?"s":""} awaiting your review`}/>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {pendingReports.map(r=>{
          const intern=analysts.find(a=>a.id===r.aid);
          const cat=gc(r.cat),pc=gpc(r.cat);
          const dc=cat?.p?`${pc?.name} · ${cat.name}`:cat?.name;
          return (
            <div key={r.id} style={{background:C.white,borderRadius:12,border:"1px solid #fde047",overflow:"hidden"}}>
              <div style={{background:"#fef9c3",padding:"10px 20px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #fde047"}}>
                <span style={{fontSize:".72rem",fontWeight:700,color:"#854d0e",textTransform:"uppercase",letterSpacing:.4}}>⏳ Pending Review</span>
                <span style={{fontSize:".72rem",color:"#92400e",marginLeft:"auto"}}>Submitted by {intern?.name||"Intern"} · {fd(r.date)}</span>
              </div>
              <div style={{padding:"20px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,marginBottom:12}}>
                  <div>
                    <span style={{background:C.goldSoft,color:C.gold,fontSize:".6rem",fontWeight:700,textTransform:"uppercase",padding:"3px 8px",borderRadius:3,marginBottom:8,display:"inline-block"}}>{dc}</span>
                    <h3 style={{fontFamily:serif,fontSize:"1.1rem",color:C.navy,fontWeight:600,marginBottom:6}}>{r.title}</h3>
                    <p style={{color:C.g500,fontSize:".84rem",lineHeight:1.6}}>{r.ex}</p>
                  </div>
                </div>
                <ReportBodyPreview body={r.body} ex={r.ex}/>
                {rejectId===r.id?(
                  <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                    <div style={{flex:1}}>
                      <label style={{fontSize:".72rem",fontWeight:600,color:C.navy,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:.3}}>Reason for rejection <span style={{color:C.red}}>*</span></label>
                      <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Provide feedback so the intern can revise…" style={{width:"100%",padding:"10px 12px",border:`1px solid ${C.g200}`,borderRadius:7,fontSize:".84rem",fontFamily:sans}}/>
                    </div>
                    <button onClick={()=>reject(r.id)} style={{padding:"10px 18px",background:C.red,color:"#fff",border:"none",borderRadius:7,fontSize:".8rem",fontWeight:600,cursor:"pointer",fontFamily:sans,flexShrink:0}}>Send Back</button>
                    <button onClick={()=>{setRejectId(null);setReason("");}} style={{padding:"10px 14px",background:C.g100,color:C.g700,border:"none",borderRadius:7,fontSize:".8rem",cursor:"pointer",fontFamily:sans,flexShrink:0}}>Cancel</button>
                  </div>
                ):(
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>approve(r.id)} style={{padding:"9px 22px",background:"#16a34a",color:"#fff",border:"none",borderRadius:7,fontSize:".82rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>✓ Approve & Publish</button>
                    <button onClick={()=>setRejectId(r.id)} style={{padding:"9px 18px",background:"#fef2f2",color:C.red,border:"1px solid #fca5a5",borderRadius:7,fontSize:".82rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>✕ Return to Intern</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalystUploadTab({analystId,isIntern,reports,setReports,showToast,onDone}) {
  const {analysts,mailingList}=useData();
  const internEntry=analysts.find(a=>a.id===analystId);
  const supervisorId=internEntry?.supervisorId||null;
  const blank={title:"",ex:"",body:"",cat:"macro",access:"free",date:new Date().toISOString().slice(0,10),sendToMailing:false};
  const [form,setForm]=useState(blank);
  const [error,setError]=useState("");
  const f=k=>e=>setForm({...form,[k]:e.target.value});
  const submit=async()=>{
    if(!form.title.trim()||!form.ex.trim()){setError("Title and excerpt are required.");return;}
    const status=isIntern?"pending":"published";
    const optimistic={...form,id:nextId(reports),aid:analystId,status,supervisorId,date:form.date||new Date().toISOString().slice(0,10)};
    setReports(prev=>[optimistic,...prev]);
    /* Send to mailing list if checked */
    if(form.sendToMailing&&mailingList.length>0){
      showToast(isIntern?`"${form.title}" submitted for approval and will be sent to ${mailingList.length} subscribers.`:`"${form.title}" published and sent to ${mailingList.length} subscribers.`);
    }else{
      showToast(isIntern?`"${form.title}" submitted for approval.`:`"${form.title}" published.`);
    }
    setForm(blank);setError("");onDone();
    /* Persist to server */
    try{
      const saved=await api.reports.create({...form,aid:analystId});
      setReports(prev=>prev.map(r=>r.id===optimistic.id?saved:r));
    }catch(e){console.warn("API save failed:",e.message);}
  };
  const catOpts=CATS.map(c=>({v:c.id,l:c.p?`  └ ${c.name}`:c.name}));
  return (
    <div style={{maxWidth:680}}>
      <SH title="Upload New Report"/>
      {error&&<div style={{background:"#fef2f2",color:C.red,padding:"9px 13px",borderRadius:7,fontSize:".83rem",marginBottom:14}}>{error}</div>}
      <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"26px"}}>
        <Inp label="Report Title" value={form.title} onChange={f("title")} placeholder="e.g. Sector Update — Q2 2026" required/>
        <Inp label="Excerpt / Summary" value={form.ex} onChange={f("ex")} as="textarea" rows={3} placeholder="2-3 sentence summary shown on the report card…" required/>
        <Inp label="Full Report Body" value={form.body} onChange={f("body")} as="textarea" rows={6} placeholder="Full analysis (shown to all users). Separate paragraphs with a blank line."/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="Category" value={form.cat} onChange={f("cat")} as="select" options={catOpts}/>
          <Inp label="Publication Date" value={form.date} onChange={f("date")} type="date"/>
        </div>
        <div style={{background:mailingList.length>0?C.goldSoft:"#f5f5f5",border:`1px solid ${mailingList.length>0?"rgba(185,114,49,0.3)":"#e5e5e5"}`,borderRadius:8,padding:"12px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
          <input type="checkbox" disabled={mailingList.length===0} checked={form.sendToMailing} onChange={e=>setForm({...form,sendToMailing:e.target.checked})} style={{cursor:mailingList.length>0?"pointer":"not-allowed",width:18,height:18,accentColor:C.gold,opacity:mailingList.length>0?1:0.5}}/>
          <label style={{fontSize:".82rem",color:mailingList.length>0?C.navy:"#999",cursor:mailingList.length>0?"pointer":"default",flex:1}}>Send to mailing list ({mailingList.length} subscriber{mailingList.length!==1?"s":""}){mailingList.length===0?" — add emails in footer to enable":""}</label>
        </div>
        <div style={{display:"flex",gap:10,marginTop:4}}>
          <button onClick={submit} style={{padding:"11px 26px",background:isIntern?"#d97706":C.gold,color:"#fff",border:"none",borderRadius:7,fontSize:".86rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>{isIntern?"Submit for Approval":"Publish Report"}</button>
          <button onClick={()=>setForm(blank)} style={{padding:"11px 18px",background:C.g100,color:C.g700,border:"none",borderRadius:7,fontSize:".86rem",cursor:"pointer",fontFamily:sans}}>Clear</button>
          {isIntern&&<p style={{fontSize:".75rem",color:C.g500,alignSelf:"center",marginLeft:4}}>Your supervisor will review before publishing.</p>}
        </div>
      </div>
    </div>
  );
}

/* ═══ INTERN PORTAL ═══ */
function InternPortalPage({user,nav}) {
  const {reports,analysts,setReports}=useData();
  const internEntry=analysts.find(a=>a.id===user.analystId);
  const supervisor=internEntry?.supervisorId?analysts.find(a=>a.id===internEntry.supervisorId):null;
  const myReports=reports.filter(r=>r.aid===user.analystId);
  const pending=myReports.filter(r=>r.status==="pending");
  const published=myReports.filter(r=>r.status==="published");
  const [tab,setTab]=useState("submissions");
  const [toast,setToast]=useState("");
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(""),3000);};

  const tabs=[
    {k:"submissions",l:"My Submissions",i:"SB"},
    {k:"activity",   l:"Reader Activity",i:"RA"},
    {k:"pricelist",  l:"Price Lists",   i:"PL"},
  ];  const StatusChip=({status})=>{
    const m={
      published:{bg:"#dcfce7",color:"#16a34a",label:"Published"},
      pending:  {bg:"#fef9c3",color:"#854d0e",label:"Pending Review"},
      rejected: {bg:"#fef2f2",color:C.red,    label:"Needs Revision"},
    };
    const st=m[status]||m.published;
    return <span style={{background:st.bg,color:st.color,fontSize:".62rem",fontWeight:700,padding:"2px 8px",borderRadius:3,textTransform:"uppercase",letterSpacing:.5}}>{st.label}</span>;
  };

  return (
    <div style={{minHeight:"80vh",background:C.offWhite}}>
      <section style={{background:`linear-gradient(135deg,#0c4a6e 0%,#0369a1 50%,#0891b2 100%)`,padding:"44px 0"}}>
        <div style={{maxWidth:1260,margin:"0 auto",padding:"0 40px",display:"flex",alignItems:"center",gap:20}}>
          <AnalystAvatar analyst={internEntry} size={64} fontSize="1.5rem"/>
          <div>
            <p style={{color:"rgba(255,255,255,0.6)",fontSize:".68rem",textTransform:"uppercase",letterSpacing:1.5,fontWeight:600,marginBottom:4}}>Research Intern Portal</p>
            <h1 style={{fontFamily:serif,fontSize:"1.8rem",color:C.white,fontWeight:500,marginBottom:2}}>{internEntry?.name||user.name}</h1>
            {supervisor&&<p style={{color:"rgba(255,255,255,0.5)",fontSize:".84rem"}}>Supervisor: {supervisor.name} · {supervisor.title}</p>}
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:18}}>
            {[{l:"Submitted",v:myReports.length},{l:"Published",v:published.length},{l:"Pending",v:pending.length}].map((s,i)=>(
              <div key={i} style={{textAlign:"center"}}>
                <p style={{color:C.white,fontFamily:serif,fontSize:"1.7rem",fontWeight:500,lineHeight:1}}>{s.v}</p>
                <p style={{color:"rgba(255,255,255,0.45)",fontSize:".68rem",textTransform:"uppercase",letterSpacing:.4,marginTop:3}}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{background:C.white,borderBottom:`1px solid ${C.g200}`,position:"sticky",top:68,zIndex:50}}>
        <div style={{maxWidth:1260,margin:"0 auto",padding:"0 40px",display:"flex",gap:0}}>
          {tabs.map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:"15px 18px",background:"none",border:"none",borderBottom:`2px solid ${tab===t.k?"#0891b2":"transparent"}`,color:tab===t.k?C.navy:C.g500,fontSize:".8rem",fontWeight:tab===t.k?600:400,cursor:"pointer",fontFamily:sans,display:"flex",alignItems:"center",gap:6,transition:"color .15s"}}>
              {t.i} {t.l}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:1260,margin:"0 auto",padding:"36px 40px"}}>
        {tab==="submissions"&&(
          <div>
            <AnalystUploadTab analystId={user.analystId} isIntern={true} reports={reports} setReports={setReports} showToast={showToast} onDone={()=>{}}/>
            <div style={{marginTop:40}}>
              <SH title="My Submissions" sub={`${myReports.length} report${myReports.length!==1?"s":""} submitted`}/>
              {myReports.length===0?(
                <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"48px",textAlign:"center",color:C.g500}}>
                  <div style={{fontSize:"2rem",marginBottom:12}}>📝</div>
                  <p style={{fontWeight:600,color:C.navy,marginBottom:6}}>No submissions yet</p>
                  <p style={{fontSize:".84rem",marginBottom:18}}>Use the form above to submit your first report for supervisor review.</p>
                </div>
              ):(
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                {myReports.map(r=>{
                  const cat=gc(r.cat),pc=gpc(r.cat);
                  const dc=cat?.p?`${pc?.name} · ${cat.name}`:cat?.name;
                  return (
                    <div key={r.id} style={{background:C.white,borderRadius:12,border:`1px solid ${r.status==="rejected"?"#fca5a5":r.status==="pending"?"#fde047":C.g200}`,overflow:"hidden"}}>
                      {r.status==="rejected"&&(
                        <div style={{background:"#fef2f2",padding:"10px 20px",borderBottom:"1px solid #fca5a5",display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:".72rem",fontWeight:700,color:C.red,textTransform:"uppercase",letterSpacing:.4}}>✕ Needs Revision</span>
                          {r.rejectedReason&&<span style={{fontSize:".78rem",color:C.red,marginLeft:4}}>— {r.rejectedReason}</span>}
                        </div>
                      )}
                      {r.status==="pending"&&(
                        <div style={{background:"#fef9c3",padding:"10px 20px",borderBottom:"1px solid #fde047"}}>
                          <span style={{fontSize:".72rem",fontWeight:700,color:"#854d0e",textTransform:"uppercase",letterSpacing:.4}}>⏳ Awaiting supervisor review</span>
                        </div>
                      )}
                      <div style={{padding:"20px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16}}>
                        <div style={{flex:1}}>
                          <span style={{background:C.goldSoft,color:C.gold,fontSize:".6rem",fontWeight:700,textTransform:"uppercase",padding:"3px 8px",borderRadius:3,marginBottom:8,display:"inline-block"}}>{dc}</span>
                          <h3 style={{fontFamily:serif,fontSize:"1.05rem",color:C.navy,fontWeight:600,marginBottom:6}}>{r.title}</h3>
                          <p style={{color:C.g500,fontSize:".82rem",lineHeight:1.6}}>{r.ex}</p>
                          <p style={{color:C.g500,fontSize:".74rem",marginTop:8}}>{fd(r.date)}</p>
                        </div>
                        <div style={{flexShrink:0}}>
                          <StatusChip status={r.status}/>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        )}
        {tab==="activity"&&<ReaderActivityTab nav={nav} sub="Track what is currently being opened so you can align drafts and follow-up with the active discussion."/>}
        {tab==="pricelist"&&<PriceUploadTab isIntern={true} showToast={showToast}/>}
      </div>
      {toast&&<div style={{position:"fixed",right:24,bottom:24,background:"#0891b2",color:"#fff",padding:"13px 18px",borderRadius:10,boxShadow:"0 16px 40px rgba(8,145,178,0.3)",fontSize:".83rem",zIndex:300,display:"flex",alignItems:"center",gap:8}}><span>✓</span>{toast}</div>}
    </div>
  );
}

/* ═══ FUNDS PERFORMANCE PAGE ═══ */
function Sparkline({pts,color,w=200,h=52}) {
  if(!pts||pts.length<2) return null;
  const line=sparkPath(pts,w,h,false);
  const area=sparkPath(pts,w,h,true);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{display:"block"}}>
      <defs>
        <linearGradient id={`sg${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.01"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg${color.replace("#","")})`}/>
      <path d={line} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function FundCard({fund,period,onClick,isExpanded}) {
  const ret=fund.perf[period];
  const pos=ret>=0;
  const retColor=pos?"#16a34a":"#dc2626";
  const pts=fund.spark[period]||fund.spark["1Y"];
  const base={background:C.white,borderRadius:14,border:`1.5px solid ${isExpanded?C.gold:C.g200}`,padding:"24px 24px 20px",display:"flex",flexDirection:"column",transition:"box-shadow .2s,transform .2s,border-color .2s",cursor:"pointer",boxShadow:isExpanded?`0 0 0 3px ${C.goldSoft}`:"0 1px 4px rgba(6,38,45,0.05)"};
  return (
    <div style={base} onClick={onClick} {...s({boxShadow:isExpanded?`0 0 0 3px ${C.goldSoft}`:"0 1px 4px rgba(6,38,45,0.05)",transform:"translateY(0)"},{boxShadow:"0 10px 36px rgba(6,38,45,0.10)",transform:"translateY(-3px)"})}>
      {/* Top row */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
        <div style={{flex:1,minWidth:0,paddingRight:12}}>
          <div style={{display:"flex",gap:6,marginBottom:6,flexWrap:"wrap"}}>
            <span style={{background:fund.riskBg,color:fund.riskColor,fontSize:".6rem",fontWeight:700,padding:"2px 8px",borderRadius:3,textTransform:"uppercase",letterSpacing:.5}}>{fund.type}</span>
            <span style={{background:C.g100,color:C.g500,fontSize:".6rem",fontWeight:600,padding:"2px 8px",borderRadius:3,letterSpacing:.3}}>Risk: {fund.risk}</span>
          </div>
          <h3 style={{fontFamily:serif,fontSize:"1rem",color:C.navy,fontWeight:600,lineHeight:1.3}}>{fund.name}</h3>
          <p style={{fontSize:".62rem",color:C.g500,marginTop:2,letterSpacing:.3}}>{fund.abbr}</p>
        </div>
        {/* Return figure */}
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:"1.85rem",fontWeight:700,color:retColor,fontFamily:serif,lineHeight:1}}>{pos?"+":""}{ret.toFixed(2)}%</div>
          <div style={{fontSize:".64rem",color:C.g500,marginTop:3,textTransform:"uppercase",letterSpacing:.5}}>{period} return</div>
        </div>
      </div>
      {/* Sparkline */}
      <div style={{margin:"0 -4px 14px"}}>
        <Sparkline pts={pts} color={pos?fund.riskColor:"#dc2626"} w={240} h={52}/>
      </div>
      {/* Footer stats */}
      <div style={{display:"flex",justifyContent:"space-between",paddingTop:14,borderTop:`1px solid ${C.g100}`,fontSize:".73rem",color:C.g500}}>
        <div><span style={{display:"block",color:C.navy,fontWeight:600,fontSize:".82rem"}}>{fund.aum}</span>AUM</div>
        <div style={{textAlign:"center"}}><span style={{display:"block",color:C.navy,fontWeight:600,fontSize:".82rem"}}>{fund.nav}</span>NAV</div>
        <div style={{textAlign:"right"}}><span style={{display:"block",color:C.navy,fontWeight:600,fontSize:".82rem"}}>{fund.inception}</span>Inception</div>
      </div>
    </div>
  );
}

function FundsPage({nav}) {
  const {funds}=useData();
  const [period,setPeriod]=useState("YTD");
  const [expanded,setExpanded]=useState(null);
  const sorted=[...funds].sort((a,b)=>(b.perf[period]||0)-(a.perf[period]||0));
  /* Use the most recent dataAsAt across all funds for the header date */
  const dataAsAt=funds.reduce((latest,f)=>f.dataAsAt&&f.dataAsAt>latest?f.dataAsAt:latest,"");
  return (<>
    {/* Funds header */}
    <section style={{background:`linear-gradient(160deg,${C.navy} 0%,${C.navyMid} 100%)`,padding:"48px 0 40px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:"-60%",right:"-5%",width:500,height:500,borderRadius:"50%",background:`radial-gradient(circle,${C.goldGlow} 0%,transparent 65%)`,pointerEvents:"none"}}/>
      <div style={{maxWidth:1260,margin:"0 auto",padding:"0 40px",position:"relative",zIndex:1}}>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:20}}>
          <div>
            <p style={{color:C.gold,fontSize:".6rem",textTransform:"uppercase",letterSpacing:3,fontWeight:700,marginBottom:10,opacity:.9}}>Chapel Hill Denham</p>
            <h1 style={{fontFamily:serif,fontSize:"2.2rem",color:C.white,fontWeight:500,marginBottom:6}}>Fund Performance</h1>
            <p style={{color:"rgba(255,255,255,0.42)",fontSize:".84rem"}}>NAV and returns as at {dataAsAt?fd(dataAsAt):"—"}</p>
          </div>
          {/* Period selector */}
          <div style={{display:"flex",gap:2,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:9,padding:4}}>
            {PERIODS.map(p=>(
              <button key={p} onClick={()=>setPeriod(p)} style={{padding:"7px 14px",background:period===p?C.gold:"transparent",color:period===p?"#fff":"rgba(255,255,255,0.45)",border:"none",borderRadius:6,fontSize:".74rem",fontWeight:period===p?600:400,cursor:"pointer",fontFamily:sans,transition:"all .15s",...s({},{color:period===p?"#fff":"rgba(255,255,255,0.75)"})}}>{p}</button>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* Summary bar */}
    <div style={{background:C.white,borderBottom:`1px solid ${C.g200}`}}>
      <div style={{maxWidth:1260,margin:"0 auto",padding:"0 40px",display:"flex",gap:0,overflowX:"auto"}}>
        {funds.map(f=>{
          const ret=(f.perf&&f.perf[period])||0;
          const pos=ret>=0;
          return (
            <div key={f.id} onClick={()=>setExpanded(expanded===f.id?null:f.id)} style={{padding:"12px 24px",borderRight:`1px solid ${C.g100}`,cursor:"pointer",flexShrink:0,transition:"background .15s",...s({background:"transparent"},{background:C.offWhite})}}>
              <div style={{fontSize:".66rem",color:C.g500,textTransform:"uppercase",letterSpacing:.4,marginBottom:2}}>{f.abbr}</div>
              <div style={{fontWeight:700,fontSize:"1rem",color:pos?"#16a34a":"#dc2626"}}>{pos?"+":""}{ret.toFixed(2)}%</div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Fund cards grid */}
    <section style={{padding:"44px 0",background:C.offWhite}}>
      <div style={{maxWidth:1260,margin:"0 auto",padding:"0 40px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:22,marginBottom:36}}>
          {sorted.map(f=><FundCard key={f.id} fund={f} period={period} isExpanded={expanded===f.id} onClick={()=>setExpanded(expanded===f.id?null:f.id)}/>)}

        </div>

        {/* Expanded detail panel */}
        {expanded&&(()=>{
          const f=funds.find(x=>x.id===expanded);
          if(!f) return null;
          return (
            <div ref={el=>el&&el.scrollIntoView({behavior:"smooth",block:"nearest"})} style={{background:C.white,borderRadius:14,border:`1px solid ${C.gold}`,padding:"28px",marginBottom:28,boxShadow:`0 0 0 1px ${C.gold}22`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
                <div>
                  <h2 style={{fontFamily:serif,fontSize:"1.3rem",color:C.navy,fontWeight:600,marginBottom:4}}>{f.name}</h2>
                  <p style={{color:C.g500,fontSize:".86rem",maxWidth:520,lineHeight:1.65}}>{f.description}</p>
                </div>
                <button onClick={()=>setExpanded(null)} style={{background:C.g100,border:"none",borderRadius:6,padding:"6px 12px",fontSize:".76rem",color:C.g500,cursor:"pointer",fontFamily:sans,flexShrink:0,marginLeft:20}}>Close ✕</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8}}>
                {PERIODS.map(p=>{
                  const r=f.perf[p];const pos=r>=0;
                  return (
                    <div key={p} style={{background:pos?"#f0fdf4":"#fef2f2",borderRadius:8,padding:"14px 10px",textAlign:"center"}}>
                      <div style={{fontSize:".68rem",color:C.g500,textTransform:"uppercase",letterSpacing:.4,marginBottom:4}}>{p}</div>
                      <div style={{fontWeight:700,fontSize:"1.1rem",color:pos?"#16a34a":"#dc2626"}}>{pos?"+":""}{r.toFixed(2)}%</div>
                    </div>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:24,marginTop:20,paddingTop:18,borderTop:`1px solid ${C.g100}`,fontSize:".8rem",color:C.g700}}>
                <div><span style={{color:C.g500,fontSize:".7rem",display:"block",marginBottom:2,textTransform:"uppercase",letterSpacing:.3}}>AUM</span><strong>{f.aum}</strong></div>
                <div><span style={{color:C.g500,fontSize:".7rem",display:"block",marginBottom:2,textTransform:"uppercase",letterSpacing:.3}}>NAV per unit</span><strong>{f.nav}</strong></div>
                <div><span style={{color:C.g500,fontSize:".7rem",display:"block",marginBottom:2,textTransform:"uppercase",letterSpacing:.3}}>Inception</span><strong>{f.inception}</strong></div>
                <div><span style={{color:C.g500,fontSize:".7rem",display:"block",marginBottom:2,textTransform:"uppercase",letterSpacing:.3}}>Risk Profile</span><strong style={{color:f.riskColor}}>{f.risk}</strong></div>
              </div>
            </div>
          );
        })()}

        {/* InvestNaija CTA */}
        <div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.navyLight} 100%)`,borderRadius:14,padding:"32px 36px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:24,flexWrap:"wrap",marginBottom:22,border:"1px solid rgba(187,115,50,0.2)"}}>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <div style={{background:"#fff",borderRadius:10,padding:"8px 14px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <img src="/investnaija-logo.png" alt="InvestNaija" style={{height:32,display:"block"}}/>
            </div>
            <div>
              <p style={{color:C.gold,fontSize:".64rem",textTransform:"uppercase",letterSpacing:2,fontWeight:700,marginBottom:4}}>Invest in Nigeria</p>
              <h3 style={{fontFamily:serif,fontSize:"1.2rem",color:C.white,fontWeight:500,marginBottom:4}}>Ready to invest in these funds?</h3>
              <p style={{color:"rgba(255,255,255,0.45)",fontSize:".82rem",maxWidth:440,lineHeight:1.6}}>Access all CHD funds through InvestNaija — Chapel Hill Denham's online investment platform. Start with as little as ₦10,000.</p>
            </div>
          </div>
          <div style={{display:"flex",gap:10,flexShrink:0}}>
            <a href="https://www.investnaija.com" target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:7,padding:"11px 22px",background:C.gold,color:"#fff",border:"none",borderRadius:7,fontSize:".84rem",fontWeight:600,cursor:"pointer",fontFamily:sans,textDecoration:"none",transition:"background .15s"}}>Invest via InvestNaija ↗</a>
            <a href="mailto:funds@chapelhilldenham.com" style={{display:"inline-flex",alignItems:"center",padding:"11px 18px",background:"transparent",color:"rgba(255,255,255,0.6)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:7,fontSize:".84rem",fontWeight:500,cursor:"pointer",fontFamily:sans,textDecoration:"none",transition:"all .15s"}}>Contact Funds Team</a>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{background:C.white,borderRadius:10,border:`1px solid ${C.g200}`,padding:"18px 22px",display:"flex",gap:14,alignItems:"flex-start"}}>
          <span style={{fontSize:"1.1rem",flexShrink:0,marginTop:1}}>ℹ️</span>
          <p style={{fontSize:".76rem",color:C.g500,lineHeight:1.65,margin:0}}>
            <strong style={{color:C.g700}}>Important Disclaimer:</strong> Performance figures are shown net of fees. Past performance is not a reliable indicator of future results. Fund prices and returns may fluctuate. You may receive less than you invest. For full fund factsheets, subscription documents, and regulatory disclosures, contact <span style={{color:C.gold}}>funds@chapelhilldenham.com</span>. Chapel Hill Denham is regulated by the Securities and Exchange Commission, Nigeria.
          </p>
        </div>
      </div>
    </section>
  </>);
}

/* ═══ RESEARCH LIBRARY — UPLOAD MODAL ═══ */
function UploadDocModal({user,onClose,onSave}) {
  const [title,setTitle]=useState("");
  const [desc,setDesc]=useState("");
  const [docType,setDocType]=useState("report");
  const [visibility,setVisibility]=useState("team");
  const [category,setCategory]=useState("research");
  const [pubDate,setPubDate]=useState(new Date().toISOString().split("T")[0]);
  const [file,setFile]=useState(null);
  const [saving,setSaving]=useState(false);
  const [errMsg,setErrMsg]=useState("");

  const handleSubmit=async e=>{
    e.preventDefault();
    if(!title.trim()){setErrMsg("Title is required");return;}
    setSaving(true);setErrMsg("");
    try{
      let filePath=null;
      if(file){
        try{ const result=await api.upload.pdf(file); filePath=result?.path||result||null; }
        catch{ /* file upload failed — save metadata only */ }
      }
      let doc;
      try{
        doc=await api.library.create({title,description:desc,docType,visibility,category,pubDate,filePath});
      }catch{
        /* API offline — create local doc */
        doc={id:Date.now(),title,description:desc,docType,visibility,category,pubDate,filePath,createdAt:new Date().toISOString(),uploaderName:user?.name||"Me",uploadedBy:user?.id||null};
      }
      onSave(doc);
    }catch(e){setErrMsg(e.message);setSaving(false);}
  };

  const inp={width:"100%",padding:"9px 12px",border:`1px solid ${C.g200}`,borderRadius:7,fontSize:".86rem",fontFamily:sans,boxSizing:"border-box",background:C.white};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:C.white,borderRadius:12,padding:32,maxWidth:520,width:"100%",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <h2 style={{fontFamily:serif,fontSize:"1.4rem",color:C.navy,margin:0}}>Add to Library</h2>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:"1.3rem",cursor:"pointer",color:C.g500,lineHeight:1}}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          {errMsg&&<p style={{color:C.red,fontSize:".82rem",marginBottom:12,padding:"8px 12px",background:"#fef2f2",borderRadius:6}}>{errMsg}</p>}
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:".75rem",fontWeight:700,color:C.g700,marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>Title *</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} style={inp}/>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:".75rem",fontWeight:700,color:C.g700,marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>Description</label>
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} style={{...inp,resize:"vertical"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:12,marginBottom:14}}>
            <div>
              <label style={{display:"block",fontSize:".75rem",fontWeight:700,color:C.g700,marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>Document Type</label>
              <select value={docType} onChange={e=>setDocType(e.target.value)} style={inp}>
                <option value="report">Report</option>
                <option value="article">Article</option>
                <option value="data">Data</option>
                <option value="presentation">Presentation</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={{display:"block",fontSize:".75rem",fontWeight:700,color:C.g700,marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>Visibility</label>
              <select value={visibility} onChange={e=>setVisibility(e.target.value)} style={inp}>
                <option value="team">Team (all staff)</option>
                <option value="archive">Archive (legacy)</option>
                <option value="private">Private (only me)</option>
              </select>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:12,marginBottom:14}}>
            <div>
              <label style={{display:"block",fontSize:".75rem",fontWeight:700,color:C.g700,marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>Category</label>
              <input value={category} onChange={e=>setCategory(e.target.value)} placeholder="e.g. research, macro" style={inp}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:".75rem",fontWeight:700,color:C.g700,marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>Publication Date</label>
              <input type="date" value={pubDate} onChange={e=>setPubDate(e.target.value)} style={inp}/>
            </div>
          </div>
          <div style={{marginBottom:22}}>
            <label style={{display:"block",fontSize:".75rem",fontWeight:700,color:C.g700,marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>Attach File <span style={{fontWeight:400,color:C.g500}}>(optional)</span></label>
            <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt"
              onChange={e=>setFile(e.target.files[0])}
              style={{fontSize:".82rem",fontFamily:sans,color:C.g700}}/>
            <p style={{fontSize:".72rem",color:C.g500,marginTop:4}}>PDF, Word, Excel, PowerPoint, CSV — max 20 MB</p>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button type="button" onClick={onClose} style={{padding:"10px 20px",background:C.g100,border:`1px solid ${C.g200}`,color:C.g700,borderRadius:7,fontSize:".84rem",cursor:"pointer",fontFamily:sans}}>Cancel</button>
            <button type="submit" disabled={saving} style={{padding:"10px 24px",background:C.navy,color:C.white,border:"none",borderRadius:7,fontSize:".84rem",fontWeight:600,cursor:saving?"not-allowed":"pointer",fontFamily:sans,opacity:saving?.7:1}}>
              {saving?"Saving…":"Add to Library"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkArchiveModal({user,onClose,onSave}) {
  const [titlePrefix,setTitlePrefix]=useState("");
  const [description,setDescription]=useState("Legacy report archive upload");
  const [docType,setDocType]=useState("report");
  const [category,setCategory]=useState("archive");
  const [pubDate,setPubDate]=useState(new Date().toISOString().split("T")[0]);
  const [files,setFiles]=useState([]);
  const [saving,setSaving]=useState(false);
  const [errMsg,setErrMsg]=useState("");

  const handleSubmit=async e=>{
    e.preventDefault();
    if(!files.length){setErrMsg("Select one or more files to upload.");return;}
    setSaving(true);setErrMsg("");
    try{
      const created=[];
      for(const file of files){
        let filePath=null;
        try{
          const result=await api.upload.pdf(file);
          filePath=result?.path||result||null;
        }catch{
          try{ filePath=await fileToDataURL(file); }catch{ filePath=null; }
        }
        const baseName=file.name.replace(/\.[^.]+$/,"").replace(/[-_]+/g," ").trim();
        const title=[titlePrefix.trim(),baseName].filter(Boolean).join(" - ") || file.name;
        const doc={
          id:Date.now()+created.length,
          title,
          description:description.trim(),
          docType,
          visibility:"archive",
          category,
          pubDate,
          filePath,
          createdAt:new Date().toISOString(),
          uploaderName:user?.name||"Me",
          uploadedBy:user?.id||null,
          archiveBatch:true,
        };
        created.push(doc);
      }
      onSave(created);
    }catch(e){
      setErrMsg(e.message||"Bulk upload failed.");
      setSaving(false);
    }
  };

  const inp={width:"100%",padding:"9px 12px",border:`1px solid ${C.g200}`,borderRadius:7,fontSize:".86rem",fontFamily:sans,boxSizing:"border-box",background:C.white};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:C.white,borderRadius:12,padding:32,maxWidth:620,width:"100%",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <h2 style={{fontFamily:serif,fontSize:"1.4rem",color:C.navy,margin:0}}>Bulk Archive Upload</h2>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:"1.3rem",cursor:"pointer",color:C.g500,lineHeight:1}}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          {errMsg&&<p style={{color:C.red,fontSize:".82rem",marginBottom:12,padding:"8px 12px",background:"#fef2f2",borderRadius:6}}>{errMsg}</p>}
          <p style={{fontSize:".82rem",color:C.g500,lineHeight:1.65,marginBottom:16}}>Use this for legacy reports you do not want to republish as current research. Each file will be added to the archive library under the selected category.</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <div>
              <label style={{display:"block",fontSize:".75rem",fontWeight:700,color:C.g700,marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>Title Prefix</label>
              <input value={titlePrefix} onChange={e=>setTitlePrefix(e.target.value)} placeholder="e.g. 2024 Legacy" style={inp}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:".75rem",fontWeight:700,color:C.g700,marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>Category</label>
              <input value={category} onChange={e=>setCategory(e.target.value)} placeholder="archive, macro, equities…" style={inp}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <div>
              <label style={{display:"block",fontSize:".75rem",fontWeight:700,color:C.g700,marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>Document Type</label>
              <select value={docType} onChange={e=>setDocType(e.target.value)} style={inp}>
                <option value="report">Report</option>
                <option value="article">Article</option>
                <option value="data">Data</option>
                <option value="presentation">Presentation</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={{display:"block",fontSize:".75rem",fontWeight:700,color:C.g700,marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>Archive Date</label>
              <input type="date" value={pubDate} onChange={e=>setPubDate(e.target.value)} style={inp}/>
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:".75rem",fontWeight:700,color:C.g700,marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>Description</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} style={{...inp,resize:"vertical"}}/>
          </div>
          <div style={{marginBottom:22}}>
            <label style={{display:"block",fontSize:".75rem",fontWeight:700,color:C.g700,marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>Select Files</label>
            <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt"
              onChange={e=>setFiles(Array.from(e.target.files||[]))}
              style={{fontSize:".82rem",fontFamily:sans,color:C.g700}}/>
            <p style={{fontSize:".72rem",color:C.g500,marginTop:4}}>{files.length?`${files.length} file${files.length!==1?"s":""} selected`:"You can select multiple files at once."}</p>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button type="button" onClick={onClose} style={{padding:"10px 20px",background:C.g100,border:`1px solid ${C.g200}`,color:C.g700,borderRadius:7,fontSize:".84rem",cursor:"pointer",fontFamily:sans}}>Cancel</button>
            <button type="submit" disabled={saving} style={{padding:"10px 24px",background:C.navy,color:C.white,border:"none",borderRadius:7,fontSize:".84rem",fontWeight:600,cursor:saving?"not-allowed":"pointer",fontFamily:sans,opacity:saving?.7:1}}>
              {saving?"Uploading…":"Upload to Archive"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══ LIBRARY DOC VIEW MODAL ═══ */
function DocViewModal({doc,onClose}) {
  const ext=(doc.filePath||"").split(".").pop().toLowerCase();
  const canEmbed=["pdf"].includes(ext)&&doc.filePath;
  const canOpen=!!doc.filePath;
  const meta=[
    {l:"Type",v:doc.docType},
    {l:"Category",v:doc.category||"—"},
    {l:"Date",v:doc.pubDate||doc.createdAt?.slice(0,10)||"—"},
    {l:"Uploaded by",v:doc.uploaderName||"—"},
    {l:"Visibility",v:doc.visibility==="team"?"Team Library":doc.visibility==="archive"?"Archive":"Private"},
  ];
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:9100,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:C.white,borderRadius:14,maxWidth:640,width:"100%",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,.3)",overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"22px 24px 18px",borderBottom:`1px solid ${C.g200}`,display:"flex",alignItems:"flex-start",gap:14}}>
          <span style={{fontSize:"2rem",lineHeight:1,flexShrink:0,marginTop:2}}>{LIB_TYPE_ICONS[doc.docType]||"📎"}</span>
          <div style={{flex:1,minWidth:0}}>
            <h2 style={{fontFamily:serif,fontSize:"1.15rem",color:C.navy,fontWeight:600,margin:0,lineHeight:1.3}}>{doc.title}</h2>
            <p style={{color:C.g500,fontSize:".76rem",marginTop:4}}>{LIB_TYPE_LABELS[doc.docType]||doc.docType}{doc.category?` · ${doc.category}`:""}</p>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:"1.4rem",cursor:"pointer",color:C.g500,lineHeight:1,flexShrink:0,padding:2}}>×</button>
        </div>

        {/* Embedded PDF preview */}
        {canEmbed&&(
          <div style={{flex:1,minHeight:360,background:C.g100}}>
            <iframe src={doc.filePath} title={doc.title} style={{width:"100%",height:"100%",minHeight:360,border:"none"}}/>
          </div>
        )}

        {/* Description + meta */}
        <div style={{padding:"20px 24px",overflowY:"auto"}}>
          {doc.description&&(
            <div style={{marginBottom:18}}>
              <p style={{fontSize:".72rem",fontWeight:700,color:C.g500,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Description</p>
              <p style={{fontSize:".88rem",color:C.g700,lineHeight:1.7}}>{doc.description}</p>
            </div>
          )}
          {!doc.description&&!canEmbed&&(
            <p style={{color:C.g500,fontSize:".86rem",marginBottom:18,fontStyle:"italic"}}>No description or file attached for this document.</p>
          )}
          <div style={{display:"flex",flexWrap:"wrap",gap:18,paddingTop:doc.description||canEmbed?14:0,borderTop:doc.description||canEmbed?`1px solid ${C.g100}`:"none"}}>
            {meta.map(m=>(
              <div key={m.l}>
                <p style={{fontSize:".66rem",fontWeight:700,color:C.g500,textTransform:"uppercase",letterSpacing:.5,marginBottom:2}}>{m.l}</p>
                <p style={{fontSize:".82rem",color:C.navy,fontWeight:500,textTransform:m.l==="Type"||m.l==="Visibility"?"capitalize":"none"}}>{m.v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{padding:"14px 24px",borderTop:`1px solid ${C.g200}`,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"9px 20px",background:C.g100,border:"none",color:C.g700,borderRadius:7,fontSize:".84rem",cursor:"pointer",fontFamily:sans}}>Close</button>
          {canOpen&&(
            <>
              <a href={doc.filePath} target="_blank" rel="noopener noreferrer"
                style={{padding:"9px 20px",background:C.navy,color:C.white,borderRadius:7,fontSize:".84rem",fontWeight:600,textDecoration:"none",fontFamily:sans,display:"inline-flex",alignItems:"center",gap:5}}>
                Open in new tab ↗
              </a>
              <a href={doc.filePath} download
                style={{padding:"9px 18px",background:C.gold,color:C.white,borderRadius:7,fontSize:".84rem",fontWeight:600,textDecoration:"none",fontFamily:sans,display:"inline-flex",alignItems:"center",gap:5}}>
                ↓ Download
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ RESEARCH LIBRARY ═══ */
const LIB_TYPE_ICONS  ={report:"📄",article:"📰",data:"📊",presentation:"📽️",other:"📎"};
const LIB_TYPE_LABELS ={report:"Report",article:"Article",data:"Data",presentation:"Presentation",other:"Other"};

function DocumentBankPage({nav,user}) {
  const {library,setLibrary,trackRecentView}=useData();
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState("team");
  const [q,setQ]=useState("");
  const [sortBy,setSortBy]=useState("date_desc");
  const [typeFilter,setTypeFilter]=useState("all");
  const [showUpload,setShowUpload]=useState(false);
  const [showArchiveUpload,setShowArchiveUpload]=useState(false);
  const [viewDoc,setViewDoc]=useState(null);
  const [toast,setToast]=useState("");

  const isAdmin=user?.tier==="admin";
  const isStaff=["admin","analyst","intern"].includes(user?.tier);
  const uid=user?.id||null;

  useEffect(()=>{
    /* Try live API; fall back to global library state */
    api.library.list()
      .then(data=>{ if(data?.length) setLibrary(data); setLoading(false); })
      .catch(()=>{ setLoading(false); });
  },[setLibrary]);

  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(""),3200);};

  const teamCount=useMemo(()=>library.filter(d=>d.visibility==="team").length,[library]);
  const archiveCount=useMemo(()=>library.filter(d=>d.visibility==="archive").length,[library]);
  const privateCount=useMemo(()=>library.filter(d=>d.visibility==="private"&&d.uploadedBy===uid).length,[library,uid]);

  const filtered=useMemo(()=>{
    let base=tab==="team"
      ?library.filter(d=>d.visibility==="team")
      :tab==="archive"
        ?library.filter(d=>d.visibility==="archive")
      :library.filter(d=>d.visibility==="private"&&d.uploadedBy===uid);
    if(typeFilter!=="all") base=base.filter(d=>d.docType===typeFilter);
    const ql=q.trim().toLowerCase();
    if(ql) base=base.filter(d=>
      d.title.toLowerCase().includes(ql)||
      d.description?.toLowerCase().includes(ql)||
      d.uploaderName?.toLowerCase().includes(ql)||
      d.category?.toLowerCase().includes(ql)
    );
    base=[...base];
    if(sortBy==="date_desc") base.sort((a,b)=>new Date(b.pubDate||b.createdAt)-new Date(a.pubDate||a.createdAt));
    else if(sortBy==="date_asc") base.sort((a,b)=>new Date(a.pubDate||a.createdAt)-new Date(b.pubDate||b.createdAt));
    else if(sortBy==="title_asc") base.sort((a,b)=>a.title.localeCompare(b.title));
    else if(sortBy==="type") base.sort((a,b)=>a.docType.localeCompare(b.docType));
    return base;
  },[library,tab,uid,typeFilter,q,sortBy]);

  const handleDelete=async doc=>{
    if(!window.confirm(`Delete "${doc.title}"?`)) return;
    try{
      await api.library.remove(doc.id).catch(()=>{});
      const next=library.filter(d=>d.id!==doc.id);
      setLibrary(next);
      showToast("Document deleted.");
    }catch(e){showToast(e.message);}
  };

  const handleUploaded=newDoc=>{
    const docs=Array.isArray(newDoc)?newDoc:[newDoc];
    const next=[...docs,...library];
    setLibrary(next);
    setShowUpload(false);
    setShowArchiveUpload(false);
    showToast(docs.length>1?`${docs.length} documents added to archive.`:"Document added to library.");
  };
  const openDoc=doc=>{
    trackRecentView?.({type:"doc",id:doc.id,title:doc.title,category:doc.category});
    setViewDoc(doc);
  };

  const tabBtn=(k,label,count)=>(
    <button key={k} onClick={()=>setTab(k)} style={{padding:"10px 22px",background:"none",border:"none",
      borderBottom:`2px solid ${tab===k?C.gold:"transparent"}`,marginBottom:-2,
      fontSize:".88rem",fontWeight:tab===k?700:400,
      color:tab===k?C.navy:C.g500,cursor:"pointer",fontFamily:sans,transition:"all .15s",whiteSpace:"nowrap"}}>
      {label}
      <span style={{marginLeft:7,background:tab===k?C.navy:C.g200,color:tab===k?C.white:C.g500,
        borderRadius:20,padding:"1px 8px",fontSize:".7rem",fontWeight:600}}>{count}</span>
    </button>
  );

  return(<>
    {toast&&<div style={{position:"fixed",top:20,right:24,background:C.navy,color:C.white,
      padding:"12px 20px",borderRadius:8,fontSize:".84rem",zIndex:9999,
      boxShadow:"0 4px 20px rgba(0,0,0,.28)"}}>{toast}</div>}
    {viewDoc&&<DocViewModal doc={viewDoc} onClose={()=>setViewDoc(null)}/>}
    {showUpload&&<UploadDocModal user={user} onClose={()=>setShowUpload(false)} onSave={handleUploaded}/>}
    {showArchiveUpload&&<BulkArchiveModal user={user} onClose={()=>setShowArchiveUpload(false)} onSave={(docs)=>handleUploaded(Array.isArray(docs)?docs:[docs])}/>}

    {/* Hero */}
    <section style={{background:`linear-gradient(160deg,${C.navy} 0%,${C.navyMid} 100%)`,padding:"52px 0"}}>
      <div style={{maxWidth:1260,margin:"0 auto",padding:"0 40px",display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:16}}>
        <div>
          <p style={{color:C.gold,fontSize:".6rem",textTransform:"uppercase",letterSpacing:3,fontWeight:700,marginBottom:10,opacity:.9}}>Chapel Hill Denham</p>
          <h1 style={{fontFamily:serif,fontSize:"2.2rem",color:C.white,fontWeight:500,marginBottom:8}}>Research Library</h1>
          <p style={{color:"rgba(255,255,255,0.48)",fontSize:".88rem"}}>Internal document repository — reports, articles, data &amp; presentations</p>
        </div>
        {isStaff&&(
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <button onClick={()=>setShowArchiveUpload(true)}
              style={{display:"flex",alignItems:"center",gap:8,padding:"11px 18px",background:"rgba(255,255,255,0.08)",
                color:C.white,border:"1px solid rgba(255,255,255,0.16)",borderRadius:8,fontSize:".84rem",fontWeight:600,
                cursor:"pointer",fontFamily:sans,whiteSpace:"nowrap"}}>
              + Archive Upload
            </button>
            <button onClick={()=>setShowUpload(true)}
              style={{display:"flex",alignItems:"center",gap:8,padding:"11px 22px",background:C.gold,
                color:C.white,border:"none",borderRadius:8,fontSize:".84rem",fontWeight:600,
                cursor:"pointer",fontFamily:sans,whiteSpace:"nowrap"}}>
              + Publish File
            </button>
          </div>
        )}
      </div>
    </section>

    <section style={{padding:"40px 0"}}>
      <div style={{maxWidth:1260,margin:"0 auto",padding:"0 40px"}}>

        {/* Tabs */}
        <div style={{display:"flex",gap:0,marginBottom:28,borderBottom:`2px solid ${C.g200}`}}>
          {tabBtn("team","Team Library",teamCount)}
          {tabBtn("archive","Legacy Archive",archiveCount)}
          {tabBtn("private","My Documents",privateCount)}
        </div>

        {/* Controls */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,marginBottom:20}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[["all","All Types"],...Object.entries(LIB_TYPE_LABELS)].map(([k,v])=>(
              <button key={k} onClick={()=>setTypeFilter(k)}
                style={{padding:"5px 13px",background:typeFilter===k?C.navy:"none",
                  color:typeFilter===k?C.white:C.g500,border:`1px solid ${typeFilter===k?C.navy:C.g200}`,
                  borderRadius:16,fontSize:".74rem",cursor:"pointer",fontFamily:sans,
                  transition:"all .15s"}}>
                {k!=="all"&&(LIB_TYPE_ICONS[k]+" ")}{v}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {(q||typeFilter!=="all")&&(
              <button onClick={()=>{setQ("");setTypeFilter("all");}}
                style={{padding:"6px 12px",background:C.g100,color:C.g500,
                  border:`1px solid ${C.g200}`,borderRadius:16,fontSize:".74rem",cursor:"pointer",fontFamily:sans}}>
                Clear ✕
              </button>
            )}
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search library…"
              style={{padding:"8px 14px",border:`1px solid ${C.g200}`,borderRadius:20,
                fontSize:".82rem",fontFamily:sans,color:C.navy,width:200,background:C.white,outline:"none"}}/>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
              style={{padding:"8px 12px",border:`1px solid ${C.g200}`,borderRadius:8,
                fontSize:".8rem",fontFamily:sans,color:C.navy,background:C.white,cursor:"pointer",outline:"none"}}>
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="title_asc">Title A–Z</option>
              <option value="type">Type</option>
            </select>
          </div>
        </div>

        {/* Document list */}
        {loading?(
          <div style={{padding:60,textAlign:"center",color:C.g500}}>Loading library…</div>
        ):filtered.length===0?(
          <div style={{padding:60,textAlign:"center",color:C.g500,background:C.white,borderRadius:12,border:`1px solid ${C.g200}`}}>
            {tab==="private"?"You have no private documents yet — add one with the button above.":"No documents found."}
          </div>
        ):(
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,overflow:"hidden"}}>
            {/* Header */}
            <div style={{display:"grid",gridTemplateColumns:"36px 1fr 110px 110px 120px 160px",
              padding:"9px 18px",background:C.g100,borderBottom:`1px solid ${C.g200}`}}>
              {["","Document","Type","Date","Uploaded by","Actions"].map((h,i)=>(
                <span key={i} style={{fontSize:".68rem",fontWeight:700,color:C.g500,textTransform:"uppercase",letterSpacing:.8}}>{h}</span>
              ))}
            </div>
            {/* Rows */}
            {filtered.map((doc,i)=>{
              const canDelete=isAdmin||doc.uploadedBy===uid;
              return(
                <div key={doc.id}
                  style={{display:"grid",gridTemplateColumns:"36px 1fr 110px 110px 120px 160px",
                    padding:"14px 18px",borderBottom:i<filtered.length-1?`1px solid ${C.g100}`:"none",
                    alignItems:"center",transition:"background .1s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.offWhite}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <span style={{fontSize:"1.25rem"}}>{LIB_TYPE_ICONS[doc.docType]||"📎"}</span>
                  <div style={{overflow:"hidden",paddingRight:12,cursor:"pointer"}} onClick={()=>openDoc(doc)}>
                    <p style={{margin:0,fontSize:".88rem",fontWeight:600,color:C.navy,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:"underline",textUnderlineOffset:2,textDecorationColor:C.g300}}>{doc.title}</p>
                    {doc.description&&<p style={{margin:"2px 0 0",fontSize:".75rem",color:C.g500,lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.description}</p>}
                    {doc.category&&<span style={{display:"inline-block",marginTop:3,fontSize:".67rem",padding:"1px 7px",borderRadius:8,background:C.goldSoft,color:C.gold,fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>{doc.category}</span>}
                  </div>
                  <span style={{fontSize:".75rem",padding:"3px 9px",borderRadius:10,background:C.g100,color:C.g500,border:`1px solid ${C.g200}`,width:"fit-content"}}>{LIB_TYPE_LABELS[doc.docType]||doc.docType}</span>
                  <span style={{fontSize:".8rem",color:C.g700}}>{doc.pubDate||doc.createdAt?.slice(0,10)||"—"}</span>
                  <span style={{fontSize:".8rem",color:C.g500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.uploaderName||"—"}</span>
                  <div style={{display:"flex",gap:5,justifyContent:"flex-end",alignItems:"center"}}>
                    <button onClick={()=>openDoc(doc)}
                      style={{padding:"5px 12px",background:C.navy,color:C.white,border:"none",borderRadius:5,fontSize:".72rem",fontWeight:600,cursor:"pointer",fontFamily:sans,whiteSpace:"nowrap"}}>
                      View
                    </button>
                    {doc.filePath&&(
                      <a href={doc.filePath} download target="_blank" rel="noopener noreferrer" title="Download file"
                        style={{padding:"6px 14px",background:C.gold,color:"#fff",border:"none",borderRadius:5,
                          fontSize:".72rem",fontWeight:600,cursor:"pointer",textDecoration:"none",fontFamily:sans,whiteSpace:"nowrap"}}>
                        Download
                      </a>
                    )}
                    {canDelete&&(
                      <button onClick={()=>handleDelete(doc)} title="Delete"
                        style={{padding:"5px 8px",background:"#fef2f2",color:C.red,border:"none",
                          borderRadius:5,fontSize:".72rem",cursor:"pointer",fontFamily:sans}}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p style={{fontSize:".74rem",color:C.g500,marginTop:14}}>{filtered.length} document{filtered.length!==1?"s":""}</p>
      </div>
    </section>
  </>);
}

/* ═══ MANAGE PORTAL (admin) ═══ */
function ManagePage({nav}) {
  const {reports,analysts,funds,setReports,setAnalysts,setFunds,bioEdits,setBioEdits,categoryRules,setCategoryRules}=useData();
  const [tab,setTab]=useState("overview");
  const [toast,setToast]=useState("");
  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(""),3000);};
  const pendingBioCount=bioEdits.filter(e=>e.status==="pending").length;

  /* Reload bio edits from API when manage page opens */
  useEffect(()=>{
    api.bioEdits.list().then(rows=>{ if(rows) setBioEdits(rows); }).catch(()=>{});
  },[setBioEdits]);
  const tabs=[
    {k:"overview",  l:"Overview",    i:"📊"},
    {k:"access",    l:"Paywalls",    i:"🔒"},
    {k:"banner",    l:"Banner Media",i:"🖼️"},
    {k:"reports",   l:"Reports",     i:"📄"},
    {k:"addreport", l:"Publish Report",i:"➕"},
    {k:"analysts",  l:"Analysts",    i:"👤",badge:pendingBioCount},
    {k:"addanalyst",l:"Add Analyst", i:"➕"},
    {k:"addintern", l:"Add Intern",  i:"🎓"},
    {k:"funds",     l:"Funds",       i:"📈"},
    {k:"files",     l:"File Library",i:"📁"},
    {k:"users",     l:"User Accounts",i:"👥"},
    {k:"settings",  l:"Portal Settings",i:"⚙️"},
  ];
  const tabGroups=[
    {l:"Dashboard",items:["overview"]},
    {l:"Content",items:["reports","addreport","files","banner"]},
    {l:"People",items:["analysts","addanalyst","addintern","users"]},
    {l:"Governance",items:["access","funds","settings"]},
  ];
  const tabByKey=Object.fromEntries(tabs.map(t=>[t.k,t]));
  return (
    <div style={{minHeight:"80vh",background:C.offWhite}}>
      <section style={{background:`linear-gradient(135deg,#06262d 0%,#0b3540 52%,#134450 100%)`,padding:"44px 0"}}>
        <div style={{maxWidth:1260,margin:"0 auto",padding:"0 40px",display:"flex",alignItems:"center",gap:16}}>
          <div style={{width:48,height:48,borderRadius:12,background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem"}}>⚙️</div>
          <div><h1 style={{fontFamily:serif,fontSize:"1.9rem",color:C.white,fontWeight:500,marginBottom:2}}>Administrator Console</h1><p style={{color:"rgba(255,255,255,0.5)",fontSize:".84rem"}}>Publish reports, manage analysts, and maintain the portal</p></div>
          <div style={{marginLeft:"auto",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"6px 14px"}}>
            <span style={{color:"rgba(255,255,255,0.5)",fontSize:".68rem",textTransform:"uppercase",letterSpacing:.5}}>Role</span>
            <div style={{color:C.gold,fontWeight:700,fontSize:".78rem",marginTop:1}}>Administrator</div>
          </div>
        </div>
      </section>
      <div className="admin-cms-shell" style={{maxWidth:1260,margin:"0 auto",padding:"34px 40px",display:"grid",gridTemplateColumns:"240px 1fr",gap:24,alignItems:"start"}}>
        <aside style={{background:C.white,border:`1px solid ${C.g200}`,borderRadius:12,padding:"18px 14px",position:"sticky",top:96}}>
          <div style={{padding:"0 8px 14px",borderBottom:`1px solid ${C.g100}`,marginBottom:14}}>
            <div style={{fontSize:".68rem",fontWeight:800,letterSpacing:1.8,textTransform:"uppercase",color:C.gold,marginBottom:5}}>CMS Sections</div>
            <p style={{fontSize:".78rem",lineHeight:1.55,color:C.g500,margin:0}}>Manage content, people, access, and portal settings from one place.</p>
          </div>
          {tabGroups.map(group=>(
            <div key={group.l} style={{marginBottom:14}}>
              <div style={{fontSize:".62rem",fontWeight:800,letterSpacing:1.5,textTransform:"uppercase",color:C.g500,margin:"0 8px 8px"}}>{group.l}</div>
              <div style={{display:"grid",gap:4}}>
                {group.items.map(k=>{
                  const t=tabByKey[k];
                  const active=tab===k;
                  return (
                    <button key={k} onClick={()=>setTab(k)} style={{width:"100%",display:"flex",alignItems:"center",gap:9,textAlign:"left",padding:"10px 10px",background:active?"rgba(6,38,45,0.06)":"transparent",border:`1px solid ${active?"rgba(185,114,49,0.22)":"transparent"}`,borderRadius:9,color:active?C.navy:C.g700,fontSize:".8rem",fontWeight:active?700:500,cursor:"pointer",fontFamily:sans}}>
                      <span style={{width:20,textAlign:"center",opacity:active?1:.75}}>{t.i}</span>
                      <span style={{flex:1}}>{t.l}</span>
                      {t.badge>0&&<span style={{background:C.red,color:"#fff",borderRadius:10,fontSize:".6rem",fontWeight:700,padding:"1px 6px",minWidth:18,textAlign:"center"}}>{t.badge}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>
        <main style={{minWidth:0}}>
          {tab==="overview"   &&<OverviewTab    reports={reports} analysts={analysts} categoryRules={categoryRules}/>}
          {tab==="access"     &&<AccessRulesTab categoryRules={categoryRules} setCategoryRules={setCategoryRules}/>}
          {tab==="banner"     &&<BannerMediaTab showToast={showToast}/>}
          {tab==="reports"    &&<ReportsTab     reports={reports} analysts={analysts} setReports={setReports} showToast={showToast}/>}
          {tab==="addreport"  &&<AddReportTab   analysts={analysts} reports={reports} setReports={setReports} showToast={showToast} onDone={()=>setTab("reports")}/>}
          {tab==="analysts"   &&<AnalystsTab    analysts={analysts} setAnalysts={setAnalysts} showToast={showToast}/>}
          {tab==="addanalyst" &&<AddAnalystTab  analysts={analysts} setAnalysts={setAnalysts} showToast={showToast} onDone={()=>setTab("analysts")}/>}
          {tab==="addintern"  &&<AddInternTab   analysts={analysts} setAnalysts={setAnalysts} showToast={showToast} onDone={()=>setTab("analysts")}/>}
          {tab==="funds"      &&<FundsAdminTab  funds={funds} setFunds={setFunds} showToast={showToast}/>}
          {tab==="files"      &&<FileManagerTab showToast={showToast}/>}
          {tab==="users"      &&<UsersTab       showToast={showToast}/>}
          {tab==="settings"   &&<SettingsTab    showToast={showToast}/>}
        </main>
      </div>`r`n      {toast&&<div style={{position:"fixed",right:24,bottom:24,background:C.navy,color:"#fff",padding:"13px 18px",borderRadius:10,boxShadow:"0 16px 40px rgba(6,38,45,0.24)",fontSize:".83rem",zIndex:300,display:"flex",alignItems:"center",gap:8,border:`1px solid rgba(185,114,49,0.18)`}}><span style={{color:C.gold}}>✓</span>{toast}</div>}
    </div>
  );
}

function OverviewTab({reports,analysts,categoryRules}) {
  const publishedReports = reports.filter(r=>r.status==="published");
  const pendingReports = reports.filter(r=>r.status==="pending");
  const rejectedReports = reports.filter(r=>r.status==="rejected");
  const stats=[
    {l:"Total Reports",v:reports.length,sub:"Published",c:C.navy,bg:"#eef2f7"},
    {l:"Team Access",v:reports.filter(r=>effectiveAccess(r,categoryRules)==="free").length,sub:"Free or inherited",c:C.green,bg:"#edf4ef"},
    {l:"Analysts",v:analysts.length,sub:"Active contributors",c:C.gold,bg:"#f7eedf"},
    {l:"Pending Review",v:pendingReports.length,sub:"Awaiting action",c:C.red,bg:"#fef2f2"},
  ];
  const accessSummary = pCats().map(cat => ({ name: cat.name, access: categoryRules[cat.id] || CATEGORY_ACCESS_DEFAULTS[cat.id] || "free" }));
  const byCat=CATS.filter(c=>!c.p).map(c=>{
    const ch=childCats(c.id),count=reports.filter(r=>r.cat===c.id||ch.some(x=>x.id===r.cat)).length;
    return{name:c.name,count,icon:c.icon};
  }).filter(x=>x.count>0).sort((a,b)=>b.count-a.count);
  const weekMap = reports.reduce((acc,report)=>{
    const d = new Date(`${report.date}T00:00:00`);
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    const key = d.toISOString().slice(0,10);
    if(!acc[key]) acc[key]={week:key,published:0,pending:0,rejected:0};
    if(report.status==="published") acc[key].published += 1;
    if(report.status==="pending") acc[key].pending += 1;
    if(report.status==="rejected") acc[key].rejected += 1;
    return acc;
  },{});
  const recentWeeks = Object.values(weekMap).sort((a,b)=>b.week.localeCompare(a.week)).slice(0,4);
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:18,marginBottom:36}}>
        {stats.map((s,i)=>(
          <div key={i} style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"22px 18px"}}>
            <div style={{width:38,height:38,borderRadius:9,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12,color:s.c,fontWeight:700,fontSize:".9rem"}}>{s.v}</div>
            <div style={{fontWeight:700,fontSize:"1.5rem",color:C.navy,fontFamily:serif,marginBottom:2}}>{s.v}</div>
            <div style={{fontSize:".8rem",fontWeight:600,color:C.navy,marginBottom:2}}>{s.l}</div>
            <div style={{fontSize:".72rem",color:C.g500}}>{s.sub}</div>
          </div>
          ))}
      </div>
      <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"20px 22px",marginBottom:22}}>
        <div style={{fontSize:".68rem",fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:C.gold,marginBottom:10}}>Current category defaults</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {accessSummary.map(item=><AccessBadge key={item.name} access={item.access}/>)}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:22,marginBottom:22}}>
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"26px"}}>
          <h3 style={{fontFamily:serif,fontSize:"1.05rem",color:C.navy,marginBottom:18,fontWeight:600}}>Reports by Category</h3>
          {byCat.map((c,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <span>{c.icon}</span>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:".8rem",color:C.navy}}>{c.name}</span><span style={{fontSize:".8rem",fontWeight:700,color:C.navy}}>{c.count}</span></div>
                <div style={{height:5,background:C.g100,borderRadius:3}}><div style={{height:5,background:C.violet,borderRadius:3,width:`${(c.count/reports.length)*100}%`,transition:"width .4s"}}/></div>
              </div>
            </div>
          ))}
        </div>
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"26px"}}>
          <h3 style={{fontFamily:serif,fontSize:"1.05rem",color:C.navy,marginBottom:18,fontWeight:600}}>Recent Reports</h3>
          {reports.slice(0,5).map(r=>(
            <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${C.g100}`}}>
              <div style={{width:34,height:34,borderRadius:7,background:effectiveAccess(r,categoryRules)==="premium"?"#fef3c7":effectiveAccess(r,categoryRules)==="registered"?"#dbeafe":"#dcfce7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".6rem",fontWeight:700,color:effectiveAccess(r,categoryRules)==="premium"?"#d97706":effectiveAccess(r,categoryRules)==="registered"?"#2563eb":C.green,flexShrink:0}}>{effectiveAccess(r,categoryRules)==="premium"?"SUB":effectiveAccess(r,categoryRules)==="registered"?"MEM":"FREE"}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:".82rem",fontWeight:600,color:C.navy,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</div><div style={{fontSize:".7rem",color:C.g500,marginTop:1}}>{fd(r.date)}</div></div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:22}}>
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"26px"}}>
          <h3 style={{fontFamily:serif,fontSize:"1.05rem",color:C.navy,marginBottom:18,fontWeight:600}}>Editorial Workflow</h3>
          <div style={{display:"grid",gap:12}}>
            {[
              {label:"Published",value:publishedReports.length,color:C.green,bg:"#edf4ef"},
              {label:"Pending review",value:pendingReports.length,color:"#b45309",bg:"#fef3c7"},
              {label:"Needs revision",value:rejectedReports.length,color:C.red,bg:"#fef2f2"},
            ].map(item=>(
              <div key={item.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderRadius:10,background:item.bg}}>
                <span style={{fontSize:".82rem",color:C.navy,fontWeight:600}}>{item.label}</span>
                <span style={{fontSize:".92rem",fontWeight:700,color:item.color}}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"26px"}}>
          <h3 style={{fontFamily:serif,fontSize:"1.05rem",color:C.navy,marginBottom:18,fontWeight:600}}>Publishing Calendar</h3>
          <div style={{display:"grid",gap:10}}>
            {recentWeeks.map(week=>(
              <div key={week.week} style={{display:"grid",gridTemplateColumns:"1fr auto auto auto",gap:10,alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.g100}`}}>
                <span style={{fontSize:".8rem",color:C.navy}}>Week of {fd(week.week)}</span>
                <span style={{fontSize:".74rem",color:C.green,fontWeight:700}}>Pub {week.published}</span>
                <span style={{fontSize:".74rem",color:"#b45309",fontWeight:700}}>Pend {week.pending}</span>
                <span style={{fontSize:".74rem",color:C.red,fontWeight:700}}>Rev {week.rejected}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AccessRulesTab({categoryRules,setCategoryRules}) {
  const rows = pCats().map(cat => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    access: categoryRules[cat.id] || CATEGORY_ACCESS_DEFAULTS[cat.id] || "free",
  }));
  const setAccess = (id, access) => {
    setCategoryRules(prev => ({ ...prev, [id]: access }));
  };
  const badge = access => <AccessBadge access={access} />;
  const options = ["free", "registered", "premium"];
  return (
    <div>
      <SH title="Category Paywalls" sub="Set the default access tier for each report category. Reports can still be overridden individually." />
      <div style={{display:"grid",gap:14}}>
        {rows.map(row=>(
          <div key={row.id} style={{background:C.white,border:`1px solid ${C.g200}`,borderRadius:14,padding:"18px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:42,height:42,borderRadius:12,background:C.goldSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.15rem"}}>{row.icon}</div>
              <div>
                <div style={{fontWeight:700,color:C.navy,fontSize:".92rem"}}>{row.name}</div>
                <div style={{fontSize:".75rem",color:C.g500,marginTop:2}}>Default category rule for new and inherited reports</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              {badge(row.access)}
              {options.map(o=>(
                <button key={o} onClick={()=>setAccess(row.id,o)} style={{padding:"7px 12px",background:row.access===o?C.navy:C.g100,color:row.access===o?"#fff":C.g700,border:"none",borderRadius:999,fontSize:".74rem",fontWeight:700,cursor:"pointer",fontFamily:sans}}>{o}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{marginTop:16,background:"#f8fafc",border:`1px solid ${C.g200}`,borderRadius:12,padding:"14px 16px",fontSize:".8rem",color:C.g700,lineHeight:1.7}}>
        Changing these rules affects reports created with the <strong>Category default</strong> access setting. Use the Reports tab if you want to override one report manually.
      </div>
    </div>
  );
}

function BannerMediaTab({showToast}) {
  const {bannerMedia,setBannerMedia}=useData();
  const updateSlide = (index, patch) => {
    setBannerMedia(prev => prev.map((slide, i) => i === index ? {...slide, ...patch} : slide));
  };
  const moveSlide = (index, direction) => {
    setBannerMedia(prev => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const handleUpload = async (index, file) => {
    if (!file) return;
    try {
      const mediaUrl = await fileToDataURL(file);
      updateSlide(index, {mediaUrl});
      showToast("Banner media updated.");
    } catch {
      showToast("Unable to read the selected file.");
    }
  };
  const resetAll = () => {
    setBannerMedia(DEFAULT_BANNER_MEDIA);
    showToast("Banner media reset.");
  };
  const positionOptions = [
    {v:"left center", l:"Left center"},
    {v:"center center", l:"Center"},
    {v:"right center", l:"Right center"},
    {v:"center top", l:"Top center"},
    {v:"center bottom", l:"Bottom center"},
  ];
  return (
    <div>
      <SH title="Banner Media" sub="Upload banner imagery, set the focal position, choose the slide side, and adjust each duration." />
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:16}}>
        <p style={{fontSize:".82rem",color:C.g500,maxWidth:720,lineHeight:1.65,margin:0}}>These controls affect the home hero only. Leave a slide empty if you want the dashboard-style block to remain live and text-led.</p>
        <button onClick={resetAll} style={{padding:"9px 14px",background:C.g100,color:C.navy,border:`1px solid ${C.g200}`,borderRadius:999,fontSize:".78rem",fontWeight:700,cursor:"pointer",fontFamily:sans}}>Reset to defaults</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))",gap:16,marginBottom:18}}>
        <div style={{background:"linear-gradient(180deg, rgba(6,38,45,0.98), rgba(8,26,34,0.96))",border:"1px solid rgba(185,114,49,0.18)",borderRadius:14,padding:18,color:"#fff"}}>
          <div style={{fontSize:".72rem",textTransform:"uppercase",letterSpacing:1.8,color:"rgba(255,255,255,0.68)",fontWeight:800,marginBottom:8}}>Recommended sizes</div>
          <div style={{display:"grid",gap:10,fontSize:".84rem",lineHeight:1.6,color:"rgba(255,255,255,0.88)"}}>
            <div><strong>Hero image:</strong> 1600 × 900 or 1920 × 1080 for wide landscape banners.</div>
            <div><strong>Image panel:</strong> 1200 × 900 is a safe fit for the right-side slide card.</div>
            <div><strong>Safe area:</strong> keep faces, logos, and text near the center because the frame uses a crop fit.</div>
          </div>
        </div>
        <div style={{background:C.white,border:`1px solid ${C.g200}`,borderRadius:14,padding:18}}>
          <div style={{fontSize:".72rem",textTransform:"uppercase",letterSpacing:1.8,color:C.gold,fontWeight:800,marginBottom:8}}>Crop behavior</div>
          <div style={{fontSize:".84rem",color:C.g700,lineHeight:1.75}}>
            The live hero uses a cover-style fit, so images can be trimmed at the edges to keep the layout clean. If an image feels cut off, move the important content toward the center or pick a wider landscape frame.
          </div>
        </div>
      </div>
      <div style={{display:"grid",gap:16}}>
        {bannerMedia.map((slide, index) => (
          <div key={index} style={{background:C.white,border:`1px solid ${C.g200}`,borderRadius:14,padding:18,display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))",gap:16,alignItems:"start"}}>
            <div style={{background:C.offWhite,border:`1px solid ${C.g200}`,borderRadius:12,overflow:"hidden",minHeight:140,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {slide.mediaUrl ? (
                <img src={slide.mediaUrl} alt={`Banner slide ${index + 1}`} style={{width:"100%",height:140,objectFit:"cover",objectPosition:slide.mediaPosition||"center center"}} />
              ) : (
                <div style={{textAlign:"center",padding:16,color:C.g500}}>
                  <div style={{fontSize:"1.5rem",marginBottom:6}}>🖼️</div>
                  <div style={{fontSize:".78rem",fontWeight:700,color:C.navy}}>No media set</div>
                  <div style={{fontSize:".72rem",lineHeight:1.5,marginTop:4}}>Leave this slide text-led or upload a banner image.</div>
                </div>
              )}
            </div>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}>
                <div>
                  <div style={{fontSize:".72rem",textTransform:"uppercase",letterSpacing:1.8,color:C.gold,fontWeight:800,marginBottom:4}}>Slide {index + 1}</div>
                  <div style={{fontSize:".85rem",fontWeight:700,color:C.navy}}>Duration {slide.duration || 6}s</div>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button onClick={()=>moveSlide(index,-1)} disabled={index===0} style={{padding:"7px 10px",background:index===0?C.g100:C.navy,color:index===0?C.g500:"#fff",border:"none",borderRadius:999,fontSize:".72rem",fontWeight:700,cursor:index===0?"not-allowed":"pointer",fontFamily:sans}}>↑ Move</button>
                  <button onClick={()=>moveSlide(index,1)} disabled={index===bannerMedia.length-1} style={{padding:"7px 10px",background:index===bannerMedia.length-1?C.g100:C.navy,color:index===bannerMedia.length-1?C.g500:"#fff",border:"none",borderRadius:999,fontSize:".72rem",fontWeight:700,cursor:index===bannerMedia.length-1?"not-allowed":"pointer",fontFamily:sans}}>↓ Move</button>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <label style={{display:"block"}}>
                  <span style={{display:"block",fontSize:".7rem",fontWeight:800,textTransform:"uppercase",letterSpacing:1.4,color:C.g500,marginBottom:6}}>Upload media</span>
                  <input type="file" accept="image/*" onChange={e=>handleUpload(index,e.target.files?.[0]||null)} style={{width:"100%",fontSize:".82rem",fontFamily:sans}} />
                </label>
                <label style={{display:"block"}}>
                  <span style={{display:"block",fontSize:".7rem",fontWeight:800,textTransform:"uppercase",letterSpacing:1.4,color:C.g500,marginBottom:6}}>Duration (seconds)</span>
                  <input type="number" min="3" max="20" step="1" value={slide.duration || 6} onChange={e=>updateSlide(index,{duration:Math.max(3, Math.min(20, Number(e.target.value) || 6))})} style={{width:"100%",padding:"10px 12px",border:`1px solid ${C.g200}`,borderRadius:8,fontSize:".86rem",fontFamily:sans}} />
                </label>
                <label style={{display:"block"}}>
                  <span style={{display:"block",fontSize:".7rem",fontWeight:800,textTransform:"uppercase",letterSpacing:1.4,color:C.g500,marginBottom:6}}>Layout side</span>
                  <select value={slide.layout || "right"} onChange={e=>updateSlide(index,{layout:e.target.value})} style={{width:"100%",padding:"10px 12px",border:`1px solid ${C.g200}`,borderRadius:8,fontSize:".86rem",fontFamily:sans,background:C.white}}>
                    <option value="left">Media left</option>
                    <option value="right">Media right</option>
                  </select>
                </label>
                <label style={{display:"block"}}>
                  <span style={{display:"block",fontSize:".7rem",fontWeight:800,textTransform:"uppercase",letterSpacing:1.4,color:C.g500,marginBottom:6}}>Focal position</span>
                  <select value={slide.mediaPosition || "center center"} onChange={e=>updateSlide(index,{mediaPosition:e.target.value})} style={{width:"100%",padding:"10px 12px",border:`1px solid ${C.g200}`,borderRadius:8,fontSize:".86rem",fontFamily:sans,background:C.white}}>
                    {positionOptions.map(opt=><option key={opt.v} value={opt.v}>{opt.l}</option>)}
                  </select>
                </label>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginTop:12}}>
                <button onClick={()=>updateSlide(index,{mediaUrl:null})} style={{padding:"8px 12px",background:C.g100,color:C.g700,border:`1px solid ${C.g200}`,borderRadius:999,fontSize:".74rem",fontWeight:700,cursor:"pointer",fontFamily:sans}}>Remove media</button>
                <div style={{fontSize:".72rem",color:C.g500,lineHeight:1.5}}>Use this to preview a live hero with or without imagery before the final rollout.</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsTab({reports,analysts,setReports,showToast}) {
  const [confirm,setConfirm]=useState(null);
  const [search,setSearch]=useState("");
  const [editAccessId,setEditAccessId]=useState(null);
  const del=id=>{
    setReports(p=>p.filter(r=>r.id!==id));showToast("Report deleted.");setConfirm(null);
    api.reports.remove(id).catch(()=>{});
  };
  const changeAccess=(id,access)=>{
    setReports(p=>p.map(r=>r.id===id?{...r,access}:r));showToast("Access tier updated.");setEditAccessId(null);
    api.reports.changeAccess(id,access).catch(()=>{});
  };
  const accOpts=["inherit","free","registered","premium"];
  const accLabel={inherit:"Category",free:"Free",registered:"Members",premium:"Subscribers"};
  /* Sort newest first, then filter by search */
  const sorted=[...reports].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const filtered=search.trim()?sorted.filter(r=>r.title.toLowerCase().includes(search.toLowerCase())||r.ex?.toLowerCase().includes(search.toLowerCase())):sorted;
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{fontFamily:serif,fontSize:"1.9rem",color:C.navy,fontWeight:500,margin:0,lineHeight:1.15}}>All Reports</h2>
          <div style={{width:32,height:2.5,background:C.gold,borderRadius:2,marginTop:10}}/>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search reports…" style={{padding:"9px 14px",border:`1px solid ${C.g200}`,borderRadius:8,fontSize:".83rem",fontFamily:sans,color:C.navy,width:240,background:C.white}}/>
      </div>
      <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:C.g100,borderBottom:`1px solid ${C.g200}`}}>
            {["Title","Category","Access","Analyst","Date","Actions"].map((h,i)=><th key={i} style={{padding:"11px 14px",textAlign:"left",fontSize:".68rem",fontWeight:700,color:C.g500,textTransform:"uppercase",letterSpacing:.5}}>{h}</th>)}
          </tr></thead>
          <tbody>{filtered.map((r,i)=>{
            const cat=gc(r.cat),pc=gpc(r.cat),a=r.aid?ga(r.aid,analysts):null;
            const dc=cat?.p?`${pc?.name} · ${cat.name}`:cat?.name;
            return (
              <tr key={r.id} style={{borderBottom:`1px solid ${C.g100}`,background:i%2===0?C.white:C.offWhite}}>
                <td style={{padding:"13px 14px",maxWidth:260}}><div style={{fontSize:".83rem",fontWeight:600,color:C.navy,lineHeight:1.35}}>{r.title}</div></td>
                <td style={{padding:"13px 14px",fontSize:".79rem",color:C.g500,whiteSpace:"nowrap"}}>{dc}</td>
                <td style={{padding:"13px 14px"}}>
                  {editAccessId===r.id?(
                    <div style={{display:"flex",gap:3}}>
                      {accOpts.map(a=>(
                        <button key={a} onClick={()=>changeAccess(r.id,a)} style={{padding:"3px 8px",background:a===r.access?C.navy:C.g100,color:a===r.access?"#fff":C.g700,border:"none",borderRadius:4,fontSize:".68rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>{accLabel[a]}</button>
                      ))}
                      <button onClick={()=>setEditAccessId(null)} style={{padding:"3px 7px",background:"none",border:"none",color:C.g500,fontSize:".7rem",cursor:"pointer",fontFamily:sans}}>✕</button>
                    </div>
                  ):(
                    <span onClick={()=>setEditAccessId(r.id)} style={{cursor:"pointer"}} title="Click to change access tier"><AccessBadge access={r.access}/></span>
                  )}
                </td>
                <td style={{padding:"13px 14px",fontSize:".79rem",color:C.g700}}>{a?.name||"Research Desk"}</td>
                <td style={{padding:"13px 14px",fontSize:".79rem",color:C.g500,whiteSpace:"nowrap"}}>{fd(r.date)}</td>
                <td style={{padding:"13px 14px",textAlign:"right"}}>
                  {confirm===r.id
                    ?<span style={{display:"inline-flex",gap:5}}><button onClick={()=>del(r.id)} style={{padding:"4px 10px",background:C.red,color:"#fff",border:"none",borderRadius:5,fontSize:".7rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>Confirm</button><button onClick={()=>setConfirm(null)} style={{padding:"4px 10px",background:C.g200,color:C.g700,border:"none",borderRadius:5,fontSize:".7rem",cursor:"pointer",fontFamily:sans}}>Cancel</button></span>
                    :<button onClick={()=>setConfirm(r.id)} style={{padding:"4px 10px",background:"#fef2f2",color:C.red,border:`1px solid #fecaca`,borderRadius:5,fontSize:".7rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>Delete</button>}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
        {filtered.length===0&&<div style={{padding:"32px",textAlign:"center",color:C.g500,fontSize:".84rem"}}>No reports match "{search}".</div>}
      </div>
    </div>
  );
}

function AddReportTab({analysts,reports,setReports,showToast,onDone}) {
  const {mailingList,categoryRules}=useData();
  const blank={title:"",ex:"",body:"",cat:"macro",aid:"",access:CATEGORY_ACCESS_DEFAULTS.macro,date:new Date().toISOString().slice(0,10),sendToMailing:false};
  const [form,setForm]=useState(blank);
  const [error,setError]=useState("");
  const accessForCat=cat=>categoryRules[cat]||CATEGORY_ACCESS_DEFAULTS[cat]||"free";
  const f=k=>e=>setForm(prev=>{
    const next={...prev,[k]:e.target.value};
    if(k==="cat" && next.access==="inherit") next.access=accessForCat(e.target.value);
    return next;
  });
  const submit=async()=>{
    if(!form.title.trim()||!form.ex.trim()){setError("Title and excerpt are required.");return;}
    const access=form.access==="inherit" ? accessForCat(form.cat) : form.access;
    const optimistic={...form,access,id:nextId(reports),aid:form.aid?parseInt(form.aid):null,status:"published"};
    setReports(prev=>[optimistic,...prev]);
    if(form.sendToMailing&&mailingList.length>0){
      showToast(`"${form.title}" published and sent to ${mailingList.length} subscribers.`);
    }else{
      showToast(`"${form.title}" published.`);
    }
    setForm(blank);setError("");onDone();
    try{
      const saved=await api.reports.create({...form,access,aid:form.aid?parseInt(form.aid):null});
      setReports(prev=>prev.map(r=>r.id===optimistic.id?saved:r));
    }catch(e){console.warn("API save failed:",e.message);}
  };
  const catOpts=CATS.map(c=>({v:c.id,l:c.p?`  └ ${c.name}`:c.name}));
  const anaOpts=[{v:"",l:"— Research Desk (no analyst) —"},...analysts.map(a=>({v:String(a.id),l:a.name}))];
  const accessOpts=[
    {v:"inherit",l:"Use category default"},
    {v:"free",l:"Free"},
    {v:"registered",l:"Members"},
    {v:"premium",l:"Premium"},
  ];
  return (
    <div style={{maxWidth:700}}>
      <SH title="Upload New Report"/>
      {error&&<div style={{background:"#fef2f2",color:C.red,padding:"9px 13px",borderRadius:7,fontSize:".83rem",marginBottom:14}}>{error}</div>}
      <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"26px"}}>
        <Inp label="Report Title" value={form.title} onChange={f("title")} placeholder="e.g. Dangote Cement — Q2 2026 Preview" required/>
        <Inp label="Excerpt / Summary" value={form.ex} onChange={f("ex")} as="textarea" rows={3} placeholder="2-3 sentence summary shown on the report card…" required/>
        <Inp label="Full Report Body" value={form.body} onChange={f("body")} as="textarea" rows={7} placeholder="Full analysis (shown to all users). Separate paragraphs with a blank line."/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="Category" value={form.cat} onChange={f("cat")} as="select" options={catOpts}/>
          <Inp label="Analyst" value={form.aid} onChange={f("aid")} as="select" options={anaOpts}/>
        </div>
        <Inp label="Access Tier" value={form.access} onChange={f("access")} as="select" options={accessOpts}/>
        <Inp label="Publication Date" value={form.date} onChange={f("date")} type="date"/>
        <div style={{background:mailingList.length>0?C.goldSoft:"#f5f5f5",border:`1px solid ${mailingList.length>0?"rgba(185,114,49,0.3)":"#e5e5e5"}`,borderRadius:8,padding:"12px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
          <input type="checkbox" disabled={mailingList.length===0} checked={form.sendToMailing} onChange={e=>setForm({...form,sendToMailing:e.target.checked})} style={{cursor:mailingList.length>0?"pointer":"not-allowed",width:18,height:18,accentColor:C.gold,opacity:mailingList.length>0?1:0.5}}/>
          <label style={{fontSize:".82rem",color:mailingList.length>0?C.navy:"#999",cursor:mailingList.length>0?"pointer":"default",flex:1}}>Send to mailing list ({mailingList.length} subscriber{mailingList.length!==1?"s":""}){mailingList.length===0?" — add emails in footer to enable":""}</label>
        </div>
        <div style={{display:"flex",gap:10,marginTop:6}}>
          <button onClick={submit} style={{padding:"11px 24px",background:C.violet,color:"#fff",border:"none",borderRadius:7,fontSize:".86rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>Publish Report</button>
          <button onClick={()=>setForm(blank)} style={{padding:"11px 18px",background:C.g100,color:C.g700,border:"none",borderRadius:7,fontSize:".86rem",cursor:"pointer",fontFamily:sans}}>Clear</button>
        </div>
      </div>
    </div>
  );
}

function AnalystsTab({analysts,setAnalysts,showToast}) {
  const {bioEdits,setBioEdits}=useData();
  const [confirm,setConfirm]=useState(null);
  const [editBioId,setEditBioId]=useState(null);
  const [editBioText,setEditBioText]=useState("");
  const del=id=>{
    setAnalysts(p=>p.filter(a=>a.id!==id));showToast("Analyst removed.");setConfirm(null);
    api.analysts.remove(id).catch(()=>{});
  };
  const startEditBio=(a)=>{setEditBioId(a.id);setEditBioText(a.bio||"");};
  const saveBio=id=>{
    const bio=editBioText.trim();
    setAnalysts(p=>p.map(a=>a.id===id?{...a,bio}:a));
    setBioEdits(p=>p.map(e=>e.analystId===id&&e.status==="pending"?{...e,status:"approved"}:e));
    showToast("Bio updated.");setEditBioId(null);
    api.analysts.update(id,{bio}).catch(()=>{});
  };
  const pendingBios=bioEdits.filter(e=>e.status==="pending");

  const approveBio=edit=>{
    setAnalysts(p=>p.map(a=>a.id===edit.analystId?{...a,bio:edit.newBio}:a));
    setBioEdits(p=>p.map(e=>e.id===edit.id?{...e,status:"approved"}:e));
    showToast("Bio update approved and published.");
    api.bioEdits.approve(edit.id).catch(()=>{});
  };
  const rejectBio=edit=>{
    setBioEdits(p=>p.map(e=>e.id===edit.id?{...e,status:"rejected"}:e));
    showToast("Bio update rejected.");
    api.bioEdits.reject(edit.id).catch(()=>{});
  };

  return (
    <div>
      {/* Pending bio edits */}
      {pendingBios.length>0&&(
        <div style={{marginBottom:32}}>
          <SH title="Pending Bio Updates" sub={`${pendingBios.length} awaiting approval`}/>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {pendingBios.map(edit=>{
              const a=analysts.find(x=>x.id===edit.analystId);
              return (
                <div key={edit.id} style={{background:C.white,borderRadius:12,border:"1px solid #fde047",overflow:"hidden"}}>
                  <div style={{background:"#fef9c3",padding:"9px 18px",borderBottom:"1px solid #fde047",display:"flex",alignItems:"center",gap:10}}>
                    <AnalystAvatar analyst={a} size={28} fontSize=".7rem"/>
                    <span style={{fontSize:".78rem",fontWeight:700,color:"#854d0e"}}>{a?.name}</span>
                    <span style={{fontSize:".73rem",color:"#92400e",marginLeft:"auto"}}>Bio update request</span>
                  </div>
                  <div style={{padding:"16px 18px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                    <div>
                      <p style={{fontSize:".65rem",fontWeight:700,color:C.g500,textTransform:"uppercase",letterSpacing:.4,marginBottom:6}}>Current Bio</p>
                      <p style={{fontSize:".82rem",color:C.g700,lineHeight:1.65}}>{a?.bio||<em>None</em>}</p>
                    </div>
                    <div>
                      <p style={{fontSize:".65rem",fontWeight:700,color:"#0891b2",textTransform:"uppercase",letterSpacing:.4,marginBottom:6}}>Proposed Bio</p>
                      <p style={{fontSize:".82rem",color:C.navy,lineHeight:1.65,fontWeight:500}}>{edit.newBio}</p>
                    </div>
                  </div>
                  <div style={{padding:"12px 18px",borderTop:`1px solid ${C.g100}`,display:"flex",gap:8}}>
                    <button onClick={()=>approveBio(edit)} style={{padding:"7px 18px",background:"#16a34a",color:"#fff",border:"none",borderRadius:6,fontSize:".78rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>✓ Approve</button>
                    <button onClick={()=>rejectBio(edit)} style={{padding:"7px 14px",background:"#fef2f2",color:C.red,border:"1px solid #fca5a5",borderRadius:6,fontSize:".78rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>✕ Reject</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <SH title="Analysts" sub={`${analysts.length} active contributor${analysts.length!==1?"s":""}`}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:18}}>
        {analysts.map(a=>(
          <div key={a.id} style={{background:C.white,borderRadius:12,border:`1px solid ${editBioId===a.id?C.gold:C.g200}`,padding:"22px",transition:"border-color .15s"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <AnalystAvatar analyst={a} size={46} fontSize="1rem"/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:".88rem",color:C.navy}}>{a.name}</div>
                <div style={{fontSize:".72rem",color:a.role==="intern"?"#0891b2":C.gold,fontWeight:600,marginTop:1}}>{a.title}{a.role==="intern"&&" · Intern"}</div>
              </div>
            </div>
            <div style={{fontSize:".76rem",color:C.g500,marginBottom:6,lineHeight:1.5}}>{a.cov}</div>
            <div style={{fontSize:".73rem",color:C.g500,marginBottom:10}}>{a.email}</div>
            {/* Bio section */}
            {editBioId===a.id?(
              <div style={{marginBottom:10}}>
                <textarea value={editBioText} onChange={e=>setEditBioText(e.target.value)} rows={4} style={{width:"100%",padding:"9px 11px",border:`1px solid ${C.gold}`,borderRadius:7,fontSize:".8rem",fontFamily:sans,resize:"vertical",marginBottom:7}}/>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>saveBio(a.id)} style={{padding:"5px 14px",background:C.gold,color:"#fff",border:"none",borderRadius:5,fontSize:".74rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>Save</button>
                  <button onClick={()=>setEditBioId(null)} style={{padding:"5px 10px",background:C.g100,color:C.g700,border:"none",borderRadius:5,fontSize:".74rem",cursor:"pointer",fontFamily:sans}}>Cancel</button>
                </div>
              </div>
            ):(
              <div style={{fontSize:".78rem",color:C.g700,lineHeight:1.6,marginBottom:10,minHeight:18}}>
                {a.bio?<span style={{WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",display:"-webkit-box"}}>{a.bio}</span>:<em style={{color:C.g500}}>No bio yet</em>}
              </div>
            )}
            <div style={{paddingTop:10,borderTop:`1px solid ${C.g100}`,display:"flex",gap:6,flexWrap:"wrap"}}>
              {editBioId!==a.id&&<button onClick={()=>startEditBio(a)} style={{padding:"4px 10px",background:C.goldSoft,color:C.gold,border:`1px solid rgba(187,115,50,0.25)`,borderRadius:5,fontSize:".7rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>Edit Bio</button>}
              {confirm===a.id
                ?<span style={{display:"inline-flex",gap:5}}><button onClick={()=>del(a.id)} style={{padding:"4px 10px",background:C.red,color:"#fff",border:"none",borderRadius:5,fontSize:".7rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>Confirm</button><button onClick={()=>setConfirm(null)} style={{padding:"4px 10px",background:C.g200,color:C.g700,border:"none",borderRadius:5,fontSize:".7rem",cursor:"pointer",fontFamily:sans}}>Cancel</button></span>
                :<button onClick={()=>setConfirm(a.id)} style={{padding:"4px 10px",background:"#fef2f2",color:C.red,border:`1px solid #fecaca`,borderRadius:5,fontSize:".7rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>Remove</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddAnalystTab({analysts,setAnalysts,showToast,onDone}) {
  const blank={name:"",ini:"",title:"",cov:"",email:"",bio:""};
  const [form,setForm]=useState(blank);
  const [photoFile,setPhotoFile]=useState(null);
  const [error,setError]=useState("");
  const preview=usePhotoPreview(photoFile);
  const f=k=>e=>setForm({...form,[k]:e.target.value});
  const submit=async()=>{
    if(!form.name.trim()||!form.ini.trim()||!form.title.trim()){setError("Name, initials, and title are required.");return;}
    /* Upload photo first if one was selected */
    let photoUrl=preview||null;
    if(photoFile){
      try{ const r=await api.upload.photo(photoFile); photoUrl=r.url; }
      catch{ /* keep preview URL if upload fails */ }
    }
    const optimistic={...form,id:nextId(analysts),role:"analyst",supervisorId:null,photo:photoUrl};
    setAnalysts(prev=>[...prev,optimistic]);
    /* Auto-create local user account with default password + force password change on first login */
    if(form.email.trim()){
      const existing=lsGet(LS.demoUsers)||[];
      if(!existing.find(x=>x.email===form.email.trim())){
        lsSet(LS.demoUsers,[...existing,{id:Date.now(),name:form.name,email:form.email.trim(),tier:"analyst",password:"re5earch15life",title:form.title||"Research Analyst",mustChange:true}]);
      }
    }
    showToast(`${form.name} added.`);setForm(blank);setPhotoFile(null);setError("");onDone();
    try{
      const saved=await api.analysts.create({...form,role:"analyst",photo:photoUrl});
      setAnalysts(prev=>prev.map(a=>a.id===optimistic.id?saved:a));
    }catch(e){console.warn("API save failed:",e.message);}
  };
  return (
    <div style={{maxWidth:640}}>
      <SH title="Add New Analyst"/>
      {error&&<div style={{background:"#fef2f2",color:C.red,padding:"9px 13px",borderRadius:7,fontSize:".83rem",marginBottom:14}}>{error}</div>}
      <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"26px"}}>
        {/* Photo picker */}
        <div style={{marginBottom:18}}>
          <label style={{display:"block",fontSize:".75rem",fontWeight:600,color:C.navy,marginBottom:8,textTransform:"uppercase",letterSpacing:.4}}>Profile Photo</label>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:72,height:72,borderRadius:"50%",overflow:"hidden",background:C.g100,border:`2px dashed ${C.g300}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {preview
                ?<img src={preview} alt="preview" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top"}}/>
                :<span style={{fontSize:"1.6rem",color:C.g300}}>👤</span>}
            </div>
            <div>
              <label style={{display:"inline-block",padding:"8px 16px",background:C.g100,border:`1px solid ${C.g200}`,borderRadius:7,fontSize:".8rem",fontWeight:600,color:C.navy,cursor:"pointer",fontFamily:sans}}>
                {photoFile?"Change Photo":"Upload Photo"}
                <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>setPhotoFile(e.target.files[0]||null)}/>
              </label>
              {photoFile&&<button onClick={()=>setPhotoFile(null)} style={{marginLeft:8,background:"none",border:"none",color:C.g500,fontSize:".78rem",cursor:"pointer",fontFamily:sans}}>Remove</button>}
              <p style={{fontSize:".72rem",color:C.g500,marginTop:5}}>JPG or PNG · will be shown on profile cards. Leave empty to use initials.</p>
            </div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
          <Inp label="Full Name" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value,ini:autoInitials(e.target.value)}))} placeholder="e.g. Adaeze Nwosu" required/>
          <Inp label="Initials" value={form.ini} onChange={f("ini")} placeholder="AN" required/>
        </div>
        <Inp label="Job Title" value={form.title} onChange={f("title")} placeholder="e.g. Research Analyst" required/>
        <Inp label="Coverage Areas" value={form.cov} onChange={f("cov")} placeholder="e.g. Consumer Goods, Retail"/>
        <Inp label="Email Address" value={form.email} onChange={f("email")} type="email" placeholder="e.g. anwosu@chapelhilldenham.com"/>
        <Inp label="Biography" value={form.bio} onChange={f("bio")} as="textarea" rows={4} placeholder="Short bio shown on the public analyst profile…"/>
        <div style={{display:"flex",gap:10,marginTop:6}}>
          <button onClick={submit} style={{padding:"11px 24px",background:C.violet,color:"#fff",border:"none",borderRadius:7,fontSize:".86rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>Add Analyst</button>
          <button onClick={()=>{setForm(blank);setPhotoFile(null);}} style={{padding:"11px 18px",background:C.g100,color:C.g700,border:"none",borderRadius:7,fontSize:".86rem",cursor:"pointer",fontFamily:sans}}>Clear</button>
        </div>
      </div>
    </div>
  );
}

function AddInternTab({analysts,setAnalysts,showToast,onDone}) {
  const supervisorOpts=analysts.filter(a=>a.role==="analyst").map(a=>({v:String(a.id),l:`${a.name} — ${a.title}`}));
  const blank={name:"",ini:"",cov:"",email:"",bio:"",supervisorId:""};
  const [form,setForm]=useState(blank);
  const [photoFile,setPhotoFile]=useState(null);
  const [error,setError]=useState("");
  const preview=usePhotoPreview(photoFile);
  const f=k=>e=>setForm({...form,[k]:e.target.value});
  const submit=async()=>{
    if(!form.name.trim()||!form.ini.trim()){setError("Name and initials are required.");return;}
    if(!form.supervisorId){setError("Please assign a supervisor.");return;}
    let photoUrl=preview||null;
    if(photoFile){
      try{ const r=await api.upload.photo(photoFile); photoUrl=r.url; }
      catch{ /* keep preview */ }
    }
    const optimistic={...form,id:nextId(analysts),role:"intern",title:"Research Intern",supervisorId:parseInt(form.supervisorId),photo:photoUrl};
    setAnalysts(prev=>[...prev,optimistic]);
    /* Auto-create local user account with default intern password */
    if(form.email.trim()){
      const existing=lsGet(LS.demoUsers)||[];
      if(!existing.find(x=>x.email===form.email.trim())){
        lsSet(LS.demoUsers,[...existing,{id:Date.now(),name:form.name,email:form.email.trim(),tier:"intern",password:"re5earch15life",analystId:optimistic.id,mustChange:true}]);
      }
    }
    showToast(`${form.name} added as Research Intern.`);setForm(blank);setPhotoFile(null);setError("");onDone();
    try{
      const saved=await api.analysts.create({...form,role:"intern",title:"Research Intern",supervisorId:parseInt(form.supervisorId),photo:photoUrl});
      setAnalysts(prev=>prev.map(a=>a.id===optimistic.id?saved:a));
    }catch(e){console.warn("API save failed:",e.message);}
  };
  return (
    <div style={{maxWidth:640}}>
      <SH title="Add Research Intern"/>
      <div style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:8,padding:"12px 16px",marginBottom:18,fontSize:".82rem",color:"#0369a1"}}>
        Interns are not shown on the public Analysts page. Their submitted reports require supervisor approval before publishing.
      </div>
      {error&&<div style={{background:"#fef2f2",color:C.red,padding:"9px 13px",borderRadius:7,fontSize:".83rem",marginBottom:14}}>{error}</div>}
      <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"26px"}}>
        {/* Photo */}
        <div style={{marginBottom:18}}>
          <label style={{display:"block",fontSize:".75rem",fontWeight:600,color:C.navy,marginBottom:8,textTransform:"uppercase",letterSpacing:.4}}>Profile Photo</label>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:64,height:64,borderRadius:"50%",overflow:"hidden",background:C.g100,border:`2px dashed ${C.g300}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {preview?<img src={preview} alt="preview" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top"}}/>:<span style={{fontSize:"1.4rem",color:C.g300}}>👤</span>}
            </div>
            <label style={{display:"inline-block",padding:"7px 14px",background:C.g100,border:`1px solid ${C.g200}`,borderRadius:7,fontSize:".78rem",fontWeight:600,color:C.navy,cursor:"pointer",fontFamily:sans}}>
              {photoFile?"Change Photo":"Upload Photo"}
              <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>setPhotoFile(e.target.files[0]||null)}/>
            </label>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
          <Inp label="Full Name" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value,ini:autoInitials(e.target.value)}))} placeholder="e.g. Chisom Eze" required/>
          <Inp label="Initials" value={form.ini} onChange={f("ini")} placeholder="CE" required/>
        </div>
        <Inp label="Supervisor" value={form.supervisorId} onChange={f("supervisorId")} as="select"
          options={[{v:"",l:"— Select supervisor —"},...supervisorOpts]} required/>
        <Inp label="Coverage / Focus Area" value={form.cov} onChange={f("cov")} placeholder="e.g. Banking, Financial Services"/>
        <Inp label="Email Address" value={form.email} onChange={f("email")} type="email" placeholder="e.g. ceze@chapelhilldenham.com"/>
        <Inp label="Short Bio (optional)" value={form.bio} onChange={f("bio")} as="textarea" rows={3} placeholder="Brief description of role and focus…"/>
        <div style={{display:"flex",gap:10,marginTop:6}}>
          <button onClick={submit} style={{padding:"11px 24px",background:"#0891b2",color:"#fff",border:"none",borderRadius:7,fontSize:".86rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>Add Intern</button>
          <button onClick={()=>{setForm(blank);setPhotoFile(null);}} style={{padding:"11px 18px",background:C.g100,color:C.g700,border:"none",borderRadius:7,fontSize:".86rem",cursor:"pointer",fontFamily:sans}}>Clear</button>
        </div>
      </div>
    </div>
  );
}

/* ═══ FUNDS ADMIN TAB ═══ */
function FundsAdminTab({funds,setFunds,showToast}) {
  const [editing,setEditing]=useState(null); /* fund id being edited */
  const [form,setForm]=useState({});
  const [saving,setSaving]=useState(false);
  const openEdit=f=>{setEditing(f.id);setForm({name:f.name,abbr:f.abbr,aum:f.aum,nav:f.nav,inception:f.inception,description:f.description,dataAsAt:f.dataAsAt||""});};
  const save=async()=>{
    setSaving(true);
    try{
      const updated=await api.funds.update(editing,form);
      setFunds(prev=>prev.map(f=>f.id===editing?updated:f));
      showToast("Fund updated.");
      setEditing(null);
    }catch{
      /* Optimistic update if API not yet live */
      setFunds(prev=>prev.map(f=>f.id===editing?{...f,...form}:f));
      showToast("Saved locally — sync to server when live.");
      setEditing(null);
    }finally{setSaving(false);}
  };
  const ff=(k)=>e=>setForm(p=>({...p,[k]:e.target.value}));
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div><h2 style={{fontFamily:serif,fontSize:"1.4rem",color:C.navy,fontWeight:600,marginBottom:4}}>Fund Data</h2><p style={{fontSize:".8rem",color:C.g500}}>Update live AUM, NAV, and data date for each fund.</p></div>
      </div>
      <div style={{display:"grid",gap:18}}>
        {funds.map(f=>(
          <div key={f.id} style={{background:C.white,borderRadius:12,border:`1px solid ${editing===f.id?C.gold:C.g200}`,padding:"22px 24px",transition:"border-color .2s"}}>
            {editing===f.id?(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <Inp label="Fund Name" value={form.name} onChange={ff("name")}/>
                  <Inp label="Abbreviation" value={form.abbr} onChange={ff("abbr")}/>
                  <Inp label="AUM (e.g. ₦47.3B)" value={form.aum} onChange={ff("aum")}/>
                  <Inp label="NAV per unit (e.g. ₦100.00)" value={form.nav} onChange={ff("nav")}/>
                  <Inp label="Inception (e.g. Mar 2012)" value={form.inception} onChange={ff("inception")}/>
                  <Inp label="Data as at (YYYY-MM-DD)" value={form.dataAsAt} onChange={ff("dataAsAt")} type="date"/>
                </div>
                <Inp label="Description" value={form.description} onChange={ff("description")} as="textarea" rows={3}/>
                <p style={{fontSize:".74rem",color:C.g500,marginBottom:12}}>To update performance figures (perf_json / spark_json), use the FUNDS-LIVE-DATA-GUIDE.md or the cron sync script.</p>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={save} disabled={saving} style={{padding:"9px 20px",background:C.gold,color:"#fff",border:"none",borderRadius:7,fontSize:".84rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>{saving?"Saving…":"Save Changes"}</button>
                  <button onClick={()=>setEditing(null)} style={{padding:"9px 16px",background:C.g100,color:C.g700,border:"none",borderRadius:7,fontSize:".84rem",cursor:"pointer",fontFamily:sans}}>Cancel</button>
                </div>
              </div>
            ):(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",gap:24,alignItems:"center"}}>
                  <div style={{width:42,height:42,borderRadius:10,background:f.riskBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".64rem",fontWeight:700,color:f.riskColor,textTransform:"uppercase",letterSpacing:.5,flexShrink:0}}>{f.abbr}</div>
                  <div>
                    <div style={{fontWeight:600,fontSize:".9rem",color:C.navy,marginBottom:2}}>{f.name}</div>
                    <div style={{fontSize:".74rem",color:C.g500,display:"flex",gap:16}}>
                      <span>AUM: <strong style={{color:C.navy}}>{f.aum||"—"}</strong></span>
                      <span>NAV: <strong style={{color:C.navy}}>{f.nav||"—"}</strong></span>
                      <span>As at: <strong style={{color:C.navy}}>{f.dataAsAt?fd(f.dataAsAt):"—"}</strong></span>
                    </div>
                  </div>
                </div>
                <button onClick={()=>openEdit(f)} style={{padding:"7px 16px",background:C.navy,color:"#fff",border:"none",borderRadius:7,fontSize:".78rem",fontWeight:500,cursor:"pointer",fontFamily:sans}}>Edit</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ FILE MANAGER TAB ═══ */
function FileManagerTab({showToast}) {
  const [files,setFiles]=useState([]);
  const [loading,setLoading]=useState(true);
  const [uploading,setUploading]=useState(false);
  const [folder,setFolder]=useState("reports");
  const FOLDERS=["reports","photos","prices","misc"];
  useEffect(()=>{
    setLoading(true);
    fetch(`/api/files.php?folder=${folder}`,{credentials:"include"})
      .then(r=>r.json()).then(j=>{ if(j?.success) setFiles(j.data||[]); }).catch(()=>setFiles([]))
      .finally(()=>setLoading(false));
  },[folder]);
  const upload=async(e)=>{
    const file=e.target.files?.[0]; if(!file) return;
    setUploading(true);
    const fd=new FormData(); fd.append("file",file); fd.append("folder",folder);
    try{
      const res=await fetch(`/api/files.php`,{method:"POST",credentials:"include",body:fd});
      const j=await res.json();
      if(j?.success){ setFiles(p=>[j.data,...p]); showToast("File uploaded."); }
      else showToast(j?.error||"Upload failed.");
    }catch{showToast("Upload failed.");}
    finally{setUploading(false); e.target.value="";}
  };
  const del=async(f)=>{
    if(!window.confirm(`Delete ${f.name}?`)) return;
    try{
      await fetch(`/api/files.php`,{method:"DELETE",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:f.path})});
      setFiles(p=>p.filter(x=>x.path!==f.path)); showToast("File deleted.");
    }catch{showToast("Delete failed.");}
  };
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div><h2 style={{fontFamily:serif,fontSize:"1.4rem",color:C.navy,fontWeight:600,marginBottom:4}}>File Manager</h2><p style={{fontSize:".8rem",color:C.g500}}>Upload and manage files on the server — no cPanel needed.</p></div>
        <label style={{display:"flex",alignItems:"center",gap:8,padding:"9px 18px",background:C.gold,color:"#fff",borderRadius:7,fontSize:".84rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>
          {uploading?"Uploading…":"+ Upload File"}
          <input type="file" onChange={upload} style={{display:"none"}} disabled={uploading}/>
        </label>
      </div>
      {/* Folder tabs */}
      <div style={{display:"flex",gap:4,marginBottom:20,background:C.g100,borderRadius:8,padding:4,width:"fit-content"}}>
        {FOLDERS.map(fl=>(
          <button key={fl} onClick={()=>setFolder(fl)} style={{padding:"6px 16px",background:folder===fl?C.white:"transparent",border:`1px solid ${folder===fl?C.g200:"transparent"}`,borderRadius:6,fontSize:".8rem",color:folder===fl?C.navy:C.g500,cursor:"pointer",fontFamily:sans,fontWeight:folder===fl?600:400,textTransform:"capitalize"}}>{fl}</button>
        ))}
      </div>
      <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,overflow:"hidden"}}>
        {loading?<div style={{padding:40,textAlign:"center",color:C.g500}}>Loading…</div>
        :files.length===0?<div style={{padding:40,textAlign:"center",color:C.g500}}>No files in {folder}/. Upload one above.</div>
        :files.map((f,i)=>(
          <div key={f.path} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px",borderBottom:i<files.length-1?`1px solid ${C.g100}`:"none"}}>
            <div style={{width:36,height:36,borderRadius:8,background:C.offWhite,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".64rem",fontWeight:700,color:C.g500,flexShrink:0}}>{f.ext?.toUpperCase()||"FILE"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:".86rem",fontWeight:500,color:C.navy,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div>
              <div style={{fontSize:".72rem",color:C.g500}}>{f.size} · {f.modified}</div>
            </div>
            <a href={f.url} target="_blank" rel="noopener noreferrer" style={{padding:"6px 14px",background:C.navy,color:"#fff",borderRadius:6,fontSize:".74rem",fontWeight:500,textDecoration:"none",flexShrink:0}}>Open</a>
            <button onClick={()=>del(f)} style={{padding:"6px 12px",background:C.g100,color:C.red,border:"none",borderRadius:6,fontSize:".74rem",cursor:"pointer",fontFamily:sans,flexShrink:0}}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ USERS TAB ═══ */
const DEFAULT_PW="re5earch15life";
function UsersTab({showToast}) {
  const [demoUsers,setDemoUsersState]=useState(()=>lsGet(LS.demoUsers)||[]);

  const resetPw=(id)=>{
    const updated=demoUsers.map(u=>u.id===id?{...u,password:DEFAULT_PW}:u);
    lsSet(LS.demoUsers,updated);
    setDemoUsersState(updated);
    showToast(`Password reset to default.`);
  };
  const removeUser=(id)=>{
    const updated=demoUsers.filter(u=>u.id!==id);
    lsSet(LS.demoUsers,updated);setDemoUsersState(updated);showToast("User removed.");
  };

  const tc={admin:"#7c3aed",analyst:C.green,intern:"#0891b2",premium:"#d97706",registered:"#2563eb"};
  const tb={admin:C.violetSoft,analyst:"#dcfce7",intern:"#cffafe",premium:"#fef3c7",registered:"#dbeafe"};
  const tierBadge=(t)=><span style={{background:tb[t]||C.g100,color:tc[t]||C.g700,fontSize:".6rem",fontWeight:700,padding:"2px 8px",borderRadius:3,textTransform:"uppercase",letterSpacing:.5}}>{t}</span>;

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h2 style={{fontFamily:serif,fontSize:"1.4rem",color:C.navy,fontWeight:600,marginBottom:4}}>User Accounts</h2>
        <p style={{fontSize:".8rem",color:C.g500}}>View and manage portal user accounts. Reset passwords for locally-registered users.</p>
      </div>

      {/* Built-in demo accounts — read-only */}
      <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,overflow:"hidden",marginBottom:24}}>
        <div style={{background:C.g100,padding:"10px 16px",borderBottom:`1px solid ${C.g200}`,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:".72rem",fontWeight:700,color:C.g500,textTransform:"uppercase",letterSpacing:.5}}>Built-in Accounts</span>
          <span style={{fontSize:".68rem",color:C.g500,fontStyle:"italic"}}>— hardcoded demo accounts</span>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:`1px solid ${C.g200}`}}>
            {["Name","Email","Tier","Password"].map((h,i)=><th key={i} style={{padding:"9px 14px",textAlign:"left",fontSize:".68rem",fontWeight:700,color:C.g500,textTransform:"uppercase",letterSpacing:.5,background:C.g100}}>{h}</th>)}
          </tr></thead>
          <tbody>{DEMO_ACCOUNTS.map((d,i)=>(
            <tr key={d.email} style={{borderBottom:`1px solid ${C.g100}`,background:i%2===0?C.white:C.offWhite}}>
              <td style={{padding:"11px 14px",fontSize:".83rem",fontWeight:600,color:C.navy}}>{d.name}</td>
              <td style={{padding:"11px 14px",fontSize:".79rem",color:C.g500}}>{d.email}</td>
              <td style={{padding:"11px 14px"}}>{tierBadge(d.tier)}</td>
              <td style={{padding:"11px 14px",fontFamily:"monospace",fontSize:".78rem",color:C.g500}}>{d.password}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {/* Registered users (localStorage) */}
      <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,overflow:"hidden"}}>
        <div style={{background:C.g100,padding:"10px 16px",borderBottom:`1px solid ${C.g200}`,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:".72rem",fontWeight:700,color:C.g500,textTransform:"uppercase",letterSpacing:.5}}>Registered Users</span>
          <span style={{fontSize:".68rem",color:C.g500,fontStyle:"italic"}}>— self-registered + intern accounts (local)</span>
        </div>
        {demoUsers.length===0
          ?<div style={{padding:"28px",textAlign:"center",color:C.g500,fontSize:".84rem"}}>No registered users yet. Users who register via the portal appear here.</div>
          :<table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:`1px solid ${C.g200}`}}>
              {["Name","Email","Tier","Actions"].map((h,i)=><th key={i} style={{padding:"9px 14px",textAlign:"left",fontSize:".68rem",fontWeight:700,color:C.g500,textTransform:"uppercase",letterSpacing:.5,background:C.g100}}>{h}</th>)}
            </tr></thead>
            <tbody>{demoUsers.map((u,i)=>(
              <tr key={u.id||u.email} style={{borderBottom:`1px solid ${C.g100}`,background:i%2===0?C.white:C.offWhite}}>
                <td style={{padding:"11px 14px",fontSize:".83rem",fontWeight:600,color:C.navy}}>{u.name}</td>
                <td style={{padding:"11px 14px",fontSize:".79rem",color:C.g500}}>{u.email}</td>
                <td style={{padding:"11px 14px"}}>{tierBadge(u.tier||"registered")}</td>
                <td style={{padding:"11px 14px"}}>
                  <div style={{display:"flex",gap:5}}>
                    <button onClick={()=>resetPw(u.id)} style={{padding:"5px 12px",background:"#eff6ff",color:"#2563eb",border:"1px solid #bfdbfe",borderRadius:5,fontSize:".72rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>Reset Password</button>
                    <button onClick={()=>removeUser(u.id)} style={{padding:"5px 10px",background:"#fef2f2",color:C.red,border:"1px solid #fecaca",borderRadius:5,fontSize:".72rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>}
        <div style={{padding:"10px 16px",borderTop:`1px solid ${C.g100}`,fontSize:".72rem",color:C.g500,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <span style={{color:C.gold}}>ℹ</span> Default password for newly added interns: <code style={{background:C.g100,padding:"1px 6px",borderRadius:3,fontFamily:"monospace",color:C.navy,fontSize:".74rem"}}>re5earch15life</code>
        </div>
      </div>
    </div>
  );
}

/* ═══ SETTINGS TAB (portal config) ═══ */
function SettingsTab({showToast}) {
  const [settings,setSettings]=useState({site_name:"CHD Research Portal",contact_email:"research@chapelhilldenham.com"});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  useEffect(()=>{
    fetch("/api/settings.php",{credentials:"include"})
      .then(r=>r.json()).then(j=>{ if(j?.success&&j.data) setSettings(s=>({...s,...j.data})); }).catch(()=>{})
      .finally(()=>setLoading(false));
  },[]);
  const save=async()=>{
    setSaving(true);
    try{
      await fetch("/api/settings.php",{method:"PUT",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(settings)});
      showToast("Settings saved.");
    }catch{showToast("Saved locally — will sync when backend is live.");}
    finally{setSaving(false);}
  };
  const f=(k)=>e=>setSettings(p=>({...p,[k]:e.target.value}));
  if(loading) return <div style={{padding:40,textAlign:"center",color:C.g500}}>Loading…</div>;
  return (
    <div style={{maxWidth:640}}>
      <h2 style={{fontFamily:serif,fontSize:"1.4rem",color:C.navy,fontWeight:600,marginBottom:4}}>Portal Settings</h2>
      <p style={{fontSize:".8rem",color:C.g500,marginBottom:28}}>Configure portal metadata.</p>

      <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.g200}`,padding:"24px",marginBottom:22}}>
        <h3 style={{fontSize:".88rem",fontWeight:700,color:C.navy,textTransform:"uppercase",letterSpacing:.4,marginBottom:16}}>Portal Metadata</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <Inp label="Site Name" value={settings.site_name} onChange={f("site_name")}/>
          <Inp label="Contact Email" value={settings.contact_email} onChange={f("contact_email")} type="email"/>
        </div>
      </div>

      <button onClick={save} disabled={saving} style={{padding:"11px 28px",background:C.navy,color:"#fff",border:"none",borderRadius:8,fontSize:".86rem",fontWeight:600,cursor:"pointer",fontFamily:sans}}>{saving?"Saving…":"Save Settings"}</button>
    </div>
  );
}

/* ═══ FIRST-LOGIN PASSWORD MODAL ═══ */
function FirstLoginModal({user,onDone}) {
  const [pw,setPw]=useState("");
  const [pw2,setPw2]=useState("");
  const [err,setErr]=useState("");
  const [saving,setSaving]=useState(false);
  const ok=pw.length>=8&&/[A-Z]/.test(pw)&&/[0-9]/.test(pw);
  const submit=()=>{
    if(!ok){setErr("Password must be 8+ characters with at least one uppercase letter and one number.");return;}
    if(pw!==pw2){setErr("Passwords do not match.");return;}
    if(pw==="re5earch15life"){setErr("Please choose a different password from the default.");return;}
    setSaving(true);
    onDone(pw);
  };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(6,38,45,0.72)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999}}>
      <div style={{background:C.white,borderRadius:14,padding:"36px 32px",maxWidth:420,width:"90%",boxShadow:"0 28px 56px rgba(0,0,0,0.22)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <div style={{width:44,height:44,borderRadius:"50%",background:C.goldSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",flexShrink:0}}>🔐</div>
          <div>
            <h2 style={{fontFamily:serif,fontSize:"1.25rem",color:C.navy,fontWeight:600,lineHeight:1.2}}>Set Your Password</h2>
            <p style={{fontSize:".78rem",color:C.g500,marginTop:3}}>First sign-in · Please choose a secure password to continue.</p>
          </div>
        </div>
        <div style={{height:1,background:C.g200,marginBottom:20}}/>
        <Inp label="New Password" value={pw} onChange={e=>setPw(e.target.value)} type="password" placeholder="At least 8 characters"/>
        {pw.length>0&&<div style={{display:"flex",gap:18,marginTop:-8,marginBottom:14,fontSize:".73rem"}}>
          <span style={{color:pw.length>=8?C.green:C.g300,display:"flex",alignItems:"center",gap:3}}><span>{pw.length>=8?"✓":"○"}</span> 8+ chars</span>
          <span style={{color:/[A-Z]/.test(pw)?C.green:C.g300,display:"flex",alignItems:"center",gap:3}}><span>{/[A-Z]/.test(pw)?"✓":"○"}</span> Uppercase</span>
          <span style={{color:/[0-9]/.test(pw)?C.green:C.g300,display:"flex",alignItems:"center",gap:3}}><span>{/[0-9]/.test(pw)?"✓":"○"}</span> Number</span>
        </div>}
        <Inp label="Confirm Password" value={pw2} onChange={e=>setPw2(e.target.value)} type="password" placeholder="Repeat password"/>
        {err&&<div style={{background:"#fef2f2",color:C.red,padding:"9px 13px",borderRadius:7,fontSize:".8rem",marginBottom:14,marginTop:-4}}>{err}</div>}
        <button onClick={submit} disabled={!ok||saving} style={{width:"100%",padding:13,background:ok&&!saving?C.gold:C.g200,color:C.white,border:"none",borderRadius:8,fontWeight:600,fontSize:".9rem",cursor:ok&&!saving?"pointer":"default",fontFamily:sans,marginTop:4,transition:"background .15s"}}>
          {saving?"Saving…":"Set Password & Continue →"}
        </button>
        {user?.name&&<p style={{textAlign:"center",fontSize:".73rem",color:C.g500,marginTop:12}}>Signing in as <strong style={{color:C.navy}}>{user.name}</strong></p>}
      </div>
    </div>
  );
}

/* ═══ LOCAL STORAGE HELPERS ═══ */
const LS={
  user:"chd_session",reports:"chd_reports",analysts:"chd_analysts",
  funds:"chd_funds",bioEdits:"chd_bioedits",demoUsers:"chd_demo_users",prices:"chd_prices",
  mailingList:"chd_mailing_list",library:"chd_library",categoryRules:"chd_category_rules",
  accessRequests:"chd_access_requests",bannerMedia:"chd_banner_media",recentViews:"chd_recent_views",
};
function lsGet(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch{return null;}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}
function lsDel(k){try{localStorage.removeItem(k);}catch{}}

/* ═══ APP ═══ */
export default function App() {
  const [page,setPage]         = useState(()=>lsGet("chd_page")||"home");
  const [pageData,setPageData] = useState(()=>lsGet("chd_pageData")||{});
  const [navStack,setNavStack] = useState([{page:lsGet("chd_page")||"home",data:lsGet("chd_pageData")||{}}]);
  /* Initialize state from localStorage so data survives refresh */
  const [user,setUser]         = useState(()=>lsGet(LS.user));
  const [toast,setToast]       = useState("");
  const [reports,setReports]   = useState(()=>lsGet(LS.reports)||INIT_REPORTS);
  const [analysts,setAnalysts] = useState(()=>lsGet(LS.analysts)||INIT_ANALYSTS);
  const [funds,setFunds]       = useState(()=>lsGet(LS.funds)||FUNDS);
  const [demoFill,setDemoFill] = useState(null);
  const [bioEdits,setBioEdits] = useState(()=>lsGet(LS.bioEdits)||[]);
  const [mailingList,setMailingList] = useState(()=>lsGet(LS.mailingList)||[]);
  const [library,setLibrary] = useState(()=>lsGet(LS.library)||INIT_LIBRARY);
  const [categoryRules,setCategoryRules] = useState(()=>lsGet(LS.categoryRules)||CATEGORY_ACCESS_DEFAULTS);
  const [accessRequests,setAccessRequests] = useState(()=>lsGet(LS.accessRequests)||[]);
  const [bannerMedia,setBannerMedia] = useState(()=>lsGet(LS.bannerMedia)||DEFAULT_BANNER_MEDIA);
  const [recentViews,setRecentViews] = useState(()=>lsGet(LS.recentViews)||[]);

  /* ── Persist state to localStorage whenever it changes ── */
  useEffect(()=>{ if(user) lsSet(LS.user,user); else lsDel(LS.user); },[user]);
  useEffect(()=>{ lsSet(LS.reports,reports); },[reports]);
  useEffect(()=>{ lsSet(LS.analysts,analysts); },[analysts]);
  useEffect(()=>{ lsSet(LS.funds,funds); },[funds]);
  useEffect(()=>{ lsSet(LS.bioEdits,bioEdits); },[bioEdits]);
  useEffect(()=>{ lsSet(LS.mailingList,mailingList); },[mailingList]);
  useEffect(()=>{ lsSet(LS.library,library); },[library]);
  useEffect(()=>{ lsSet(LS.categoryRules,categoryRules); },[categoryRules]);
  useEffect(()=>{ lsSet(LS.accessRequests,accessRequests); },[accessRequests]);
  useEffect(()=>{ lsSet(LS.bannerMedia,bannerMedia); },[bannerMedia]);
  useEffect(()=>{ lsSet(LS.recentViews,recentViews); },[recentViews]);
  useEffect(()=>{ lsSet("chd_page",page); },[page]);
  useEffect(()=>{ lsSet("chd_pageData",pageData); },[pageData]);

  /* ── Try live API on mount; falls back to localStorage state already loaded ── */
  useEffect(()=>{
    /* Validate / refresh session from API (won't clear localStorage-restored user if API offline) */
    api.auth.me()
      .then(u=>{ if(u?.id) setUser(u); })
      .catch(()=>{}); /* stay with localStorage user in offline/demo mode */

    api.reports.list()
      .then(rows=>{ if(rows?.length) setReports(rows); })
      .catch(()=>{});

    api.analysts.list()
      .then(rows=>{ if(rows?.length) setAnalysts(rows); })
      .catch(()=>{});

    api.funds.list()
      .then(rows=>{ if(rows?.length) setFunds(rows); })
      .catch(()=>{});
  },[]);

  const nav = useCallback((p,data={})=>{
    setPage(p); setPageData(data);
    setNavStack(s=>[...s,{page:p,data}]);
    window.scrollTo({top:0,behavior:"smooth"});
  },[]);

  const trackRecentView = useCallback((item)=>{
    if(!item?.type || item.id===undefined || item.id===null) return;
    setRecentViews(prev=>{
      const next=[{...item,viewedAt:new Date().toISOString()},...prev.filter(v=>!(v.type===item.type&&String(v.id)===String(item.id)))];
      return next.slice(0,12);
    });
  },[]);

  const goBack = useCallback(()=>{
    setNavStack(s=>{
      if(s.length<=1) return s;
      const next=s.slice(0,-1);
      const prev=next[next.length-1];
      setPage(prev.page); setPageData(prev.data);
      window.scrollTo({top:0,behavior:"smooth"});
      return next;
    });
  },[]);

  const canGoBack = navStack.length>1;

  const login  = u=>{
    setUser(u);
    if(!u.mustChange) setToast(`Welcome${u.name?", "+u.name.split(" ")[0]:""}!`);
  };
  const completePwChange = newPw => {
    const saved=lsGet(LS.demoUsers)||[];
    const idx=saved.findIndex(u=>u.email===user?.email);
    if(idx>=0){saved[idx]={...saved[idx],password:newPw,mustChange:false};lsSet(LS.demoUsers,saved);}
    const updated={...user,mustChange:false};
    setUser(updated);
    setToast(`Welcome, ${user?.name?.split(" ")[0]||""}! Password updated.`);
  };
  const logout = ()=>{
    api.auth.logout().catch(()=>{});
    setUser(null);setToast("Signed out.");nav("home");
  };

  useEffect(()=>{
    if(!toast) return;
    const t=setTimeout(()=>setToast(""),3200);
    return ()=>clearTimeout(t);
  },[toast]);

  return (
    <DataCtx.Provider value={{reports,analysts,funds,setReports,setAnalysts,setFunds,demoFill,setDemoFill,bioEdits,setBioEdits,mailingList,setMailingList,library,setLibrary,categoryRules,setCategoryRules,accessRequests,setAccessRequests,bannerMedia,setBannerMedia,recentViews,trackRecentView}}>
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",fontFamily:sans,background:"#fff"}}>
        <style>{`
          *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
          html{scroll-behavior:smooth}
          body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overscroll-behavior-y:none;color:${C.navy}}
          ::selection{background:rgba(185,114,49,0.18);color:${C.navy}}
          input:focus,textarea:focus,select:focus{outline:2px solid ${C.gold};outline-offset:-1px}
          button{font-family:Calibri,Arial,sans-serif}
          a{color:inherit}
          img{max-width:100%;display:block}
          input,textarea,select{color:${C.navy}}
          @keyframes heroFade{from{opacity:.2;transform:scale(1.015)}to{opacity:1;transform:scale(1)}}

          /* ═══════════════════════════════════════
             MOBILE  ≤ 640 px
          ═══════════════════════════════════════ */
          @media(max-width:640px){
            /* Clip horizontal overflow without breaking position:sticky */
            body{overflow-x:clip}
            #root,#root>div{overflow-x:clip}

            /* ── Containers: full-width, compact padding ── */
            *[style*="max-width: 1260px"]{max-width:100% !important}
            *[style*="padding: 0 40px"]{padding-left:14px !important;padding-right:14px !important}
            *[style*="padding: 0 36px"]{padding-left:10px !important;padding-right:10px !important}

            /* ── Section vertical padding: reduce on mobile ── */
            *[style*="padding: 60px 0"]{padding-top:36px !important;padding-bottom:36px !important}
            *[style*="padding: 52px 0"]{padding-top:28px !important;padding-bottom:28px !important}
            *[style*="padding: 48px 0"]{padding-top:24px !important;padding-bottom:24px !important}

            /* ── Hero heading ── */
            h1[style*="2.9rem"]{font-size:1.85rem !important;line-height:1.15 !important}
            *[style*="max-width: 640px"]{max-width:100% !important}
            *[style*="max-width: 480px"]{max-width:100% !important}

            /* ── All repeat() grids → single column ── */
            *[style*="repeat(3,1fr)"]{grid-template-columns:1fr !important}
            *[style*="repeat(3, 1fr)"]{grid-template-columns:1fr !important}
            *[style*="repeat(2,1fr)"]{grid-template-columns:1fr !important}
            *[style*="repeat(2, 1fr)"]{grid-template-columns:1fr !important}
            /* Funds outer 2-col layout (gap:48 identifies it vs inner fund card grid) */
            *[style*="grid-template-columns: 1fr 1fr"][style*="gap: 48px"]{grid-template-columns:1fr !important;gap:20px !important}
            /* Large gaps: tighten */
            *[style*="gap: 48px"]{gap:20px !important}

            /* ── Search inputs: flexible width ── */
            input[style*="width: 230px"]{width:100px !important;min-width:0}
            input[style*="width: 240px"]{flex:1 !important;width:auto !important;min-width:0}

            /* ── Reports filter row: stack pills above search/sort ── */
            *[style*="margin-bottom: 18px"][style*="justify-content: space-between"]{flex-direction:column !important;align-items:stretch !important}
            *[style*="margin-bottom: 18px"][style*="justify-content: space-between"]>div:last-child{width:100% !important;flex-wrap:wrap !important}
            *[style*="margin-bottom: 18px"][style*="justify-content: space-between"] input{flex:1 !important;width:auto !important;min-width:0 !important}

            /* ── Header: sticky, compact ── */
            header{position:sticky !important;top:0 !important;z-index:100 !important}
            header>div{padding:0 10px !important;height:56px !important;display:flex !important;align-items:center !important;justify-content:space-between !important;gap:8px !important}
            /* Logo area */
            header>div>div:first-child{gap:0 !important;flex-shrink:0 !important}
            header>div>div:first-child>button:not(:has(img)){display:none !important}
            header>div>div:first-child img{height:24px !important;width:auto !important}
            header>div>div:first-child button>div{display:none !important}
            header>div>div:nth-child(2){display:none !important}
            /* Nav + user */
            header>div>div:last-child{display:flex !important;align-items:center !important;gap:4px}
            #chd-hamburger{display:flex !important;align-items:center}
            header nav{display:none !important}
            header>div>div:last-child>div{display:none !important}
            header>div>div:last-child span{display:none !important}
            header>div>div:last-child>div button{padding:4px 8px !important;font-size:.6rem !important;white-space:nowrap}
            header>div>div:last-child>button{padding:6px 10px !important;font-size:.66rem !important;white-space:nowrap}

            /* ── Contact page: stack cleanly ── */
            .contact-hero{padding-top:36px !important;padding-bottom:28px !important}
            .contact-hero h1{font-size:1.75rem !important;line-height:1.12 !important}
            .contact-grid{grid-template-columns:1fr !important}
            .contact-left{padding:22px 18px !important;gap:14px !important}
            .contact-left > div:first-of-type{gap:10px !important}
            .contact-left > div:nth-of-type(2){grid-template-columns:1fr !important}
            .contact-routing{flex-direction:column !important;align-items:flex-start !important}
            .contact-routing > div:last-child{text-align:left !important}
            .contact-map{min-height:0 !important}
            .contact-map iframe{min-height:260px !important}
            .contact-map > div:first-child{padding:18px 18px 14px !important}
            .contact-detail-grid{grid-template-columns:1fr !important}
            .contact-map-head h2{font-size:1.12rem !important}
            .contact-map-head p{font-size:.8rem !important}

            /* ── Home hero / library: collapse cleanly ── */
            .home-hero-grid{grid-template-columns:1fr !important;gap:18px !important}
            .home-hero-grid > div:first-child{padding-top:0 !important}
            .home-hero-grid h1{font-size:2rem !important;line-height:1.08 !important;max-width:100% !important}
            .home-hero-grid p{max-width:100% !important}
            .home-hero-grid button{width:fit-content !important}
            .home-hero-grid > div:last-child{min-height:260px !important}
            .library-stats{grid-template-columns:repeat(2, minmax(0, 1fr)) !important;gap:12px !important}
            .library-main-grid{grid-template-columns:1fr !important;gap:22px !important}
            .library-recent-grid{grid-template-columns:1fr !important;gap:14px !important}
            .reader-activity-grid{grid-template-columns:1fr !important;gap:16px !important}
            .admin-cms-shell{grid-template-columns:1fr !important;padding-left:14px !important;padding-right:14px !important}
            .admin-cms-shell aside{position:static !important}
            .library-actions > div{margin-bottom:18px !important}
            .library-actions button{width:100% !important}
            .library-actions p{max-width:100% !important}
            .library-actions .contact-map-head{padding-left:0 !important;padding-right:0 !important}

            /* Reports and analyst lists stack cleanly */
            .contact-grid .contact-left > div{width:100% !important}
            .contact-grid a{word-break:break-word}
            .contact-map iframe{width:100% !important}
            .report-grid-mobile{grid-template-columns:1fr !important}
            .analyst-grid-mobile{grid-template-columns:1fr !important}

            /* Footer */
            footer > div > div[style*="repeat(auto-fit, minmax(220px, 1fr))"]{grid-template-columns:1fr !important}
          }
        `}</style>
        <Header page={page} nav={nav} goBack={goBack} canGoBack={canGoBack} user={user} onLogout={logout}/>
        <div style={{flex:1}}>
          {page==="home"       &&<Home nav={nav} user={user}/>}
          {page==="reports"    &&<ReportsPage nav={nav} user={user} initCat={pageData.cat}/>}
          {page==="library"    &&user?.tier==="premium"&&<LibraryPage nav={nav} user={user}/>}
          {page==="library"    &&user?.tier!=="premium"&&<div style={{padding:80,textAlign:"center",color:C.g500}}>My Library is available to premium subscribers.</div>}
          {page==="report"     &&<ReportSingle id={pageData.id} nav={nav} user={user}/>}
          {page==="analysts"   &&<AnalystsPage nav={nav}/>}
          {page==="analyst"    &&<AnalystProfilePage id={pageData.id} nav={nav} user={user}/>}
          {page==="contact"    &&<ContactPage nav={nav}/>}
          {page==="pricelists" &&<PriceListsPage user={user} nav={nav}/>}
          {page==="docbank"    &&["director","analyst","intern"].includes(user?.tier)&&<DocumentBankPage nav={nav} user={user}/>}
          {page==="docbank"    &&!["director","analyst","intern"].includes(user?.tier)&&<div style={{padding:80,textAlign:"center",color:C.g500}}>Access restricted to CHD research staff.</div>}
          {/* PAYMENT MODULE DISABLED: subscribe page removed */}
          {page==="subscribe"  &&<div style={{padding:80,textAlign:"center",color:C.g500}}>Subscriptions are not available in this version.</div>}
          {page==="myportal"   &&(user?.tier==="director"||user?.tier==="analyst")&&<AnalystPortalPage user={user} nav={nav}/>}
          {page==="myportal"   &&user?.tier==="intern" &&<InternPortalPage  user={user} nav={nav}/>}
          {page==="manage"     &&user?.tier==="admin"  &&<ManagePage nav={nav}/>}
          {page==="manage"     &&user?.tier!=="admin"  &&<div style={{padding:80,textAlign:"center",color:C.g500}}>Access denied.</div>}
          {page==="funds"       &&<FundsPage nav={nav}/>}
          {(page==="login"||page==="register")&&<AuthPage mode={page} nav={nav} onLogin={login}/>}
          {page==="forgot"&&<ForgotPasswordPage nav={nav}/>}
        </div>
        <Footer nav={nav}/>
        <DemoWidget page={page} nav={nav}/>
        {user?.mustChange&&<FirstLoginModal user={user} onDone={completePwChange}/>}
        {toast&&(
          <div style={{position:"fixed",left:24,bottom:24,background:C.navy,color:"#fff",padding:"12px 18px",borderRadius:10,boxShadow:"0 16px 40px rgba(17,37,48,0.22)",fontSize:".83rem",zIndex:200,display:"flex",alignItems:"center",gap:8}}>
            <span style={{color:C.gold}}>✓</span>{toast}
          </div>
        )}
      </div>
    </DataCtx.Provider>
  );
}
