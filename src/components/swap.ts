import { SwapSDK, Chains, Assets } from '@chainflip/sdk/swap';

import { getDefaultProvider, Wallet } from 'ethers';

export default async function performSwap() {

  const swapSDK = new SwapSDK({
    network: 'perseverance',
    signer: new Wallet(
      "pvt-key",
      getDefaultProvider('sepolia'),
    ),
  });

  try {
    // Fetch quote for swap
    const quote = await swapSDK.getQuote({
      srcChain: Chains.Ethereum,
      srcAsset: Assets.ETH,
      destChain: Chains.Bitcoin,
      destAsset: Assets.BTC,
      amount: (0.01e18).toString(), // 0.01 ETH
    });
    console.log('quote', quote);

    // Initiate swap via Vault contract
    const transactionHash = await swapSDK.executeSwap({
      srcChain: Chains.Ethereum,
      srcAsset: Assets.ETH,
      destChain: Chains.Bitcoin,
      destAsset: Assets.BTC,
      amount: (0.01e18).toString(), // 0.01 ETH
      destAddress: '',
    });
    console.log('transaction', transactionHash);

    // Fetch swap status
    const status = await swapSDK.getStatus({
      id: transactionHash,
    });
    console.log('status', status);
  } catch (error) {
    console.error('An error occurred:', error);
  }
}