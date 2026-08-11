// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

contract AzimuthCallsigns {
    uint256 public constant MIN_LENGTH = 3;
    uint256 public constant MAX_LENGTH = 16;

    mapping(address => bytes32) public callsignOf;
    mapping(bytes32 => address) public holderOf;

    event CallsignSet(address indexed hunter, bytes32 callsign, bytes32 previous);

    error TooShort();
    error TooLong();
    error InvalidCharacter();
    error AlreadyTaken();

    function setCallsign(bytes32 callsign) external {
        uint256 length = _validate(callsign);
        if (length == 0) revert TooShort();

        address currentHolder = holderOf[callsign];
        if (currentHolder != address(0) && currentHolder != msg.sender) revert AlreadyTaken();

        bytes32 previous = callsignOf[msg.sender];
        if (previous != bytes32(0)) delete holderOf[previous];

        callsignOf[msg.sender] = callsign;
        holderOf[callsign] = msg.sender;

        emit CallsignSet(msg.sender, callsign, previous);
    }

    function isAvailable(bytes32 callsign) external view returns (bool) {
        address holder = holderOf[callsign];
        return holder == address(0) || holder == msg.sender;
    }

    function callsignsOf(address[] calldata hunters) external view returns (bytes32[] memory names) {
        names = new bytes32[](hunters.length);
        for (uint256 i = 0; i < hunters.length; i++) {
            names[i] = callsignOf[hunters[i]];
        }
    }

    function _validate(bytes32 callsign) private pure returns (uint256 length) {
        bool ended = false;
        for (uint256 i = 0; i < 32; i++) {
            bytes1 character = callsign[i];

            if (character == 0x00) {
                ended = true;
                continue;
            }
            if (ended) revert InvalidCharacter();

            bool lower = character >= 0x61 && character <= 0x7a;
            bool digit = character >= 0x30 && character <= 0x39;
            bool separator = character == 0x2d || character == 0x5f;
            if (!lower && !digit && !separator) revert InvalidCharacter();

            length++;
        }

        if (length > MAX_LENGTH) revert TooLong();
        if (length < MIN_LENGTH) revert TooShort();
    }
}
