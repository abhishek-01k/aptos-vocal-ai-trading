// Define the type for each argument needed by the feature
type ArgumentDetail = {
  name: string; // Name of the argument
  type: "string" | "number" | "address"; // Type of the argument
  description: string; // Description for the argument prompt
};

// Define the type for each feature's configuration
type FeatureConfig = {
  contractAddress: string; // Contract address for the feature
  arguments: ArgumentDetail[]; // List of arguments the feature needs
  additionalVariables?: Record<string, any>; // Optional additional variables
};

const dexFeatures: Record<string, FeatureConfig> = {
  swap: {
    contractAddress: "0x1234567890abcdef1234567890abcdef12345678",
    arguments: [
      { name: "tokenA", type: "address", description: "Address of Token A" },
      { name: "tokenB", type: "address", description: "Address of Token B" },
      { name: "amount", type: "number", description: "Amount to swap" },
    ],
  },
  swap_and_stake: {
    contractAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
    arguments: [
      { name: "tokenA", type: "address", description: "Address of Token A" },
      { name: "tokenB", type: "address", description: "Address of Token B" },
      {
        name: "amount",
        type: "number",
        description: "Amount to swap and stake",
      },
      {
        name: "stakeDuration",
        type: "number",
        description: "Duration to stake in days",
      },
    ],
    additionalVariables: {
      fee: 0.01, // Example of an additional variable
    },
  },
  deposit: {
    contractAddress: "0x7890abcdef1234567890abcdef1234567890abcd",
    arguments: [
      {
        name: "token",
        type: "address",
        description: "Address of the Token to deposit",
      },
      { name: "amount", type: "number", description: "Amount to deposit" },
    ],
  },
  withdraw: {
    contractAddress: "0xabcdef7890abcdef1234567890abcdef12345678",
    arguments: [
      {
        name: "token",
        type: "address",
        description: "Address of the Token to withdraw",
      },
      { name: "amount", type: "number", description: "Amount to withdraw" },
    ],
    additionalVariables: {
      minAmount: 1, // Example of additional variable like minimum amount
    },
  },
};

function getFeatureConfig(feature: string): FeatureConfig | undefined {
  return dexFeatures[feature];
}
