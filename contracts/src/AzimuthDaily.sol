// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {e, ebool, euint256} from "@inco/lightning/src/Lib.sol";

contract AzimuthDaily {
    uint256 public constant FIELD = 11;
    uint8 public constant DIGS = 6;

    // Chebyshev distance banded in steps of two: 0 is the treasure, 5 is the
    // far corner of the map. (distance + 1) / 2 lands on exactly this ladder.
    uint256 public constant TEMPERATURE_FOUND = 0;
    uint256 public constant TEMPERATURE_BURNING = 1;
    uint256 public constant TEMPERATURE_HOT = 2;
    uint256 public constant TEMPERATURE_WARM = 3;
    uint256 public constant TEMPERATURE_COLD = 4;
    uint256 public constant TEMPERATURE_FREEZING = 5;

    uint64 public constant DAY = 1 days;

    struct Hunt {
        euint256 x;
        euint256 y;
        uint64 openedAt;
        uint32 hunters;
        uint32 finders;
        bool opened;
        bool revealed;
    }

    struct Player {
        uint8 digs;
        bool joined;
        bool finished;
        uint8 foundOn;
        ebool found;
    }

    mapping(uint256 => Hunt) private hunts;
    mapping(uint256 => mapping(address => Player)) private players;
    mapping(uint256 => mapping(address => bytes32[])) private trail;
    mapping(uint256 => mapping(address => uint8[])) private trailX;
    mapping(uint256 => mapping(address => uint8[])) private trailY;

    error HuntNotOpen();
    error OffMap();
    error NoDigsLeft();
    error AlreadyFinished();
    error AlreadyDug();
    error NotYourTreasure();
    error DayStillRunning();
    error AlreadyRevealed();

    event HuntOpened(uint256 indexed day, uint64 openedAt);
    event Dug(uint256 indexed day, address indexed hunter, uint8 x, uint8 y, uint8 digNumber, bytes32 temperature);
    event TreasureFound(uint256 indexed day, address indexed hunter, uint8 digs);
    event HuntRevealed(uint256 indexed day, bytes32 xHandle, bytes32 yHandle);

    function today() public view returns (uint256) {
        return block.timestamp / DAY;
    }

    function openHunt() public returns (uint256 day) {
        day = today();
        Hunt storage hunt = hunts[day];
        if (hunt.opened) return day;

        hunt.x = e.randBounded(FIELD);
        hunt.y = e.randBounded(FIELD);
        e.allowThis(hunt.x);
        e.allowThis(hunt.y);
        hunt.openedAt = uint64(block.timestamp);
        hunt.opened = true;

        emit HuntOpened(day, hunt.openedAt);
    }

    function dig(uint8 x, uint8 y) external returns (bytes32 temperatureHandle) {
        uint256 day = openHunt();
        Hunt storage hunt = hunts[day];
        if (x >= FIELD || y >= FIELD) revert OffMap();

        Player storage player = players[day][msg.sender];
        if (player.finished) revert AlreadyFinished();
        if (player.digs >= DIGS) revert NoDigsLeft();

        uint8[] storage xs = trailX[day][msg.sender];
        uint8[] storage ys = trailY[day][msg.sender];
        for (uint256 i = 0; i < xs.length; i++) {
            if (xs[i] == x && ys[i] == y) revert AlreadyDug();
        }

        if (!player.joined) {
            player.joined = true;
            hunt.hunters += 1;
        }
        player.digs += 1;
        xs.push(x);
        ys.push(y);

        euint256 temperature = _temperature(hunt, x, y);
        e.allowThis(temperature);
        e.allow(temperature, msg.sender);

        ebool onIt = e.eq(temperature, TEMPERATURE_FOUND);
        ebool everFound = player.digs == 1 ? onIt : e.or(player.found, onIt);
        e.allowThis(everFound);
        e.allow(everFound, msg.sender);
        player.found = everFound;

        temperatureHandle = euint256.unwrap(temperature);
        trail[day][msg.sender].push(temperatureHandle);

        emit Dug(day, msg.sender, x, y, player.digs, temperatureHandle);
    }

    function claimTreasure(bytes[] calldata signatures) external {
        uint256 day = today();
        Player storage player = players[day][msg.sender];
        if (player.digs == 0) revert HuntNotOpen();
        if (player.finished) revert AlreadyFinished();
        if (!e.verifyDecryption(player.found, true, signatures)) revert NotYourTreasure();

        player.finished = true;
        player.foundOn = player.digs;
        hunts[day].finders += 1;

        emit TreasureFound(day, msg.sender, player.digs);
    }

    // Once the day is over the map is no longer a secret worth keeping: the
    // treasure and every hunter's trail become public so the recap can be read
    // by anyone, including people who never played.
    function revealDay(uint256 day) external {
        if (day >= today()) revert DayStillRunning();
        Hunt storage hunt = hunts[day];
        if (!hunt.opened) revert HuntNotOpen();
        if (hunt.revealed) revert AlreadyRevealed();

        hunt.revealed = true;
        e.reveal(hunt.x);
        e.reveal(hunt.y);

        emit HuntRevealed(day, euint256.unwrap(hunt.x), euint256.unwrap(hunt.y));
    }

    function revealTrail(uint256 day, address hunter) external {
        if (day >= today()) revert DayStillRunning();
        if (!hunts[day].revealed) revert HuntNotOpen();

        bytes32[] storage handles = trail[day][hunter];
        for (uint256 i = 0; i < handles.length; i++) {
            e.reveal(euint256.wrap(handles[i]));
        }
    }

    function _temperature(Hunt storage hunt, uint8 x, uint8 y) private returns (euint256) {
        euint256 dx = e.sub(e.max(hunt.x, uint256(x)), e.min(hunt.x, uint256(x)));
        euint256 dy = e.sub(e.max(hunt.y, uint256(y)), e.min(hunt.y, uint256(y)));
        return e.div(e.add(e.max(dx, dy), 1), 2);
    }

    function huntInfo(uint256 day)
        external
        view
        returns (uint64 openedAt, uint32 hunters, uint32 finders, bool opened, bool revealed)
    {
        Hunt storage hunt = hunts[day];
        return (hunt.openedAt, hunt.hunters, hunt.finders, hunt.opened, hunt.revealed);
    }

    function playerState(uint256 day, address hunter)
        external
        view
        returns (uint8 digs, bool joined, bool finished, uint8 foundOn, bytes32 foundHandle)
    {
        Player storage player = players[day][hunter];
        return (player.digs, player.joined, player.finished, player.foundOn, ebool.unwrap(player.found));
    }

    function playerTrail(uint256 day, address hunter)
        external
        view
        returns (uint8[] memory xs, uint8[] memory ys, bytes32[] memory temperatures)
    {
        return (trailX[day][hunter], trailY[day][hunter], trail[day][hunter]);
    }

    function treasureHandles(uint256 day) external view returns (bytes32 xHandle, bytes32 yHandle) {
        return (euint256.unwrap(hunts[day].x), euint256.unwrap(hunts[day].y));
    }

    receive() external payable {}
}
