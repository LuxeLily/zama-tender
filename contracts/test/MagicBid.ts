import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { MagicBid, MagicBid__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
    deployer: HardhatEthersSigner;
    alice: HardhatEthersSigner;
    bob: HardhatEthersSigner;
    charlie: HardhatEthersSigner;
};

async function deployFixture() {
    const factory = (await ethers.getContractFactory("MagicBid")) as MagicBid__factory;
    const magicBidContract = (await factory.deploy()) as MagicBid;
    const magicBidAddress = await magicBidContract.getAddress();

    return { magicBidContract, magicBidAddress };
}

describe("MagicBid", function () {
    let signers: Signers;
    let magicBidContract: MagicBid;
    let magicBidAddress: string;

    before(async function () {
        const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
        signers = {
            deployer: ethSigners[0],
            alice: ethSigners[1],
            bob: ethSigners[2],
            charlie: ethSigners[3]
        };
    });

    beforeEach(async function () {
        if (!fhevm.isMock) {
            console.warn(`This test suite is designed for the local mock/dev environment.`);
            this.skip();
        }

        ({ magicBidContract, magicBidAddress } = await deployFixture());
    });

    it("should determine the winner index privately", async function () {
        // 1. Create auction
        await magicBidContract.connect(signers.deployer).createAuction("Paint shop", 3600);

        // 2. Submit bids: Alice (Index 0, Amount 100), Bob (Index 1, Amount 50), Charlie (Index 2, Amount 150)
        const bids = [
            { signer: signers.alice, amount: 100 },
            { signer: signers.bob, amount: 50 },
            { signer: signers.charlie, amount: 150 }
        ];

        for (const bid of bids) {
            const input = await fhevm.createEncryptedInput(magicBidAddress, bid.signer.address)
                .add32(bid.amount)
                .encrypt();

            await magicBidContract.connect(bid.signer).submitBid(
                input.handles[0],
                input.inputProof
            );
        }

        // 3. Advance time
        await ethers.provider.send("evm_increaseTime", [3601]);
        await ethers.provider.send("evm_mine", []);

        // 4. Select winner (private)
        await expect(magicBidContract.connect(signers.deployer).selectWinner())
            .to.emit(magicBidContract, "WinnerRevealed");

        // 5. Verify auction is closed
        const auction = await magicBidContract.auction();
        expect(auction.isClosed).to.be.true;

        // 6. Decrypt winner index (Owner only)
        const winnerIndexHandle = await magicBidContract.getWinnerIndex();
        const clearWinnerIndex = await fhevm.userDecryptEuint(
            FhevmType.euint32,
            winnerIndexHandle,
            magicBidAddress,
            signers.deployer
        );

        expect(clearWinnerIndex).to.equal(1); // Bob's index in _bidderAddresses

        // 7. Resolve winner address using cleartext index
        const winnerAddress = await magicBidContract.getBidderAddress(Number(clearWinnerIndex));
        expect(winnerAddress).to.equal(signers.bob.address);

        // 8. Decrypt winning bid
        const winningBidHandle = await magicBidContract.getWinningBid();
        const clearWinningBid = await fhevm.userDecryptEuint(
            FhevmType.euint32,
            winningBidHandle,
            magicBidAddress,
            signers.deployer
        );

        expect(clearWinningBid).to.equal(50);
    });
});
