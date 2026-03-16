// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract MagicBid is ZamaEthereumConfig, Ownable {
    struct Bid {
        address bidder;
        euint32 encryptedAmount;
        bool hasBid;
    }

    struct Auction {
        address creator;
        string description;
        uint256 endTime;
        bool isClosed;
        euint32 winnerIndex; // Encrypted index of the winner
        euint32 winningBid;  // Encrypted winning amount
    }

    mapping(address => Bid) private _bids;
    address[] private _bidderAddresses;
    
    Auction public auction;

    event AuctionCreated(string description, uint256 endTime);
    event BidSubmitted(address indexed bidder);
    event WinnerRevealed(); // We don't reveal the address in the event for privacy

    constructor() Ownable(msg.sender) {}

    function createAuction(string calldata description, uint256 durationInSeconds) external onlyOwner {
        auction.creator = msg.sender;
        auction.description = description;
        auction.endTime = block.timestamp + durationInSeconds;
        auction.isClosed = false;
        
        // Reset previous bids
        for (uint i = 0; i < _bidderAddresses.length; i++) {
            delete _bids[_bidderAddresses[i]];
        }
        delete _bidderAddresses;

        emit AuctionCreated(description, auction.endTime);
    }

    function submitBid(externalEuint32 encryptedAmount, bytes calldata proof) external {
        require(block.timestamp < auction.endTime, "Auction has ended");
        require(!auction.isClosed, "Auction is closed");

        euint32 bidAmount = FHE.fromExternal(encryptedAmount, proof);
        
        if (!_bids[msg.sender].hasBid) {
            _bids[msg.sender].hasBid = true;
            _bidderAddresses.push(msg.sender);
        }
        
        _bids[msg.sender].bidder = msg.sender;
        _bids[msg.sender].encryptedAmount = bidAmount;

        FHE.allowThis(_bids[msg.sender].encryptedAmount);
        
        emit BidSubmitted(msg.sender);
    }

    function selectWinner() external onlyOwner {
        require(block.timestamp >= auction.endTime, "Auction has not ended yet");
        require(!auction.isClosed, "Winner already selected");
        require(_bidderAddresses.length > 0, "No bids submitted");

        // Initialize with the first bid
        euint32 minBid = _bids[_bidderAddresses[0]].encryptedAmount;
        euint32 winnerIdx = FHE.asEuint32(0);

        // Iterate through other bids
        for (uint32 i = 1; i < uint32(_bidderAddresses.length); i++) {
            euint32 nextBid = _bids[_bidderAddresses[i]].encryptedAmount;

            // if nextBid < minBid then minBid = nextBid, winnerIdx = i
            ebool isLower = FHE.lt(nextBid, minBid);
            
            minBid = FHE.select(isLower, nextBid, minBid);
            winnerIdx = FHE.select(isLower, FHE.asEuint32(i), winnerIdx);
        }

        auction.isClosed = true;
        auction.winnerIndex = winnerIdx;
        auction.winningBid = minBid;
        
        // Allow the contract and the owner to use these handles
        FHE.allowThis(auction.winningBid);
        FHE.allow(auction.winningBid, auction.creator);
        
        FHE.allowThis(auction.winnerIndex);
        FHE.allow(auction.winnerIndex, auction.creator);

        emit WinnerRevealed();
    }

    /// @notice Get the encrypted winning bid handle
    function getWinningBid() external view returns (euint32) {
        require(auction.isClosed, "Auction not closed");
        return auction.winningBid;
    }

    /// @notice Get the encrypted winner index handle
    function getWinnerIndex() external view returns (euint32) {
        require(auction.isClosed, "Auction not closed");
        return auction.winnerIndex;
    }

    /// @notice Get the bidder address by index (Publicly accessible but requires knowing the cleartext index)
    function getBidderAddress(uint32 index) external view returns (address) {
        require(index < _bidderAddresses.length, "Invalid index");
        return _bidderAddresses[index];
    }
}
