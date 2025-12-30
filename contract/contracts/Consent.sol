// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Consent {

    // 1. This "mapping" is like a giant Excel sheet on the blockchain.
    // It stores: "Did Person A give consent to Company B? -> YES/NO"
    mapping(address => mapping(address => bool)) public consents;

    // 2. These are "Announcements" that go to the outside world.
    event ConsentGiven(address indexed user, address indexed recipient);
    event ConsentRevoked(address indexed user, address indexed recipient);

    // 3. FUNCTION: Give Consent
    // When a user clicks "Give Consent", this runs.
    function giveConsent(address _recipient) public {
        consents[msg.sender][_recipient] = true;
        emit ConsentGiven(msg.sender, _recipient);
    }

    // 4. FUNCTION: Revoke Consent
    // When a user clicks "Revoke", this runs.
    function revokeConsent(address _recipient) public {
        consents[msg.sender][_recipient] = false;
        emit ConsentRevoked(msg.sender, _recipient);
    }

    // 5. FUNCTION: Check Consent
    // Anyone can check if consent exists.
    function checkConsent(address _user, address _recipient) public view returns (bool) {
        return consents[_user][_recipient];
    }
}