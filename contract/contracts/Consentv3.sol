// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ConsentV3 {
    
    // 1. The Structure: Holds the status AND the expiration time
    struct ConsentDetails {
        bool isGranted;
        uint256 expiry; // The timestamp when this consent dies
    }

    // Mapping: User -> Company -> Details
    mapping(address => mapping(address => ConsentDetails)) public consents;

    // Events: We log the expiry time so the Frontend can show the countdown
    event ConsentGiven(address indexed user, address indexed company, uint256 expiry, uint256 timestamp);
    event ConsentRevoked(address indexed user, address indexed company, uint256 timestamp);

    // 2. GRANT with Duration
    // _durationSeconds: How many seconds should this last? (e.g. 86400 = 1 day)
    function giveConsent(address _recipient, uint256 _durationSeconds) public {
        uint256 newExpiry = block.timestamp + _durationSeconds;
        
        consents[msg.sender][_recipient] = ConsentDetails({
            isGranted: true,
            expiry: newExpiry
        });

        emit ConsentGiven(msg.sender, _recipient, newExpiry, block.timestamp);
    }

    // 3. REVOKE (Immediate Kill Switch)
    function revokeConsent(address _recipient) public {
        consents[msg.sender][_recipient] = ConsentDetails({
            isGranted: false,
            expiry: 0 // 0 means "Expired in 1970", so it is definitely dead
        });

        emit ConsentRevoked(msg.sender, _recipient, block.timestamp);
    }

    // 4. CHECK (The Time-Bomb Logic)
    function checkConsent(address _user, address _recipient) public view returns (bool) {
        ConsentDetails memory c = consents[_user][_recipient];

        // Check 1: Is the manual switch ON?
        if (!c.isGranted) return false;

        // Check 2: Is the time expired?
        if (block.timestamp > c.expiry) return false;

        return true;
    }
    
    // 5. HELPER: Get the exact expiry date (For the Frontend UI later)
    function getConsentExpiry(address _user, address _recipient) public view returns (uint256) {
        return consents[_user][_recipient].expiry;
    }
}