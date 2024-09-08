import { BrianSDK } from '@brian-ai/sdk';

const brian = new BrianSDK({
  apiKey: process.env.NEXT_PUBLIC_BRIAN_API_KEY as string,
});

export default brian;
