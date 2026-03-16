"use client";

import { useState, useMemo, useEffect } from "react";
import { useFhevm } from "@fhevm-sdk";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useMagicBidWagmi, AuctionState } from "~~/hooks/zama-tender/useMagicBidWagmi";
import { useWagmiEthers } from "~~/hooks/wagmi/useWagmiEthers";
import { ethers } from "ethers";

export const MagicBidDemo = () => {
    const { isConnected, chain, address } = useAccount();
    const chainId = chain?.id;

    const initialMockChains = { 31337: "http://localhost:8545" };
    const { ethersProvider, eip1193Provider } = useWagmiEthers(initialMockChains);

    const provider = useMemo(() => {
        if (typeof window === "undefined" || !isConnected) return undefined;
        return eip1193Provider || (window as any).ethereum;
    }, [isConnected, eip1193Provider]);

    const { instance, sdkLoading } = useFhevm({
        provider,
        chainId,
        initialMockChains,
        enabled: true,
    });

    const magicBid = useMagicBidWagmi({ instance, initialMockChains });

    // State for forms
    const [projDesc, setProjDesc] = useState("Build a New Community Center");
    const [projDuration, setProjDuration] = useState(300); // 5 mins
    const [bidAmount, setBidAmount] = useState(50000);
    const [revealedWinner, setRevealedWinner] = useState<string | undefined>(undefined);

    // Styling
    const cardClass = "relative bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-10 mb-10 border border-gray-100 rounded-[2.5rem] transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]";
    const titleClass = "text-3xl font-[900] text-gray-900 mb-2 tracking-tight";
    const subtitleClass = "text-gray-500 mb-8 font-medium italic";
    const inputClass = "w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-purple-400 focus:bg-white focus:outline-none transition-all font-black text-gray-900 text-lg";
    const buttonClass = "w-full py-5 px-8 rounded-2xl font-black text-xl transition-all active:scale-95 disabled:opacity-30 disabled:active:scale-100 cursor-pointer";
    const ownerButton = `${buttonClass} bg-purple-600 text-white hover:bg-purple-700 shadow-xl shadow-purple-100 border-b-4 border-purple-800`;
    const bidderButton = `${buttonClass} bg-amber-500 text-white hover:bg-amber-600 shadow-xl shadow-amber-100 border-b-4 border-amber-700`;

    // Derived State
    const isOwner = address && magicBid.auctionState?.creator && address.toLowerCase() === magicBid.auctionState.creator.toLowerCase();
    const isAuctionActive = magicBid.auctionState && !magicBid.auctionState.isClosed && magicBid.auctionState.endTime > Date.now() / 1000;
    const isRevealReady = magicBid.auctionState?.isClosed && magicBid.results;

    // Handle Reveal Winner Address
    useEffect(() => {
        if (magicBid.results && magicBid.auctionState?.winnerIndex) {
            const index = magicBid.results[magicBid.auctionState.winnerIndex];
            if (typeof index !== "undefined") {
                magicBid.actions.getBidderAddress(Number(index)).then(setRevealedWinner);
            }
        }
    }, [magicBid.results, magicBid.auctionState?.winnerIndex]);

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
                <div className="text-8xl mb-8 animate-pulse text-purple-600">🗳️</div>
                <h2 className="text-6xl font-[1000] text-gray-900 mb-6 leading-tight">Magic Bid:<br />Sealed Tenders.</h2>
                <p className="text-2xl text-gray-500 mb-12 max-w-2xl font-medium">Fair competition through Cryptography. No one can see your bid until the magic reveal.</p>
                <RainbowKitCustomConnectButton />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-16 px-6">
            <header className="text-center mb-16">
                <div className="inline-block px-4 py-1.5 rounded-full bg-purple-100 text-purple-700 font-black text-sm uppercase tracking-widest mb-6">
                    Zama FHEVM Privacy
                </div>
                <h1 className="text-7xl font-[1000] text-gray-900 mb-6 tracking-tighter">Magic Bid</h1>
                <p className="text-2xl text-gray-500 font-medium max-w-3xl mx-auto leading-relaxed">
                    Compare offers privately. The lowest bid wins without ever revealing the losers' secrets.
                </p>
            </header>

            {/* 1. Project Owner Panel */}
            <section className={cardClass}>
                <div className="absolute -top-6 -left-6 w-16 h-16 bg-purple-600 text-white rounded-3xl flex items-center justify-center text-3xl font-[1000] shadow-xl rotate-[-10deg]">⚖️</div>
                <h2 className={titleClass}>Auctioneer Dashboard</h2>
                <p className={subtitleClass}>"Start a project and find the best offer secretly."</p>

                {!magicBid.auctionState || magicBid.auctionState.endTime === 0 ? (
                    <div className="bg-purple-50 p-8 rounded-[2rem] border border-purple-100">
                        <h3 className="text-xl font-black text-purple-900 mb-6">Create New Tender</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-black text-purple-400 uppercase mb-2 ml-2">Project Description</label>
                                <input placeholder="e.g. Paint the Office" value={projDesc} onChange={(e) => setProjDesc(e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-purple-400 uppercase mb-2 ml-2">Duration (Seconds)</label>
                                <input type="number" value={projDuration} onChange={(e) => setProjDuration(+e.target.value)} className={inputClass} />
                            </div>
                        </div>
                        <button
                            onClick={() => magicBid.actions.createAuction(projDesc, projDuration)}
                            className={ownerButton}
                            disabled={magicBid.isProcessing}
                        >
                            {magicBid.isProcessing ? "🚀 Launching..." : "Launch Magic Tender"}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="bg-gray-50 p-8 rounded-[2.5rem] border-2 border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-xs font-black text-gray-400 uppercase block mb-1">Current Project</span>
                                    <h4 className="text-2xl font-black text-gray-900">{magicBid.auctionState.description}</h4>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-black text-gray-400 uppercase block mb-1">Status</span>
                                    <span className={`px-4 py-1 rounded-full font-black text-sm uppercase ${isAuctionActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                        {magicBid.auctionState.isClosed ? "CLOSED" : (isAuctionActive ? "ACTIVE" : "EXPIRED")}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {isOwner && !magicBid.auctionState.isClosed && (
                            <div className="p-8 bg-amber-50 rounded-[2rem] border border-amber-200">
                                <h3 className="text-xl font-black text-amber-900 mb-2">Finalize Results</h3>
                                <p className="text-amber-700 mb-6 font-medium">Wait for the deadline, then trigger the private winner selection.</p>
                                <button
                                    onClick={() => magicBid.actions.selectWinner()}
                                    className={`${buttonClass} bg-amber-600 text-white hover:bg-amber-700 border-b-4 border-amber-800`}
                                    disabled={magicBid.isProcessing || isAuctionActive}
                                >
                                    {magicBid.isProcessing ? "🔮 Finding Lowest Bid..." : (isAuctionActive ? "Bidding in Progress..." : "Select Winner Privately")}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* 2. Bidder Panel */}
            <section className={cardClass}>
                <div className="absolute -top-6 -left-6 w-16 h-16 bg-amber-500 text-white rounded-3xl flex items-center justify-center text-3xl font-[1000] shadow-xl rotate-[5deg]">💰</div>
                <h2 className={titleClass}>Bidder Workspace</h2>
                <p className={subtitleClass}>"Submit your secret bid. Competitors see nothing."</p>

                {isAuctionActive ? (
                    <div className="bg-amber-50 p-10 rounded-[2.5rem] border-2 border-amber-100">
                        <div className="mb-8">
                            <label className="block text-xs font-black text-amber-600 uppercase mb-3 ml-2">My Confidential Offer (USD)</label>
                            <input type="number" value={bidAmount} onChange={(e) => setBidAmount(+e.target.value)} className={inputClass.replace("purple", "amber")} />
                        </div>
                        <button
                            onClick={() => magicBid.actions.submitBid(bidAmount)}
                            className={bidderButton}
                            disabled={magicBid.isProcessing}
                        >
                            {magicBid.isProcessing ? "🔐 Sealing Bid..." : "Submit Magic Bid"}
                        </button>
                    </div>
                ) : (
                    <div className="p-10 text-center bg-gray-50 rounded-[2.5rem] border-2 border-gray-100 text-gray-400 font-black text-xl italic">
                        {magicBid.auctionState?.isClosed ? "Bidding Period has Closed." : "No Auction Active."}
                    </div>
                )}
            </section>

            {/* 3. Reveal Results (Visible Only if closed) */}
            {magicBid.auctionState?.isClosed && (
                <section className={`${cardClass} border-green-200 bg-green-50/30`}>
                    <div className="absolute -top-6 -left-6 w-16 h-16 bg-green-500 text-white rounded-3xl flex items-center justify-center text-3xl font-[1000] shadow-xl">🏆</div>
                    <h2 className={titleClass}>Auction Results</h2>
                    <p className={subtitleClass}>"The cryptographic verdict is in."</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-100 text-center shadow-sm">
                            <span className="block text-xs font-black text-gray-400 uppercase mb-2">Winning Bid (Secret)</span>
                            <div className="text-5xl font-[1000] text-gray-900 mb-6 tracking-tighter">
                                {magicBid.results?.[magicBid.auctionState.winningBid] ?? "••••••"} <span className="text-xl text-gray-300">USD</span>
                            </div>
                            <span className="block text-xs font-black text-gray-400 uppercase mb-2">Winner Address</span>
                            <div className="text-lg font-black text-purple-600 break-all bg-purple-50 p-3 rounded-xl border border-purple-100 mb-8 max-w-full overflow-hidden text-ellipsis">
                                {revealedWinner ?? "••••••••••••••••••••••••••••••"}
                            </div>

                            <button
                                onClick={magicBid.actions.decrypt}
                                className={`${buttonClass} bg-green-600 text-white hover:bg-green-700 border-b-4 border-green-800`}
                                disabled={!magicBid.canDecrypt || magicBid.isDecrypting}
                            >
                                {magicBid.isDecrypting ? "🔓 Decrypting..." : "Reveal Magic Winner"}
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-6 bg-white rounded-2xl border border-gray-100 flex gap-4 shadow-sm items-center">
                                <div className="text-2xl">🪄</div>
                                <div className="text-sm font-medium text-gray-600 leading-relaxed">
                                    The contract compared all bids **privately**. Even the auctioneer didn't know the amounts until this reveal step.
                                </div>
                            </div>
                            <div className="p-6 bg-white rounded-2xl border border-gray-100 flex gap-4 shadow-sm items-center">
                                <div className="text-2xl">🚫</div>
                                <div className="text-sm font-medium text-gray-600 leading-relaxed">
                                    Losing bids were **NEVER** decrypted. Their business strategy remains a secret forever.
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Status Notifications */}
            {magicBid.message && (
                <div className="fixed bottom-12 right-12 bg-gray-900 text-white p-6 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.3)] font-black text-lg border-2 border-purple-400 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-10 z-50">
                    <span className="text-2xl animate-spin text-purple-400">⚡</span>
                    {magicBid.message}
                </div>
            )}
        </div>
    );
};
