"use client";
import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useDisconnect, usePublicClient, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { isAddress, parseAbiItem } from 'viem';

// =========================================================
// ⚠️ 1. PASTE YOUR V4 CONTRACT ADDRESS HERE
// =========================================================
const CONTRACT_ADDRESS = '0x9f10723aEEcd54c74624Ac2347354324eeBDDD49'; 

// =========================================================
// ☢️ 2. THE NUCLEAR ABI
// =========================================================
const CONTRACT_ABI = [
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "company", "type": "address" }, { "indexed": false, "internalType": "string", "name": "name", "type": "string" }], "name": "CompanyRegistered", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "expiry", "type": "uint256" }], "name": "ConsentGiven", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" }], "name": "ConsentRevoked", "type": "event" },
  { "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }, { "internalType": "address", "name": "_recipient", "type": "address" }], "name": "checkConsent", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "companyRegistry", "outputs": [{ "internalType": "string", "name": "name", "type": "string" }, { "internalType": "string", "name": "privacyUrl", "type": "string" }, { "internalType": "bool", "name": "isRegistered", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_company", "type": "address" }], "name": "getCompanyDetails", "outputs": [{ "internalType": "string", "name": "", "type": "string" }, { "internalType": "string", "name": "", "type": "string" }, { "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }, { "internalType": "address", "name": "_recipient", "type": "address" }], "name": "getConsentExpiry", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_recipient", "type": "address" }, { "internalType": "uint256", "name": "_durationSeconds", "type": "uint256" }], "name": "giveConsent", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "string", "name": "_name", "type": "string" }, { "internalType": "string", "name": "_url", "type": "string" }], "name": "registerCompany", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "_recipient", "type": "address" }], "name": "revokeConsent", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
];

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect(); 
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient(); 
  
  const [mode, setMode] = useState<'USER' | 'COMPANY'>('USER'); 
  const [isMounted, setIsMounted] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Inputs
  const [recipient, setRecipient] = useState('');
  const [duration, setDuration] = useState(86400); 
  const [regName, setRegName] = useState('');
  const [regUrl, setRegUrl] = useState('');

  const isValidRecipient = isAddress(recipient);

  // --- 💾 1. LOAD SAVED ADDRESS ON STARTUP ---
  useEffect(() => {
    setIsMounted(true);
    const savedAddress = localStorage.getItem('lastRecipient');
    if (savedAddress) {
      setRecipient(savedAddress);
    }
  }, []);

  // --- 💾 2. SAVE ADDRESS WHEN USER TYPES ---
  useEffect(() => {
    if (recipient) {
      localStorage.setItem('lastRecipient', recipient);
    }
  }, [recipient]);

  // --- LOGIC: Fetch History (STRICT 5 BLOCK LIMIT) ---
  const fetchHistory = async () => {
    if (!publicClient || !isValidRecipient || !address) return;
    setIsHistoryLoading(true);
    try {
      const currentBlock = await publicClient.getBlockNumber();
      const blocksToScan = BigInt(5);
      const zero = BigInt(0);
      const fromBlock = (currentBlock - blocksToScan > zero) ? (currentBlock - blocksToScan) : zero;

      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESS,
        event: parseAbiItem('event ConsentGiven(address indexed user, address indexed recipient, uint256 expiry)'),
        args: { recipient: recipient, user: address },
        fromBlock: fromBlock
      });
      setHistoryLogs(logs);
    } catch (err) {
      console.error("History fetch error:", err);
    }
    setIsHistoryLoading(false);
  };

  // --- LOGIC: Read Contract ---
  const { data: hasConsentData, refetch: refetchConsent } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'checkConsent',
    args: (address && isValidRecipient) ? [address, recipient] : undefined,
    query: { enabled: !!address && isValidRecipient }
  });
  const isGranted = Boolean(hasConsentData);

  const { data: expiryData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getConsentExpiry',
    args: (address && isValidRecipient) ? [address, recipient] : undefined,
    query: { enabled: !!address && isValidRecipient, refetchInterval: 2000 }
  });
  const expiryDate = expiryData as any;

  const { data: companyDetailsData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getCompanyDetails',
    args: isValidRecipient ? [recipient] : undefined,
    query: { enabled: isValidRecipient }
  });
  const companyDetails = companyDetailsData as any[];

  // --- LOGIC: Write Contract ---
  const { writeContract: giveConsent, data: consentHash, isPending: isConsentPending } = useWriteContract();
  const { isSuccess: isConsentSuccess } = useWaitForTransactionReceipt({ hash: consentHash });

  const { writeContract: registerCompany, data: regHash, isPending: isRegPending } = useWriteContract();
  const { isSuccess: isRegSuccess } = useWaitForTransactionReceipt({ hash: regHash });

  // --- ⚡ AUTO-FILL LOGIC: WHEN REGISTRATION SUCCEEDS ---
  useEffect(() => {
    if (isRegSuccess && address) {
      setRecipient(address);
      localStorage.setItem('lastRecipient', address);
      setMode('USER');
    }
  }, [isRegSuccess, address]);

  // --- AUTO-REFRESH LOGIC ---
  useEffect(() => { 
    if (isConsentSuccess) {
      refetchConsent();
      fetchHistory(); 
    }
  }, [isConsentSuccess, refetchConsent]);

  if (!isMounted) return null;

  // =========================================================
  // STATE 1: NOT CONNECTED (The Landing Page - Dark Mode + Animation) 🔒
  // =========================================================
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black text-white">
        {/* Style block for animations */}
        <style jsx global>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>

        <div className="p-10 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col items-center relative overflow-hidden animate-[slideUp_0.8s_ease-out]">
          {/* Giant Background Shield */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
              <span className="text-[300px] grayscale">🛡️</span>
          </div>
          
          <div className="text-6xl mb-4 relative z-10 animate-[bounce_3s_infinite]">🛡️</div>
          
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 mb-2 relative z-10">
            Consent Chain
          </h1>
          
          <p className="text-gray-400 mb-8 font-mono text-sm relative z-10 animate-[fadeIn_1.5s_ease-out]">
            Decentralized Privacy Management
          </p>
          
          <button 
            onClick={() => connect({ connector: injected() })}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-10 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all hover:scale-105 active:scale-95 relative z-10"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // STATE 2: CONNECTED (The Dashboard - Cyberpunk Mode + Animation) 🔓
  // =========================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white font-sans flex flex-col items-center pt-10 relative pb-20 overflow-hidden">
      
      {/* Style block for animations */}
      <style jsx global>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
      `}</style>

      {/* Background Glow Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px]"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>
      </div>

      {/* --- TOP RIGHT BADGE --- */}
      {isGranted && (
        <div className="absolute top-5 right-10 bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-1 rounded-full text-xs font-bold shadow-[0_0_15px_rgba(34,197,94,0.3)] flex items-center gap-2 animate-[slideUp_0.5s_ease-out] z-50">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span>
          Analytics: ACTIVE
        </div>
      )}

      {/* --- MAIN HEADER --- */}
      <div className="text-center mb-6 z-10 animate-[slideUp_0.6s_ease-out]">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-1">Consent Chain Manager</h1>
        <p className="text-gray-500 text-sm font-mono tracking-wider">SECURE • IMMUTABLE • TRUSTLESS</p>
      </div>

      {/* --- WALLET PILL (Dark Mode) --- */}
      <div className="relative mb-8 z-50 animate-[slideUp_0.7s_ease-out]">
        <button 
          onClick={() => setShowDropdown(!showDropdown)}
          className="bg-white/5 border border-white/10 backdrop-blur-md px-5 py-2 rounded-full shadow-lg flex items-center gap-3 hover:bg-white/10 transition-all text-gray-200"
        >
           <span className="text-xl">🦊</span>
           <span className="font-bold font-mono text-blue-300">
              {address?.slice(0, 6)}...{address?.slice(-4)}
           </span>
           <span className="text-gray-500 text-xs">▼</span>
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}></div>
            <div className="absolute top-14 right-0 w-64 bg-gray-900 border border-gray-700 shadow-2xl rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                <div className="px-4 py-3 border-b border-gray-800 bg-gray-800/50 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Wallet Control
                </div>
                <button onClick={() => setShowDropdown(false)} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 font-medium border-b border-gray-800 transition-colors">
                  ✕ Cancel
                </button>
                <button onClick={() => { disconnect(); setShowDropdown(false); }} className="w-full text-left px-4 py-3 text-sm text-red-400 font-bold hover:bg-red-900/20 flex items-center gap-2 transition-colors">
                  <span>🚫</span> Disconnect
                </button>
            </div>
          </>
        )}
      </div>

      {/* --- MODE SWITCH (Neon Style) --- */}
      <div className="flex gap-6 mb-6 text-sm font-bold z-10 bg-black/20 p-1 rounded-full border border-white/5 animate-[slideUp_0.8s_ease-out]">
        <button onClick={() => setMode('USER')} className={`px-6 py-2 rounded-full transition-all ${mode === 'USER' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'text-gray-500 hover:text-gray-300'}`}>User Mode</button>
        <button onClick={() => setMode('COMPANY')} className={`px-6 py-2 rounded-full transition-all ${mode === 'COMPANY' ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]' : 'text-gray-500 hover:text-gray-300'}`}>Register Company</button>
      </div>

      {/* --- MAIN CARD (Glassmorphism) --- */}
      <div className="bg-white/5 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/10 w-full max-w-lg transition-all duration-300 relative z-10 animate-[slideUp_0.9s_ease-out]">
        
        {/* === MODE A: USER === */}
        {mode === 'USER' && (
          <div className="flex flex-col gap-6">
            
            {/* Input Section */}
            <div>
              <label className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1 block">Target Company Address</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full p-4 bg-black/40 border border-gray-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-600 z-10 relative"
                  placeholder="0x..." 
                />
                {isValidRecipient && <span className="absolute right-4 top-4 text-green-500 z-20">✓</span>}
              </div>
            </div>

            {/* V4 BILLBOARD */}
            {isValidRecipient && companyDetails && companyDetails[2] && (
               <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl flex justify-between items-center animate-fade-in relative z-10">
                  <div>
                    <h3 className="text-blue-300 font-bold text-lg flex items-center gap-2">
                       🏢 {companyDetails[0]}
                    </h3>
                    <a href={companyDetails[1]} target="_blank" className="text-xs text-blue-500 hover:text-blue-400 underline mt-1 block">View Privacy Policy ↗</a>
                  </div>
                  <div className="text-2xl drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]">✅</div>
               </div>
            )}

            {/* Current Status Shield - BIG BACKGROUND VERSION */}
            <div className={`relative overflow-hidden text-center py-6 rounded-2xl border transition-all ${isGranted ? 'bg-green-900/20 border-green-500/30' : 'bg-gray-900/50 border-white/5'}`}>
                
                {/* THE GIANT BACKGROUND SHIELD */}
                <div className={`absolute inset-0 flex items-center justify-center select-none pointer-events-none z-0 transition-all duration-500 ${isGranted ? 'opacity-20 scale-110 drop-shadow-[0_0_50px_rgba(34,197,94,0.9)] grayscale-0 animate-pulse' : 'opacity-5 scale-100 grayscale contrast-200'}`}>
                    <span className="text-[180px]">🛡️</span>
                </div>

                {/* THE FOREGROUND TEXT */}
                <div className="relative z-10">
                  <p className={`text-xs font-bold uppercase mb-2 tracking-widest ${isGranted ? 'text-green-400' : 'text-gray-500'}`}>Consent Status</p>
                  {isGranted ? (
                     <div>
                        <h2 className="text-4xl font-extrabold text-green-400 tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">GRANTED</h2>
                        {expiryDate && <p className="text-xs text-green-300/80 mt-1 font-mono bg-black/30 inline-block px-2 py-1 rounded">Expires: {new Date(Number(expiryDate) * 1000).toLocaleString()}</p>}
                     </div>
                  ) : (
                     <div>
                        <h2 className="text-4xl font-extrabold text-gray-500 tracking-tight">NOT GRANTED</h2>
                     </div>
                  )}
                </div>
            </div>

            {/* Duration Buttons */}
            <div className="grid grid-cols-3 gap-3 relative z-10">
               {[ { l: '1 Min', v: 60 }, { l: '1 Day', v: 86400 }, { l: '7 Days', v: 604800 } ].map((o) => (
                 <button key={o.l} onClick={() => setDuration(o.v)} className={`py-3 rounded-lg text-xs font-bold transition-all border ${duration === o.v ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-gray-800/50 border-transparent text-gray-400 hover:bg-gray-700'}`}>
                   {o.l}
                 </button>
               ))}
            </div>

            {/* Main Button */}
            <button
              onClick={() => giveConsent({ address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: 'giveConsent', args: [recipient, duration] })}
              disabled={!isValidRecipient || isConsentPending}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 relative z-10 ${isConsentPending ? 'bg-blue-800 cursor-wait' : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:to-blue-400 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]'}`}
            >
              {isConsentPending ? 'Processing On-Chain...' : 'Grant Consent ✍️'}
            </button>
            
            {isConsentSuccess && <p className="text-center text-green-400 font-bold text-sm mt-2 animate-bounce relative z-10">Transaction Confirmed! 🚀</p>}
            
            {/* HISTORY BOX (Terminal Style) */}
            {isValidRecipient && (
              <div className="mt-4 pt-4 border-t border-white/10 relative z-10">
                 <div className="flex justify-between items-end mb-3">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">BLOCKCHAIN LOGS (LAST 5 BLOCKS)</h3>
                    <button onClick={fetchHistory} className="text-xs text-blue-400 hover:text-white flex items-center gap-1 transition-colors">
                       🔄 Sync Node
                    </button>
                 </div>
                 
                 <div className="bg-black rounded-lg p-4 min-h-[100px] border border-gray-800 font-mono text-xs shadow-inner">
                    {isHistoryLoading ? (
                       <div className="flex flex-col items-center justify-center h-full text-green-500/50">
                          <span className="animate-pulse">Scanning Ledger...</span>
                       </div>
                    ) : historyLogs.length > 0 ? (
                       <div className="flex flex-col gap-2">
                         {historyLogs.map((log, i) => (
                           <div key={i} className="flex justify-between items-center text-green-400 border-b border-gray-900 pb-1 last:border-0">
                             <span className="font-bold">→ Consent Given</span>
                             <span className="text-gray-600">Blk #{log.blockNumber.toString()}</span>
                           </div>
                         ))}
                       </div>
                    ) : (
                       <div className="text-center py-4">
                         <p className="text-gray-600 italic">No recent events found.</p>
                         <p className="text-gray-800 text-[10px] mt-1">Target: {recipient.slice(0,8)}...</p>
                       </div>
                    )}
                 </div>
              </div>
            )}

          </div>
        )}

        {/* === MODE B: COMPANY === */}
        {mode === 'COMPANY' && (
          <div className="flex flex-col gap-5 relative z-10 animate-[fadeIn_0.5s_ease-out]">
             <div className="bg-purple-900/20 p-5 rounded-xl border border-purple-500/30">
               <h3 className="text-purple-300 font-bold text-lg">Register Entity</h3>
               <p className="text-xs text-purple-400/70 mt-1">Immutable Name Registration on Sepolia.</p>
             </div>
             
             <div className="space-y-4">
                <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full p-4 bg-black/40 border border-gray-700 rounded-xl text-sm text-white focus:border-purple-500 focus:outline-none transition-colors" placeholder="Company Name (e.g. Gameonix)" />
                <input type="text" value={regUrl} onChange={(e) => setRegUrl(e.target.value)} className="w-full p-4 bg-black/40 border border-gray-700 rounded-xl text-sm text-white focus:border-purple-500 focus:outline-none transition-colors" placeholder="Privacy Policy URL" />
             </div>

             <button onClick={() => registerCompany({ address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: 'registerCompany', args: [regName, regUrl] })} className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-purple-500 hover:to-purple-400 shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all mt-2">
               {isRegPending ? 'Writing to Block...' : 'Register Company 📝'}
             </button>
             {isRegSuccess && <p className="text-center text-green-400 font-bold text-sm animate-pulse">Registration Mined! Switching Modes...</p>}
          </div>
        )}
      </div>

    </div>
  );
}