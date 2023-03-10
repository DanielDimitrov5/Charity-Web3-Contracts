// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

contract Charity {

    address public owner;
    address[] adminUsers;

    constructor() {
        owner = msg.sender;
        adminUsers.push(msg.sender);
    }

    event suggestTargetAddressChangeEvent(uint8, address);
    event donateToCharityEvent(uint8, address, uint256);
    event targetAddressChangedEvent(uint8, address);
    event withdrawFundsFromCharityEvent(uint8, address, uint256);
    event withdrawCallectedFundsEvent(uint8, address, uint256);

    struct CharityCause {
        uint8 id;
        address creator;
        string title;
        uint256 targetFunds;
        uint256 deadline;
        address payable targetAddress;
        bool addressChangedOnce;
    }

    mapping (uint8 => string[]) public descriptions;
    mapping (uint8 => string[]) public imageHashes;

    uint8 counter = 1;

    mapping(uint8 => CharityCause) public charities;
    mapping(uint8 => mapping(address => uint256)) public charityContributors;
    mapping(uint8 => uint256) public collectedFunds;

    mapping(uint8 => address) public newAddressProposals;
    mapping(uint8 => uint256) public timeStampProposedAddress;

    CharityCause[] public causes;

    modifier onlyOwner() {
        require(msg.sender == owner, 
        "Only the owner can perform this action.");
        _;
    }

    modifier onlyCharityCreator(uint8 charityId) {
        address creator = charities[charityId].creator;

        require(
            msg.sender == creator,
            "Only the creater of the charity creater can call this function!"
        );
        _;
    }

    modifier onlyCharityContributors(uint8 charityId) {
        require(
            charityContributors[charityId][msg.sender] > 0,
            "Only contributors to this charity can call this function!"
        );
        _;
    }

    modifier onlyCharityWithNewTargetAddress(uint8 charityNumber) {
        require(
            newAddressProposals[charityNumber] != address(0),
            "Only charities with a new target address can call this function!"
        );
        _;
    }

    modifier charityExists(uint8 charityNumber) {
        require(
            charities[charityNumber].creator != address(0),
            "Charity should exists!"
        );
        _;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        owner = newOwner;
    }

    function createNewCharityCause(
        string memory title,
        string memory description,
        string memory imageHash,
        uint256 targetFunds,
        uint256 deadline,
        address payable targetAddress
    ) public {
        CharityCause memory cause = CharityCause(
            counter,
            msg.sender,
            title,
            targetFunds,
            deadline,
            targetAddress,
            false
        );

        descriptions[counter].push(description);
        imageHashes[counter].push(imageHash);

        charities[counter] = cause;
        causes.push(cause);

        counter++;
    }

    function getAllCauses() public view returns (CharityCause[] memory) {
        return causes;
    }

    function donateToCharity(uint8 charityNumber) public payable charityExists(charityNumber) {
        require(
            !charityFulfiled(charityNumber),
            "Charity target is already fulfilled!"
        );

        charityContributors[charityNumber][msg.sender] += msg.value;
        collectedFunds[charityNumber] += msg.value;

        emit donateToCharityEvent(charityNumber, msg.sender, msg.value);
    }

    function getAccountBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function suggestTargetAddressChange(uint8 charityNumber, address newAddress) public onlyCharityCreator(charityNumber) {
        require(
            charities[charityNumber].addressChangedOnce == false,
            "Target address already changed once!"
        );
        require(
            newAddressProposals[charityNumber] == address(0),
            "New target address already proposed!"
        );
        require(
            newAddress != charities[charityNumber].targetAddress,
            "The proposed addres cannot be the same as the current one!"
        );
        require(
            newAddress != address(0),
            "The proposed addres cannot be the null address!"
        );

        newAddressProposals[charityNumber] = newAddress;
        timeStampProposedAddress[charityNumber] = block.timestamp;

        emit suggestTargetAddressChangeEvent(charityNumber, newAddress);
    }

    function changeTargetAddress(uint8 charityNumber) public
        onlyCharityCreator(charityNumber)
        onlyCharityWithNewTargetAddress(charityNumber)
    {
        //Test values: should 7 days
        require(
            (block.timestamp >=
                30 seconds + timeStampProposedAddress[charityNumber]),
            "30 seconds should pass!"
        );

        charities[charityNumber].addressChangedOnce = true;

        charities[charityNumber].targetAddress = payable(
            newAddressProposals[charityNumber]
        );

        newAddressProposals[charityNumber] = address(0);

        emit targetAddressChangedEvent(
            charityNumber,
            charities[charityNumber].targetAddress
        );
    }

    //Contributor withdraws funds back to his account
    function withdrawFundsFromCharity(uint8 charityNumber, uint256 amount) public
        onlyCharityContributors(charityNumber)
        onlyCharityWithNewTargetAddress(charityNumber)
    {
        //Apply SafeMath

        charityContributors[charityNumber][msg.sender] -= amount;
        collectedFunds[charityNumber] -= amount;
        
        payable(msg.sender).transfer(amount);

        emit withdrawFundsFromCharityEvent(charityNumber, msg.sender, amount);
    }

    //Charity creator sends the callected funds to the charity address
    function withdrawCallectedFunds(uint8 charityNumber) public onlyCharityCreator(charityNumber) {
        require(
            charityFulfiled(charityNumber),
            "Charity target is not fulfilled!"
        );

        payable(charities[charityNumber].targetAddress).transfer(
            collectedFunds[charityNumber]
        );

        emit withdrawCallectedFundsEvent(
            charityNumber,
            charities[charityNumber].targetAddress,
            collectedFunds[charityNumber]
        );

        collectedFunds[charityNumber] = 0;
    }

    function charityFulfiled(uint8 charityNumber) public view returns (bool fulfilled) {
        fulfilled = collectedFunds[charityNumber] >= charities[charityNumber].targetFunds;
    }
}
