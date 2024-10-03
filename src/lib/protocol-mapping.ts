export const protocolMappings = {
  "Cellar Finance": [
    {
      functionName: "swap_route_entry_both_coins",
      pseudofunctionName: "Swap",
      functionFullPath:
        "0x4bf51972879e3b95c4781a5cdcb9e1ee24ef483e7d22f2d903626f126df62bd1::router::swap_route_entry_both_coins",
      typeArgs: [
        "0x1::aptos_coin::AptosCoin",
        "0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::amapt_token::AmnisApt",
      ],
      args: [
        "100000000", // Amount in base units
        "99399089", // Amount received after swap
        ["0xe31e39d83acc719369ec42999e855ed3f178627ed8dd413b7d1669da385778e2"], // Routes or paths
        ["true"], // Boolean flag for swap success
        "0xbcb1d332e909fdf195a00a21e4b7e2d8a6a79c4142210c8f97419e3ae47ad8b7", // User's wallet address
      ],
    },
    {
      functionName: "add_liquidity_and_stake_both_coins_entry",
      pseudofunctionName: "Add Liquidity",
      functionFullPath:
        "0x4bf51972879e3b95c4781a5cdcb9e1ee24ef483e7d22f2d903626f126df62bd1::router::add_liquidity_and_stake_both_coins_entry",
      typeArgs: [
        "0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::amapt_token::AmnisApt",
        "0x1::aptos_coin::AptosCoin",
      ],
      args: [
        "true", // Stake both coins
        "100000", // First coin amount
        "76945", // Second coin amount
      ],
    },
  ],
  "Another Protocol": [
    {
      functionName: "liquidity_provide_entry",
      functionFullPath:
        "0x9f8d44abc79e3b95c4781a5cdcb9e1ee24ef438c7f2d2f303667df62bd1::router::liquidity_provide_entry",
      typeArgs: [
        "0x1::aptos_coin::AptosCoin",
        "0x2::example_token::ExampleToken",
      ],
      args: [
        "200000000", // Amount of AptosCoin
        "150000000", // Amount of ExampleToken
        "0xdeadbeef", // Wallet address for staking
      ],
    },
  ],
};

export const TokensList = {
  USDC: {
    name: "USDC",
    address:
      "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC",
    decimals: 6,
  },
  USDT: {
    name: "USDT",
    address:
      "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT",
    decimals: 6,
  },
  WETH: {
    name: "WETH",
    address:
      "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::WETH",
    decimals: 6,
  },
};
