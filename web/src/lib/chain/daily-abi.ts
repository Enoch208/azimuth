export const DAILY_ABI = [
  {
    "type": "receive",
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "DAY",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "DIGS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "FIELD",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "TEMPERATURE_BURNING",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "TEMPERATURE_COLD",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "TEMPERATURE_FOUND",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "TEMPERATURE_FREEZING",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "TEMPERATURE_HOT",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "TEMPERATURE_WARM",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "claimTreasure",
    "inputs": [
      {
        "name": "day",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "signatures",
        "type": "bytes[]",
        "internalType": "bytes[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "dig",
    "inputs": [
      {
        "name": "x",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "y",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "temperatureHandle",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "guessOf",
    "inputs": [
      {
        "name": "day",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "hunter",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "made",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "tileHandle",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "verdictHandle",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "huntInfo",
    "inputs": [
      {
        "name": "day",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "openedAt",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "hunters",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "finders",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "opened",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "revealed",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "openHunt",
    "inputs": [],
    "outputs": [
      {
        "name": "day",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "playerState",
    "inputs": [
      {
        "name": "day",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "hunter",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "digs",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "joined",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "finished",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "foundOn",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "foundHandle",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "playerTrail",
    "inputs": [
      {
        "name": "day",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "hunter",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "xs",
        "type": "uint8[]",
        "internalType": "uint8[]"
      },
      {
        "name": "ys",
        "type": "uint8[]",
        "internalType": "uint8[]"
      },
      {
        "name": "temperatures",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "revealDay",
    "inputs": [
      {
        "name": "day",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "revealTrail",
    "inputs": [
      {
        "name": "day",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "hunter",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "sealGuess",
    "inputs": [
      {
        "name": "tileCiphertext",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "verdictHandle",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "today",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "treasureHandles",
    "inputs": [
      {
        "name": "day",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "xHandle",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "yHandle",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "Dug",
    "inputs": [
      {
        "name": "day",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "hunter",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "x",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "y",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "digNumber",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "temperature",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GuessSealed",
    "inputs": [
      {
        "name": "day",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "hunter",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "verdict",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "HuntOpened",
    "inputs": [
      {
        "name": "day",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "openedAt",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "HuntRevealed",
    "inputs": [
      {
        "name": "day",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "xHandle",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "yHandle",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TreasureFound",
    "inputs": [
      {
        "name": "day",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "hunter",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "digs",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyDug",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AlreadyFinished",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AlreadyGuessed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AlreadyRevealed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CallFailedAfterFeeRefresh",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ClaimAfterMidnight",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DayStillRunning",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DigsNotSpent",
    "inputs": []
  },
  {
    "type": "error",
    "name": "HuntNotOpen",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoDigsLeft",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotYourTreasure",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OffMap",
    "inputs": []
  }
] as const;
