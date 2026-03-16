"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDeployedContractInfo } from "../helper";
import { useWagmiEthers } from "../wagmi/useWagmiEthers";
import { FhevmInstance } from "@fhevm-sdk";
import {
    buildParamsFromAbi,
    useFHEDecrypt,
    useFHEEncryption,
    useInMemoryStorage,
} from "@fhevm-sdk";
import { ethers } from "ethers";
import type { Contract } from "~~/utils/helper/contract";
import type { AllowedChainIds } from "~~/utils/helper/networks";
import { useReadContract } from "wagmi";

export const useMagicBidWagmi = (parameters: {
    instance: FhevmInstance | undefined;
    initialMockChains?: Readonly<Record<number, string>>;
}) => {
    const { instance, initialMockChains } = parameters;
    const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();

    const { chainId, isConnected, ethersReadonlyProvider, ethersSigner, accounts } = useWagmiEthers(initialMockChains);
    const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;

    const { data: magicBidInfo } = useDeployedContractInfo({ contractName: "MagicBid", chainId: allowedChainId });

    const [message, setMessage] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    const hasContract = Boolean(magicBidInfo?.address && magicBidInfo?.abi);
    const hasSigner = Boolean(ethersSigner);

    const getContract = (mode: "read" | "write") => {
        if (!hasContract) return undefined;
        const providerOrSigner = mode === "read" ? ethersReadonlyProvider : ethersSigner;
        if (!providerOrSigner) return undefined;
        return new ethers.Contract(
            magicBidInfo!.address,
            magicBidInfo!.abi as any,
            providerOrSigner,
        );
    };

    // Read Auction State
    const auctionResult = useReadContract({
        address: magicBidInfo?.address as `0x${string}`,
        abi: magicBidInfo?.abi as any,
        functionName: "auction",
        query: { enabled: hasContract },
    });

    const auctionState = useMemo(() => {
        if (!auctionResult.data) return undefined;
        const [creator, description, endTime, isClosed, winnerIndex, winningBid] = auctionResult.data as any[];
        return { creator, description, endTime: Number(endTime), isClosed, winnerIndex, winningBid };
    }, [auctionResult.data]);

    const refreshAuction = useCallback(() => auctionResult.refetch(), [auctionResult]);

    // Encryption for Bidding
    const { encryptWith } = useFHEEncryption({ instance, ethersSigner: ethersSigner as any, contractAddress: magicBidInfo?.address });

    // Decryption Requests
    const decryptionRequests = useMemo(() => {
        if (!hasContract || !auctionState?.isClosed) return undefined;
        const requests = [];
        if (auctionState.winnerIndex && auctionState.winnerIndex !== ethers.ZeroHash) {
            requests.push({ handle: auctionState.winnerIndex, contractAddress: magicBidInfo!.address });
        }
        if (auctionState.winningBid && auctionState.winningBid !== ethers.ZeroHash) {
            requests.push({ handle: auctionState.winningBid, contractAddress: magicBidInfo!.address });
        }
        return requests.length > 0 ? requests : undefined;
    }, [hasContract, magicBidInfo?.address, auctionState]);

    const {
        canDecrypt,
        decrypt,
        isDecrypting,
        results,
    } = useFHEDecrypt({
        instance,
        ethersSigner: ethersSigner as any,
        fhevmDecryptionSignatureStorage,
        chainId,
        requests: decryptionRequests as any,
    });

    // Actions
    const createAuction = async (description: string, duration: number) => {
        if (!hasSigner || isProcessing) return;
        setIsProcessing(true);
        setMessage("Creating auction...");
        try {
            const contract = getContract("write");
            const tx = await contract!.createAuction(description, duration);
            await tx.wait();
            setMessage("Auction created!");
            refreshAuction();
        } catch (e) {
            setMessage(`Failed to create auction: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const submitBid = async (amount: number) => {
        if (!hasSigner || !instance || isProcessing) return;
        setIsProcessing(true);
        setMessage(`Encrypting bid of ${amount}...`);
        try {
            const enc = await encryptWith(builder => {
                builder.add32(amount);
            });
            if (!enc) throw new Error("Encryption failed");

            const contract = getContract("write");
            const params = buildParamsFromAbi(enc, magicBidInfo!.abi as any[], "submitBid");
            const tx = await contract!.submitBid(...params);
            setMessage("Submitting bid transaction...");
            await tx.wait();
            setMessage("Bid submitted successfully!");
        } catch (e) {
            setMessage(`Failed to submit bid: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const selectWinner = async () => {
        if (!hasSigner || isProcessing) return;
        setIsProcessing(true);
        setMessage("Selecting winner privately...");
        try {
            const contract = getContract("write");
            const tx = await contract!.selectWinner();
            await tx.wait();
            setMessage("Winner selected! You can now decrypt the results.");
            refreshAuction();
        } catch (e) {
            setMessage(`Failed to select winner: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const getBidderAddress = async (index: number) => {
        if (!hasContract) return undefined;
        const contract = getContract("read");
        return await contract!.getBidderAddress(index);
    };

    return {
        auctionState,
        message,
        isProcessing,
        isDecrypting,
        canDecrypt,
        results,
        actions: {
            createAuction,
            submitBid,
            selectWinner,
            refreshAuction,
            decrypt,
            getBidderAddress
        },
        userAddress: accounts?.[0]
    };
};
