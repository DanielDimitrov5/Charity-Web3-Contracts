const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Charity", function () {

    async function deployOneYearLockFixture() {
        const [owner, otherAccount] = await ethers.getSigners();

        const Charity = await ethers.getContractFactory("Charity");
        const contractInstance = await Charity.deploy();

        return { contractInstance, owner, otherAccount };
    }

    describe("Deployment", function () {
        it("should set the right owner", async function () {
            const { contractInstance, owner, contractCreator } = await loadFixture(deployOneYearLockFixture);

            expect(await contractInstance.owner()).to.equal(owner.address);
        });
    });

    describe("Ownership", function () {
        it("should allow the owner to transfer ownership", async function () {
            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

            await contractInstance.transferOwnership(otherAccount.address);

            expect(await contractInstance.owner()).to.equal(otherAccount.address);
        });

        it("should not allow a non-owner to transfer ownership", async function () {
            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

            await expect(contractInstance.connect(otherAccount).transferOwnership(otherAccount.address)).to.be.revertedWith("Only the owner can perform this action.");
        });
    });

    describe("Charities", function () {
        it("should create a charity", async function () {
            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

            await contractInstance.createNewCharityCause("Test Charity", "Test Description", 100, '0x106D801337670aa15bBF286Bd35080f8e3A36EA8');

            expect(await contractInstance.charities(1)).to.have.property('title', 'Test Charity');
            expect(await contractInstance.charities(1)).to.have.property('description', 'Test Description');
        });

        it("should return all charities", async function () {
            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

            await contractInstance.createNewCharityCause("Test Charity1", "Test Description1", 50000, '0x106D801337670aa15bBF286Bd35080f8e3A36EA8');
            await contractInstance.createNewCharityCause("Test Charity2", "Test Description2", 100, '0x106D801337670aa15bBF286Bd35080f8e3A36EA8');

            expect(await contractInstance.getAllCauses()).to.have.lengthOf(2);
        });
    });

    describe("Donations", async function () {
        it("should allow a user to donate to a charity", async function () {
            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

            await contractInstance.createNewCharityCause("Test Charity", "Test Description", 100, '0x106D801337670aa15bBF286Bd35080f8e3A36EA8');
            await contractInstance.connect(otherAccount).donateToCharity(1, { value: 100 });

            expect(await contractInstance.collectedFunds(1)).to.be.equal(100);

            expect(await contractInstance.charityContributors(1, otherAccount.address)).to.be.equal(100);
        });

        it("should trow if the user tries to donate to a charity that does not exist", async function () {
            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

            await expect(contractInstance.connect(otherAccount).donateToCharity(10, { value: 100 })).to.be.revertedWith("Charity should exists!");
        });

        it("should throw if user tries to donate to a charity with fulfilled target", async function () {
            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

            await contractInstance.createNewCharityCause("Test Charity", "Test Description", 100, '0x106D801337670aa15bBF286Bd35080f8e3A36EA8');
            await contractInstance.connect(otherAccount).donateToCharity(1, { value: 105 });

            await expect(contractInstance.connect(otherAccount).donateToCharity(1, { value: 5 })).to.be.revertedWith("Charity target is already fulfilled!");
        });
    });

    describe("suggest new target address", async function () {

        it("should allow the charity creator to suggest a target address change", async function () {
            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

            await contractInstance.createNewCharityCause("Test Charity", "Test Description", 100, owner.address);

            const newAddress = '0x106D801337670aa15bBF286Bd35080f8e3A36EA8';

            await contractInstance.connect(owner).suggestTargetAddressChange(1, newAddress);

            expect(await contractInstance.newAddressProposals(1)).to.be.equal(newAddress);
        });

        it("should emit event when a charity creator suggests a target address change", async function () {
            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

            await contractInstance.createNewCharityCause("Test Charity", "Test Description", 100, owner.address);

            const newAddress = '0x106D801337670aa15bBF286Bd35080f8e3A36EA8';

            await expect(contractInstance.connect(owner).suggestTargetAddressChange(1, newAddress)).to.emit(contractInstance, "ChangeTargetAddress").withArgs(1, newAddress);
        });

        it("should allow only charity creator to suggest target address change", async function () {
            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

            await contractInstance.createNewCharityCause("Test Charity", "Test Description", 100, owner.address);

            await expect(contractInstance.connect(otherAccount).suggestTargetAddressChange(1, '0x106D801337670aa15bBF286Bd35080f8e3A36EA8')).to.be.revertedWith("Only the creater of the charity creater can call this function!");
        });

        it("should throw if the charity struct have property addressChangedOnce set to true", async function () {
            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

            await contractInstance.createNewCharityCause("Test Charity", "Test Description", 100, owner.address);

            await contractInstance.connect(owner).suggestTargetAddressChange(1, '0x106D801337670aa15bBF286Bd35080f8e3A36EA8');

            await contractInstance.connect(owner).changeTargetAddress(1);

            await expect(contractInstance.connect(owner).suggestTargetAddressChange(1, '0x106D801337670aa15bBF286Bd35080f8e3A36EA8')).to.be.revertedWith("Target address already changed once!");
        });

        it("should throw if address already proposed", async function () {
            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

            await contractInstance.createNewCharityCause("Test Charity", "Test Description", 100, owner.address);

            await contractInstance.connect(owner).suggestTargetAddressChange(1, '0x106D801337670aa15bBF286Bd35080f8e3A36EA8');

            await expect(contractInstance.connect(owner).suggestTargetAddressChange(1, '0x106D801337670aa15bBF286Bd35080f8e3A36EA8')).to.be.revertedWith("New target address already proposed!");
        });

        it("should throw if the new address is the same as the current one", async function () {
            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

            await contractInstance.createNewCharityCause("Test Charity", "Test Description", 100, owner.address);

            await expect(contractInstance.connect(owner).suggestTargetAddressChange(1, owner.address)).to.be.revertedWith("The proposed addres cannot be the same as the current one!");
        });

        it("should throw if the new address is the null address", async function () {
            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

            await contractInstance.createNewCharityCause("Test Charity", "Test Description", 100, owner.address);

            await expect(contractInstance.connect(owner).suggestTargetAddressChange(1, '0x0000000000000000000000000000000000000000')).to.be.revertedWith("The proposed addres cannot be the null address!");
        });
    });

    describe("change target address", async function () {

        it("should allow the charity creator to change the target address", async function () {
            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

            await contractInstance.createNewCharityCause("Test Charity", "Test Description", 100, owner.address);

            const newAddress = '0x106D801337670aa15bBF286Bd35080f8e3A36EA8';

            await contractInstance.connect(owner).suggestTargetAddressChange(1, newAddress);

            await contractInstance.connect(owner).changeTargetAddress(1);

            expect(await contractInstance.charities(1)).to.have.property('targetAddress', newAddress);
        });

        it("should set 'addressChangedOnce' property to true", async function () {

            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

            await contractInstance.createNewCharityCause("Test Charity", "Test Description", 100, owner.address);

            const newAddress = '0x106D801337670aa15bBF286Bd35080f8e3A36EA8';

            await contractInstance.connect(owner).suggestTargetAddressChange(1, newAddress);

            await contractInstance.connect(owner).changeTargetAddress(1);

            expect(await contractInstance.charities(1)).to.have.property('addressChangedOnce', true);
        });

        it("should delete address proposal", async function () {

            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

            await contractInstance.createNewCharityCause("Test Charity", "Test Description", 100, owner.address);

            const newAddress = '0x106D801337670aa15bBF286Bd35080f8e3A36EA8';

            await contractInstance.connect(owner).suggestTargetAddressChange(1, newAddress);

            await contractInstance.connect(owner).changeTargetAddress(1);

            expect(await contractInstance.newAddressProposals(1)).to.be.equal('0x0000000000000000000000000000000000000000');
        });

        it("should throw if function isn't called from the charity creator", async function () {
            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

            await contractInstance.createNewCharityCause("Test Charity", "Test Description", 100, owner.address);

            const newAddress = '0x106D801337670aa15bBF286Bd35080f8e3A36EA8';

            await contractInstance.connect(owner).suggestTargetAddressChange(1, newAddress);

            await expect(contractInstance.connect(otherAccount).changeTargetAddress(1)).to.be.revertedWith("Only the creater of the charity creater can call this function!");
        });

        it("should throw if charity don't have a new address proposal", async function () {
            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

            await contractInstance.createNewCharityCause("Test Charity", "Test Description", 100, owner.address);

            await expect(contractInstance.connect(owner).changeTargetAddress(1)).to.be.revertedWith("Only charities with a new target address can call this function!");
        });
    });

    describe("withdraw donated funds from chariry", async function () {

        it("should allow charity contributor to withdrow certain amount of their donation if new target address is proposed", async function () {
            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);
            
            await contractInstance.createNewCharityCause("Test Charity", "Test Description", 100, owner.address);
            
            await contractInstance.connect(otherAccount).donateToCharity(1, { value: 1000000000000000 });
            
            const newAddress = '0x106D801337670aa15bBF286Bd35080f8e3A36EA8';

            //1000000000000000 wei = 1 ether
            //1000000000000000 / 2 = 0.5 ether

            await contractInstance.connect(owner).suggestTargetAddressChange(1, newAddress);

            //get otherAccount balance before withdraw
            const otherAccountBalanceBefore = await ethers.provider.getBalance(otherAccount.address);
            
            await contractInstance.connect(otherAccount).withdrawFundsFromCharity(1, 1000000000000000 / 2);

            expect(await contractInstance.charityContributors(1, otherAccount.address)).to.be.equal(1000000000000000 / 2);
            expect(await contractInstance.collectedFunds(1)).to.be.equal(1000000000000000 / 2);

            //get otherAccount balance after withdraw should be bigger than otherAccountBalanceBefore;
            const otherAccountBalanceAfter = await ethers.provider.getBalance(otherAccount.address);
            expect(otherAccountBalanceAfter).to.be.greaterThan(otherAccountBalanceBefore);
        });

        it("should allow only charity contributor to withdrow if new target address is proposed", async function () {
            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);
            
            await contractInstance.createNewCharityCause("Test Charity", "Test Description", 100, owner.address);
            
            await contractInstance.connect(otherAccount).donateToCharity(1, { value: 1000000000000000 });
            
            const newAddress = '0x106D801337670aa15bBF286Bd35080f8e3A36EA8';

            await contractInstance.connect(owner).suggestTargetAddressChange(1, newAddress);

            await expect(contractInstance.connect(owner).withdrawFundsFromCharity(1, 1000000000000000 / 2)).to.be.revertedWith("Only contributors to this charity can call this function!");
        });

        it("should throw if charity don't have a new address proposal", async function () {
            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);
            
            await contractInstance.createNewCharityCause("Test Charity", "Test Description", 100, owner.address);

            await contractInstance.connect(otherAccount).donateToCharity(1, { value: 1000000000000000 });

            await expect(contractInstance.connect(otherAccount).withdrawFundsFromCharity(1, 1000000000000000)).to.be.revertedWith("Only charities with a new target address can call this function!");
        });
    });

    describe("send donated funds to target address", async function () {
        
        it("should send all collected funds to target address", async function () {

            const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);

            const targetFunds = 1000000000000000;
            
            await contractInstance.createNewCharityCause("Test Charity", "Test Description", targetFunds, owner.address);
            
            await contractInstance.connect(otherAccount).donateToCharity(1, { value: targetFunds });
            
            const targetAddressBalanceBefore = await ethers.provider.getBalance(owner.address);

            await contractInstance.connect(owner).withdrawCallectedFunds(1);

            const targetAddressBalanceAfter = await ethers.provider.getBalance(owner.address);

            expect(targetAddressBalanceAfter).to.be.greaterThan(targetAddressBalanceBefore);
            expect(await contractInstance.collectedFunds(1)).to.be.equal(0);
        });

        it("should throw if charity target is not fulfilled", async function () {
                
                const { contractInstance, owner, otherAccount } = await loadFixture(deployOneYearLockFixture);
    
                const targetFunds = 1000000000000000;
                
                await contractInstance.createNewCharityCause("Test Charity", "Test Description", targetFunds, owner.address);
                
                await contractInstance.connect(otherAccount).donateToCharity(1, { value: targetFunds - 1 }); //1 wei less than target funds
                
                await expect(contractInstance.connect(owner).withdrawCallectedFunds(1)).to.be.revertedWith("Charity target is not fulfilled!");
        });
    });
});
