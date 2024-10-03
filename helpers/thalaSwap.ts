import { ThalaswapRouter } from "@thalalabs/router-sdk";

type IThalaSwapQuote = {
  router: ThalaswapRouter;
  fromToken: string;
  toToken: string;
  amountIn: number;
};

export const handleGetThalaQuote = async ({
  router,
  fromToken,
  toToken,
  amountIn,
}: IThalaSwapQuote) => {
  try {
    const route = await router.getRouteGivenExactInput(
      fromToken,
      toToken,
      amountIn
    );

    console.log("Route:", route);
    return route;
  } catch (error) {
    console.log("Error >>>", error);
    return null;
  }
};
