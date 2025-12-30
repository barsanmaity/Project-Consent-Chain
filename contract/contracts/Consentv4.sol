// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ConsentV4 {
    // --- 1. THE TIME-BOMB LOGIC (V3) ---
    struct Consent {
        bool isGiven;
        uint256 expiryTimestamp;
    }
    mapping(address => mapping(address => Consent)) public consents;

    // --- 2. THE NEW REGISTRY LOGIC (V4) ---
    struct CompanyProfile {
        string name;       // e.g. "Pixel Analytics"
        string privacyUrl; // e.g. "https://pixel.com/privacy"
        bool isRegistered; // Is this a real company?
    }
    // The "Phone Book" (Address -> Profile)
    mapping(address => CompanyProfile) public companyRegistry;

    // --- EVENTS ---
    event ConsentGiven(address indexed user, address indexed recipient, uint256 expiry);
    event ConsentRevoked(address indexed user, address indexed recipient);
    event CompanyRegistered(address indexed company, string name);

    // --- FUNCTION A: REGISTER COMPANY (New!) ---
    // Companies call this to put themselves in the Phone Book
    function registerCompany(string memory _name, string memory _url) public {
        companyRegistry[msg.sender] = CompanyProfile(_name, _url, true);
        emit CompanyRegistered(msg.sender, _name);
    }

    // --- FUNCTION B: GIVE CONSENT (Time-Bomb) ---
    function giveConsent(address _recipient, uint256 _durationSeconds) public {
        uint256 expiry = block.timestamp + _durationSeconds;
        consents[msg.sender][_recipient] = Consent(true, expiry);
        emit ConsentGiven(msg.sender, _recipient, expiry);
    }

    // --- FUNCTION C: REVOKE ---
    function revokeConsent(address _recipient) public {
        delete consents[msg.sender][_recipient];
        emit ConsentRevoked(msg.sender, _recipient);
    }

    // --- FUNCTION D: CHECK STATUS ---
    function checkConsent(address _user, address _recipient) public view returns (bool) {
        Consent memory c = consents[_user][_recipient];
        if (!c.isGiven) return false;
        if (block.timestamp > c.expiryTimestamp) return false; // Time-bomb exploded
        return true;
    }

    // --- FUNCTION E: GET EXPIRY ---
    function getConsentExpiry(address _user, address _recipient) public view returns (uint256) {
        Consent memory c = consents[_user][_recipient];
        if (!c.isGiven) return 0;
        return c.expiryTimestamp;
    }

    // --- FUNCTION F: GET COMPANY DETAILS (New!) ---
    // Use this to read the Billboard
    function getCompanyDetails(address _company) public view returns (string memory, string memory, bool) {
        CompanyProfile memory p = companyRegistry[_company];
        return (p.name, p.privacyUrl, p.isRegistered);
    }
}