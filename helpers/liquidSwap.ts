import { SDK, convertValueToDecimal } from "@pontem/liquidswap-sdk";

type ILiquidSwapProps = {
  sdk: SDK;
  fromToken: string;
  toToken: string;
  amountIn: number;
};

export const handleGetLiquidQuote = async ({
  sdk,
  fromToken,
  toToken,
  amountIn,
}: ILiquidSwapProps) => {
  try {
    // const output = await sdk.Swap.calculateRates({
    //     fromToken: '0x1::aptos_coin::AptosCoin', // full 'from' token address
    //     toToken: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT', // full 'to' token address layerzero USDT
    //     amount: convertValueToDecimal(0.1, 8), // 1 APTOS, or you can use convertValueToDecimal(1, 8)
    //     curveType: 'uncorrelated', // can be 'uncorrelated' or 'stable'
    //     interactiveToken: 'from', // which token is 'base' to calculate other token rate.
    //     version: 0
    // })
    const output = await sdk.Swap.calculateRates({
      fromToken,
      toToken,
      amount: convertValueToDecimal(amountIn, 8),
      curveType: "uncorrelated",
      interactiveToken: "from",
      version: 0,
    });
    console.log(output);
    return output;
  } catch (error) {
    console.log("Error in liquid swap quote", error);
    return null;
  }
};
